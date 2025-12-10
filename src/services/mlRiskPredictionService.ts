import * as tf from "@tensorflow/tfjs-node";
import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { ScanRunModel } from "../persistence/scanRun.model";
import { logger } from "../utils/logger";

export interface RiskPrediction {
  predictedRiskScore: number;
  predictedRiskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number; // 0-1 arası güven skoru
  factors: {
    name: string;
    impact: number; // Bu faktörün risk skoruna etkisi
  }[];
  trend: "INCREASING" | "STABLE" | "DECREASING";
  predictionDate: Date;
}

export interface TrainingData {
  features: number[][]; // Her image için feature vector
  labels: number[]; // Risk skorları
}

export class MLRiskPredictionService {
  private model: tf.Sequential | null = null;
  private isModelTrained: boolean = false;
  private readonly modelPath = "./models/risk-prediction-model";

  /**
   * Historical data'dan ML modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("ML model eğitimi başlatılıyor...");

      // Historical data'yı çek
      const trainingData = await this.prepareTrainingData(clusterId);

      if (trainingData.features.length < 10) {
        logger.warn("Eğitim için yeterli veri yok (minimum 10 örnek gerekli)");
        this.isModelTrained = false;
        return;
      }

      // Model oluştur
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [trainingData.features[0].length],
            units: 64,
            activation: "relu",
            kernelRegularizer: tf.regularizers?.l2({ l2: 0.01 }),
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
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
            activation: "linear", // Regression için linear
          }),
        ],
      });

      // Model compile et
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: "meanSquaredError",
        metrics: ["meanAbsoluteError"],
      });

      // Feature ve label tensörlerini oluştur
      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1]);

      // Model eğit
      await this.model.fit(xs, ys, {
        epochs: 50,
        batchSize: Math.min(32, Math.floor(trainingData.features.length / 2)),
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              logger.info(
                `Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, mae = ${logs?.meanAbsoluteError?.toFixed(4)}`
              );
            }
          },
        },
      });

      // Memory temizle
      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("ML model eğitimi tamamlandı");
    } catch (error) {
      logger.error("ML model eğitimi sırasında hata:", error);
      this.isModelTrained = false;
      throw error;
    }
  }

  /**
   * Historical data'dan training data hazırlar
   */
  private async prepareTrainingData(clusterId?: string): Promise<TrainingData> {
    const features: number[][] = [];
    const labels: number[] = [];

    // Son 100 scan run'ı çek
    const scanRuns = await ScanRunModel.find({
      status: "COMPLETED",
      ...(clusterId && { "images.clusterId": clusterId }),
    })
      .sort({ startedAt: -1 })
      .limit(100)
      .exec();

    // Her scan run'daki image'ler için feature vector oluştur
    for (const scanRun of scanRuns) {
      for (const imageEntry of scanRun.images) {
        // Image'in detaylarını çek
        const image = await ImageRiskModel.findOne({
          imageName: imageEntry.imageName,
          ...(clusterId && { clusterId }),
        }).exec();

        if (image) {
          const featureVector = this.extractFeatures(image);
          features.push(featureVector);
          labels.push(imageEntry.riskScore);
        }
      }
    }

    return { features, labels };
  }

  /**
   * Image'den feature vector çıkarır
   */
  private extractFeatures(image: ImageRiskDocument): number[] {
    const features: number[] = [];

    // Risk faktörleri (one-hot encoding benzeri)
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
    features.push(Math.min(image.pods.length / 10, 1)); // Max 10 pod = 1.0

    // Image yaşı (gün cinsinden, normalize edilmiş)
    const daysSinceScan = Math.floor(
      (Date.now() - image.lastScannedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    features.push(Math.min(daysSinceScan / 365, 1)); // Max 1 yıl = 1.0

    // Risk level encoding
    const riskLevelMap = { LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, CRITICAL: 1.0 };
    features.push(riskLevelMap[image.riskLevel] || 0);

    // Namespace sayısı (normalize edilmiş)
    const uniqueNamespaces = new Set(image.pods.map((p) => p.namespace)).size;
    features.push(Math.min(uniqueNamespaces / 5, 1)); // Max 5 namespace = 1.0

    return features;
  }

  /**
   * Image için risk tahmini yapar
   */
  async predictRisk(
    image: ImageRiskDocument
  ): Promise<RiskPrediction> {
    // Model eğitilmemişse, basit hesaplama yap
    if (!this.isModelTrained || !this.model) {
      logger.warn("ML model eğitilmemiş, basit tahmin yapılıyor");
      return this.simplePrediction(image);
    }

    try {
      // Feature vector çıkar
      const featureVector = this.extractFeatures(image);
      const featuresTensor = tf.tensor2d([featureVector]);

      // Tahmin yap
      const prediction = this.model.predict(featuresTensor) as tf.Tensor;
      const predictedScore = (await prediction.data())[0];
      prediction.dispose();
      featuresTensor.dispose();

      // Risk level belirle
      const predictedRiskLevel = this.scoreToRiskLevel(predictedScore);

      // Trend analizi (historical data'dan)
      const trend = await this.analyzeTrend(image.imageName, image.clusterId);

      // Confidence hesapla (basit bir yaklaşım)
      const confidence = this.calculateConfidence(image, predictedScore);

      // Faktör etkilerini hesapla
      const factors = this.calculateFactorImpacts(image, featureVector);

      return {
        predictedRiskScore: Math.max(0, Math.min(100, predictedScore)),
        predictedRiskLevel,
        confidence,
        factors,
        trend,
        predictionDate: new Date(),
      };
    } catch (error) {
      logger.error("Risk tahmini sırasında hata:", error);
      return this.simplePrediction(image);
    }
  }

  /**
   * Model eğitilmemişse basit tahmin yapar
   */
  private simplePrediction(image: ImageRiskDocument): RiskPrediction {
    // Mevcut risk skorunu baz al, küçük bir varyasyon ekle
    const baseScore = image.riskScore;
    const predictedScore = baseScore + (Math.random() - 0.5) * 10; // ±5 puan varyasyon

    return {
      predictedRiskScore: Math.max(0, Math.min(100, predictedScore)),
      predictedRiskLevel: this.scoreToRiskLevel(predictedScore),
      confidence: 0.6, // Düşük güven (model eğitilmemiş)
      factors: image.riskFactors.map((factor) => ({
        name: factor,
        impact: 10, // Varsayılan etki
      })),
      trend: "STABLE",
      predictionDate: new Date(),
    };
  }

  /**
   * Historical data'dan trend analizi yapar
   */
  private async analyzeTrend(
    imageName: string,
    clusterId?: string
  ): Promise<"INCREASING" | "STABLE" | "DECREASING"> {
    const recentScans = await ScanRunModel.find({
      status: "COMPLETED",
      "images.imageName": imageName,
    })
      .sort({ startedAt: -1 })
      .limit(5)
      .exec();

    if (recentScans.length < 2) {
      return "STABLE";
    }

    const scores: number[] = [];
    for (const scan of recentScans) {
      const imageEntry = scan.images.find((img) => img.imageName === imageName);
      if (imageEntry) {
        scores.push(imageEntry.riskScore);
      }
    }

    if (scores.length < 2) {
      return "STABLE";
    }

    // Basit trend analizi
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 5) {
      return "INCREASING";
    } else if (diff < -5) {
      return "DECREASING";
    } else {
      return "STABLE";
    }
  }

  /**
   * Güven skoru hesaplar
   */
  private calculateConfidence(
    image: ImageRiskDocument,
    predictedScore: number
  ): number {
    // Mevcut skor ile tahmin arasındaki fark
    const scoreDiff = Math.abs(image.riskScore - predictedScore);

    // Fark küçükse güven yüksek
    let confidence = 1.0 - Math.min(scoreDiff / 50, 0.5);

    // Historical data varsa güven artar
    if (image.pods.length > 0) {
      confidence += 0.1;
    }

    return Math.max(0.5, Math.min(1.0, confidence));
  }

  /**
   * Risk faktörlerinin etkisini hesaplar
   */
  private calculateFactorImpacts(
    image: ImageRiskDocument,
    featureVector: number[]
  ): { name: string; impact: number }[] {
    const impacts: { name: string; impact: number }[] = [];

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

    riskFactorFlags.forEach((factor, index) => {
      if (image.riskFactors.includes(factor)) {
        // Feature vector'daki değere göre etki hesapla
        const featureValue = featureVector[index] || 0;
        impacts.push({
          name: factor,
          impact: featureValue * 20, // Normalize edilmiş etki
        });
      }
    });

    return impacts;
  }

  /**
   * Birden fazla image için toplu risk tahmini yapar
   */
  async bulkPredictRisk(images: ImageRiskDocument[]): Promise<RiskPrediction[]> {
    const predictions: RiskPrediction[] = [];
    
    for (const image of images) {
      const prediction = await this.predictRisk(image);
      predictions.push(prediction);
    }
    
    return predictions;
  }

  /**
   * Risk skorunu risk level'a çevirir
   */
  private scoreToRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (score >= 75) return "CRITICAL";
    if (score >= 50) return "HIGH";
    if (score >= 25) return "MEDIUM";
    return "LOW";
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.model !== null;
  }

  /**
   * Model'i yükler (eğer kaydedilmişse)
   */
  async loadModel(): Promise<void> {
    // Model yükleme implementasyonu (opsiyonel)
    // Şimdilik sadece eğitim yapılıyor
  }

  /**
   * Model'i kaydeder
   */
  async saveModel(): Promise<void> {
    // Model kaydetme implementasyonu (opsiyonel)
    // Şimdilik sadece memory'de tutuluyor
  }
}

