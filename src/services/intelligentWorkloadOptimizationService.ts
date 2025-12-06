import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface WorkloadOptimization {
  imageName: string;
  currentState: {
    podCount: number;
    namespaceCount: number;
    resourceUsage: {
      cpu: number; // Estimated CPU usage
      memory: number; // Estimated memory usage (GB)
    };
  };
  optimization: {
    recommendedPodCount: number;
    recommendedNamespaces: string[];
    resourceOptimization: {
      cpuReduction: number; // % reduction
      memoryReduction: number; // % reduction
      costSavings: number; // $ per month
    };
    riskOptimization: {
      recommendedImages: string[];
      riskReduction: number;
    };
  };
  recommendations: string[];
  estimatedSavings: {
    monthly: number; // $
    annual: number; // $
  };
}

export interface ClusterOptimization {
  clusterId: string;
  overallOptimization: {
    totalCostSavings: number; // $ per month
    riskReduction: number;
    resourceEfficiency: number; // 0-100
  };
  imageOptimizations: WorkloadOptimization[];
  topOpportunities: Array<{
    imageName: string;
    savings: number;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }>;
}

export class IntelligentWorkloadOptimizationService {
  private optimizationModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Optimization modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Intelligent workload optimization modeli eğitiliyor...");

      const images = await ImageRiskModel.find({
        ...(clusterId && { clusterId }),
      }).exec();

      if (images.length < 10) {
        logger.warn("Eğitim için yeterli veri yok");
        this.isModelTrained = false;
        return;
      }

      // Feature ve label oluştur
      const features: number[][] = [];
      const labels: number[] = [];

      images.forEach(img => {
        const featureVector = this.extractOptimizationFeatures(img);
        features.push(featureVector);

        // Optimal pod count label (basit hesaplama)
        const optimalPods = Math.max(1, Math.floor(img.pods.length * 0.8)); // 20% reduction
        labels.push(optimalPods / 20); // Normalize
      });

      this.optimizationModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [features[0].length],
            units: 32,
            activation: "relu",
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 16,
            activation: "relu",
          }),
          tf.layers.dense({
            units: 1,
            activation: "sigmoid",
          }),
        ],
      });

      this.optimizationModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "meanSquaredError",
        metrics: ["meanAbsoluteError"],
      });

      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels, [labels.length, 1]);

      await this.optimizationModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Intelligent workload optimization modeli eğitimi tamamlandı");
    } catch (error) {
      logger.error("Model eğitimi sırasında hata:", error);
      this.isModelTrained = false;
    }
  }

  /**
   * Optimization features çıkarır
   */
  private extractOptimizationFeatures(image: ImageRiskDocument): number[] {
    const uniqueNamespaces = new Set(image.pods.map(p => p.namespace)).size;

    return [
      image.riskScore / 100,
      Math.min(image.pods.length / 20, 1),
      Math.min(uniqueNamespaces / 10, 1),
      image.riskLevel === "CRITICAL" ? 1 : 0,
      image.riskLevel === "HIGH" ? 1 : 0,
      image.riskFactors.length / 8,
      image.riskFactors.includes("Uses latest tag") ? 1 : 0,
      image.riskFactors.includes("Uses root user") ? 1 : 0,
    ];
  }

  /**
   * Workload optimization hesaplar
   */
  async optimizeWorkload(
    image: ImageRiskDocument
  ): Promise<WorkloadOptimization> {
    // Current state
    const uniqueNamespaces = new Set(image.pods.map(p => p.namespace));
    const currentState = {
      podCount: image.pods.length,
      namespaceCount: uniqueNamespaces.size,
      resourceUsage: {
        cpu: image.pods.length * 0.5, // Estimated 0.5 CPU per pod
        memory: image.pods.length * 0.5, // Estimated 0.5 GB per pod
      },
    };

    // Recommended pod count (AI-based veya rule-based)
    let recommendedPodCount = image.pods.length;
    if (this.isModelTrained && this.optimizationModel) {
      try {
        const features = this.extractOptimizationFeatures(image);
        const featuresTensor = tf.tensor2d([features]);
        const prediction = this.optimizationModel.predict(featuresTensor) as tf.Tensor;
        const optimalRatio = (await prediction.data())[0];
        prediction.dispose();
        featuresTensor.dispose();
        recommendedPodCount = Math.max(1, Math.round(image.pods.length * optimalRatio));
      } catch (error) {
        logger.error("Optimization prediction hatası:", error);
        recommendedPodCount = Math.max(1, Math.round(image.pods.length * 0.8)); // 20% reduction
      }
    } else {
      // Rule-based: risk yüksekse pod sayısını azalt
      if (image.riskScore > 70) {
        recommendedPodCount = Math.max(1, Math.round(image.pods.length * 0.7));
      } else if (image.riskScore > 50) {
        recommendedPodCount = Math.max(1, Math.round(image.pods.length * 0.85));
      }
    }

    // Resource optimization
    const podReduction = image.pods.length - recommendedPodCount;
    const resourceOptimization = {
      cpuReduction: podReduction > 0 ? (podReduction / image.pods.length) * 100 : 0,
      memoryReduction: podReduction > 0 ? (podReduction / image.pods.length) * 100 : 0,
      costSavings: podReduction * 10, // $10 per pod per month
    };

    // Risk optimization
    const riskOptimization = {
      recommendedImages: this.recommendAlternativeImages(image),
      riskReduction: image.riskScore > 50 ? 20 : 10,
    };

    // Recommendations
    const recommendations = this.generateOptimizationRecommendations(
      image,
      recommendedPodCount,
      resourceOptimization
    );

    // Estimated savings
    const estimatedSavings = {
      monthly: resourceOptimization.costSavings,
      annual: resourceOptimization.costSavings * 12,
    };

    return {
      imageName: image.imageName,
      currentState,
      optimization: {
        recommendedPodCount,
        recommendedNamespaces: Array.from(uniqueNamespaces),
        resourceOptimization,
        riskOptimization,
      },
      recommendations,
      estimatedSavings,
    };
  }

  /**
   * Alternative images önerir
   */
  private recommendAlternativeImages(image: ImageRiskDocument): string[] {
    const recommendations: string[] = [];

    if (image.riskFactors.includes("Uses latest tag")) {
      const baseName = image.imageName.split(":")[0];
      recommendations.push(`${baseName}:v1.0.0`);
      recommendations.push(`${baseName}:stable`);
    }

    if (image.riskFactors.includes("Uses root user")) {
      recommendations.push("Non-root user image kullanın");
    }

    return recommendations;
  }

  /**
   * Optimization recommendations oluşturur
   */
  private generateOptimizationRecommendations(
    image: ImageRiskDocument,
    recommendedPodCount: number,
    resourceOptimization: WorkloadOptimization["optimization"]["resourceOptimization"]
  ): string[] {
    const recommendations: string[] = [];

    if (recommendedPodCount < image.pods.length) {
      recommendations.push(
        `Pod sayısını ${image.pods.length}'den ${recommendedPodCount}'e düşürmek ${resourceOptimization.costSavings.toFixed(0)}$/ay tasarruf sağlar`
      );
    }

    if (image.riskScore > 60) {
      recommendations.push("Yüksek risk, image güncellemesi önerilir");
    }

    if (image.riskFactors.includes("Uses latest tag")) {
      recommendations.push("Versioned tag'e geçerek stabilite artırılabilir");
    }

    return recommendations;
  }

  /**
   * Cluster optimization
   */
  async optimizeCluster(clusterId: string): Promise<ClusterOptimization> {
    const images = await ImageRiskModel.find({ clusterId }).exec();

    const imageOptimizations = await Promise.all(
      images.slice(0, 50).map(img => this.optimizeWorkload(img))
    );

    const totalCostSavings = imageOptimizations.reduce(
      (sum, opt) => sum + opt.estimatedSavings.monthly,
      0
    );

    const avgRiskReduction = imageOptimizations.reduce(
      (sum, opt) => sum + opt.optimization.riskOptimization.riskReduction,
      0
    ) / imageOptimizations.length;

    const resourceEfficiency = this.calculateResourceEfficiency(imageOptimizations);

    // Top opportunities
    const topOpportunities = imageOptimizations
      .filter(opt => opt.estimatedSavings.monthly > 0)
      .map(opt => ({
        imageName: opt.imageName,
        savings: opt.estimatedSavings.monthly,
        priority: opt.estimatedSavings.monthly > 100 ? "HIGH" :
          opt.estimatedSavings.monthly > 50 ? "MEDIUM" : "LOW",
      }))
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 10);

    return {
      clusterId,
      overallOptimization: {
        totalCostSavings: Math.round(totalCostSavings),
        riskReduction: Math.round(avgRiskReduction),
        resourceEfficiency: Math.round(resourceEfficiency),
      },
      imageOptimizations,
      topOpportunities,
    };
  }

  /**
   * Resource efficiency hesaplar
   */
  private calculateResourceEfficiency(
    optimizations: WorkloadOptimization[]
  ): number {
    const totalReduction = optimizations.reduce(
      (sum, opt) => sum + opt.optimization.resourceOptimization.cpuReduction,
      0
    );
    return Math.min(100, (totalReduction / optimizations.length) * 2);
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.optimizationModel !== null;
  }
}

