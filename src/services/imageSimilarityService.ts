import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface ImageCluster {
  clusterId: number;
  images: ImageRiskDocument[];
  centroid: number[]; // Feature vector
  avgRiskScore: number;
  commonRiskFactors: string[];
  size: number;
}

export interface SimilarImage {
  image: ImageRiskDocument;
  similarity: number; // 0-1 arası
  sharedRiskFactors: string[];
  riskScoreDiff: number;
}

export class ImageSimilarityService {
  private clusteringModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Clustering modelini eğitir
   */
  async trainClusteringModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Image similarity clustering modeli eğitiliyor...");

      const images = await ImageRiskModel.find({
        ...(clusterId && { clusterId }),
      }).exec();

      if (images.length < 5) {
        logger.warn("Clustering için yeterli image yok (minimum 5 gerekli)");
        this.isModelTrained = false;
        return;
      }

      // Feature vectors oluştur
      const features = images.map(img => this.extractFeatures(img));

      // K-means benzeri clustering (basit versiyon)
      this.isModelTrained = true;
      logger.info("Image similarity clustering modeli hazır");
    } catch (error) {
      logger.error("Clustering model eğitimi sırasında hata:", error);
      this.isModelTrained = false;
    }
  }

  /**
   * Image'lerden feature vector çıkarır
   */
  private extractFeatures(image: ImageRiskDocument): number[] {
    const features: number[] = [];

    // Risk skoru (normalize edilmiş)
    features.push(image.riskScore / 100);

    // Risk level encoding
    const riskLevelMap = { LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, CRITICAL: 1.0 };
    features.push(riskLevelMap[image.riskLevel] || 0);

    // Risk faktörleri (one-hot encoding)
    const riskFactorFlags = [
      "Uses latest tag",
      "Uses root user",
      "Uses non-production tag",
      "Test image used in workload",
      "Running in production namespace",
      "Legacy image tag",
      "Image older than 180 days",
      "Uses unknown base image",
    ];

    riskFactorFlags.forEach((factor) => {
      features.push(image.riskFactors.includes(factor) ? 1 : 0);
    });

    // Pod sayısı (normalize edilmiş)
    features.push(Math.min(image.pods.length / 20, 1));

    // Namespace sayısı (normalize edilmiş)
    const uniqueNamespaces = new Set(image.pods.map((p) => p.namespace)).size;
    features.push(Math.min(uniqueNamespaces / 10, 1));

    // Image repository (basit hash)
    const repoHash = this.hashString(image.imageName.split(":")[0]) % 100 / 100;
    features.push(repoHash);

    return features;
  }

  /**
   * String hash fonksiyonu
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Image'leri cluster'lara ayırır (K-means benzeri)
   */
  async clusterImages(
    k: number = 5,
    clusterId?: string
  ): Promise<ImageCluster[]> {
    const images = await ImageRiskModel.find({
      ...(clusterId && { clusterId }),
    }).exec();

    if (images.length < k) {
      logger.warn(`Clustering için yeterli image yok (${images.length} < ${k})`);
      return [];
    }

    // Feature vectors
    const features = images.map(img => this.extractFeatures(img));
    const featureSize = features[0].length;

    // K-means clustering (basit versiyon)
    const clusters: ImageCluster[] = [];
    const centroids: number[][] = [];

    // Random initial centroids
    for (let i = 0; i < k; i++) {
      const randomIdx = Math.floor(Math.random() * features.length);
      centroids.push([...features[randomIdx]]);
    }

    // Iterate until convergence
    let iterations = 0;
    let changed = true;
    let assignments: number[] = new Array(images.length).fill(-1);

    while (changed && iterations < 50) {
      changed = false;
      assignments = new Array(images.length).fill(-1);
      const clusterImages: ImageRiskDocument[][] = Array(k).fill(null).map(() => []);

      // Assign each image to nearest centroid
      for (let i = 0; i < images.length; i++) {
        let minDist = Infinity;
        let nearestCluster = 0;

        for (let j = 0; j < k; j++) {
          const dist = this.euclideanDistance(features[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            nearestCluster = j;
          }
        }

        if (assignments[i] !== nearestCluster) {
          changed = true;
        }
        assignments[i] = nearestCluster;
        clusterImages[nearestCluster].push(images[i]);
      }

      // Update centroids
      for (let j = 0; j < k; j++) {
        if (clusterImages[j].length > 0) {
          const newCentroid = Array(featureSize).fill(0);
          clusterImages[j].forEach((img, idx) => {
            const imgFeatures = features[images.indexOf(img)];
            for (let d = 0; d < featureSize; d++) {
              newCentroid[d] += imgFeatures[d];
            }
          });
          for (let d = 0; d < featureSize; d++) {
            newCentroid[d] /= clusterImages[j].length;
          }
          centroids[j] = newCentroid;
        }
      }

      iterations++;
    }

    // Create cluster objects
    for (let j = 0; j < k; j++) {
      const clusterImgs = images.filter((_, idx) => assignments[idx] === j);
      
      if (clusterImgs.length > 0) {
        const avgRiskScore = clusterImgs.reduce((sum, img) => sum + img.riskScore, 0) / clusterImgs.length;
        
        // Common risk factors
        const allFactors = clusterImgs.flatMap(img => img.riskFactors);
        const factorCounts = new Map<string, number>();
        allFactors.forEach(factor => {
          factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
        });
        const commonRiskFactors = Array.from(factorCounts.entries())
          .filter(([_, count]) => count >= clusterImgs.length * 0.5)
          .map(([factor, _]) => factor);

        clusters.push({
          clusterId: j,
          images: clusterImgs,
          centroid: centroids[j],
          avgRiskScore,
          commonRiskFactors,
          size: clusterImgs.length,
        });
      }
    }

    return clusters.sort((a, b) => b.avgRiskScore - a.avgRiskScore);
  }

  /**
   * Euclidean distance hesaplar
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Benzer image'leri bulur
   */
  async findSimilarImages(
    imageName: string,
    limit: number = 10,
    clusterId?: string
  ): Promise<SimilarImage[]> {
    const targetImage = await ImageRiskModel.findOne({
      imageName,
      ...(clusterId && { clusterId }),
    }).exec();

    if (!targetImage) {
      return [];
    }

    const allImages = await ImageRiskModel.find({
      imageName: { $ne: imageName },
      ...(clusterId && { clusterId }),
    }).exec();

    const targetFeatures = this.extractFeatures(targetImage);
    const similarities: SimilarImage[] = [];

    for (const image of allImages) {
      const imageFeatures = this.extractFeatures(image);
      const similarity = this.calculateSimilarity(targetFeatures, imageFeatures);
      
      // Shared risk factors
      const sharedFactors = targetImage.riskFactors.filter(f => 
        image.riskFactors.includes(f)
      );

      // Risk score difference
      const riskScoreDiff = Math.abs(targetImage.riskScore - image.riskScore);

      similarities.push({
        image,
        similarity,
        sharedRiskFactors: sharedFactors,
        riskScoreDiff,
      });
    }

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, limit);
  }

  /**
   * Cosine similarity hesaplar
   */
  private calculateSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained;
  }
}

