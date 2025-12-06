import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { ScanRunModel } from "../persistence/scanRun.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface MaintenancePrediction {
  imageName: string;
  currentRiskScore: number;
  predictedRiskScore: number; // 30 gün sonra
  daysUntilCritical: number | null; // Kritik seviyeye ne kadar süre kaldı
  recommendedUpdateDate: Date;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  estimatedRiskReduction: number; // Güncelleme sonrası risk azalması
}

export interface MaintenanceSchedule {
  imageName: string;
  currentState: {
    riskScore: number;
    riskLevel: string;
    lastUpdated: Date | null;
  };
  prediction: MaintenancePrediction;
  recommendedActions: string[];
}

export class PredictiveMaintenanceService {
  private predictionModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Predictive maintenance modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Predictive maintenance modeli eğitiliyor...");

      // Historical data'dan trend öğren
      const trainingData = await this.prepareTrainingData(clusterId);

      if (trainingData.features.length < 10) {
        logger.warn("Eğitim için yeterli veri yok");
        this.isModelTrained = false;
        return;
      }

      this.predictionModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [trainingData.features[0].length],
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
            activation: "linear", // Future risk score prediction
          }),
        ],
      });

      this.predictionModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "meanSquaredError",
        metrics: ["meanAbsoluteError"],
      });

      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1]);

      await this.predictionModel.fit(xs, ys, {
        epochs: 40,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Predictive maintenance modeli eğitimi tamamlandı");
    } catch (error) {
      logger.error("Model eğitimi sırasında hata:", error);
      this.isModelTrained = false;
    }
  }

  /**
   * Training data hazırlar
   */
  private async prepareTrainingData(clusterId?: string): Promise<{
    features: number[][];
    labels: number[];
  }> {
    const features: number[][] = [];
    const labels: number[] = [];

    // Son 50 scan run'ı al
    const scanRuns = await ScanRunModel.find({
      status: "COMPLETED",
      ...(clusterId && { "images.clusterId": clusterId }),
    })
      .sort({ startedAt: -1 })
      .limit(50)
      .exec();

    // Her image için time series data oluştur
    const imageHistory = new Map<string, Array<{ date: Date; score: number }>>();

    for (const scanRun of scanRuns) {
      for (const imageEntry of scanRun.images) {
        if (!imageHistory.has(imageEntry.imageName)) {
          imageHistory.set(imageEntry.imageName, []);
        }
        imageHistory.get(imageEntry.imageName)!.push({
          date: scanRun.startedAt,
          score: imageEntry.riskScore,
        });
      }
    }

    // Feature ve label oluştur
    for (const [imageName, history] of imageHistory.entries()) {
      if (history.length < 2) continue;

      // Sırala (en eski en başta)
      history.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Her nokta için: önceki değerlerden sonraki değeri tahmin et
      for (let i = 1; i < history.length; i++) {
        const current = history[i];
        const previous = history[i - 1];

        // Feature: önceki risk skoru, gün farkı, trend
        const daysDiff = (current.date.getTime() - previous.date.getTime()) / (1000 * 60 * 60 * 24);
        const trend = current.score - previous.score;

        features.push([
          previous.score / 100, // Normalize
          daysDiff / 365, // Normalize (max 1 year)
          trend / 100, // Normalize
          current.score / 100, // Current score (for context)
        ]);

        // Label: gelecekteki risk skoru (30 gün sonra tahmin)
        // Basit linear extrapolation (gerçek kullanımda ML model kullanılır)
        const futureScore = current.score + (trend * (30 / daysDiff));
        labels.push(Math.max(0, Math.min(100, futureScore)) / 100);
      }
    }

    return { features, labels };
  }

  /**
   * Image için maintenance prediction yapar
   */
  async predictMaintenance(
    image: ImageRiskDocument
  ): Promise<MaintenancePrediction> {
    // Historical trend analizi
    const history = await this.getImageHistory(image.imageName, image.clusterId);
    const trend = this.analyzeTrend(history);

    // Risk skoru tahmini (30 gün sonra)
    let predictedRiskScore = image.riskScore;
    if (trend.rate > 0) {
      predictedRiskScore = Math.min(100, image.riskScore + (trend.rate * 30));
    }

    // Kritik seviyeye ne kadar süre kaldı
    let daysUntilCritical: number | null = null;
    if (trend.rate > 0 && image.riskScore < 75) {
      const pointsToCritical = 75 - image.riskScore;
      daysUntilCritical = Math.ceil(pointsToCritical / trend.rate);
    }

    // Önerilen güncelleme tarihi
    const recommendedUpdateDate = this.calculateRecommendedUpdateDate(
      image,
      trend,
      daysUntilCritical
    );

    // Urgency
    const urgency = this.determineUrgency(
      image.riskScore,
      predictedRiskScore,
      daysUntilCritical
    );

    // Reasons
    const reasons = this.generateReasons(image, trend, predictedRiskScore);

    // Estimated risk reduction
    const estimatedRiskReduction = this.estimateRiskReduction(image, trend);

    return {
      imageName: image.imageName,
      currentRiskScore: image.riskScore,
      predictedRiskScore: Math.round(predictedRiskScore),
      daysUntilCritical,
      recommendedUpdateDate,
      urgency,
      reasons,
      estimatedRiskReduction,
    };
  }

  /**
   * Image history alır
   */
  private async getImageHistory(
    imageName: string,
    clusterId?: string
  ): Promise<Array<{ date: Date; score: number }>> {
    const scanRuns = await ScanRunModel.find({
      status: "COMPLETED",
      "images.imageName": imageName,
    })
      .sort({ startedAt: -1 })
      .limit(20)
      .exec();

    const history: Array<{ date: Date; score: number }> = [];

    for (const scanRun of scanRuns) {
      const imageEntry = scanRun.images.find(img => img.imageName === imageName);
      if (imageEntry) {
        history.push({
          date: scanRun.startedAt,
          score: imageEntry.riskScore,
        });
      }
    }

    return history.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Trend analizi yapar
   */
  private analyzeTrend(history: Array<{ date: Date; score: number }>): {
    rate: number; // Günlük risk artış/azalış oranı
    direction: "INCREASING" | "STABLE" | "DECREASING";
    confidence: number;
  } {
    if (history.length < 2) {
      return { rate: 0, direction: "STABLE", confidence: 0 };
    }

    // Linear regression (basit)
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    history.forEach((point, idx) => {
      const daysSinceFirst = (point.date.getTime() - history[0].date.getTime()) / (1000 * 60 * 60 * 24);
      sumX += daysSinceFirst;
      sumY += point.score;
      sumXY += daysSinceFirst * point.score;
      sumX2 += daysSinceFirst * daysSinceFirst;
    });

    const n = history.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const dailyRate = slope; // Günlük değişim

    let direction: "INCREASING" | "STABLE" | "DECREASING";
    if (dailyRate > 0.1) direction = "INCREASING";
    else if (dailyRate < -0.1) direction = "DECREASING";
    else direction = "STABLE";

    const confidence = Math.min(1.0, history.length / 10);

    return { rate: dailyRate, direction, confidence };
  }

  /**
   * Önerilen güncelleme tarihi hesaplar
   */
  private calculateRecommendedUpdateDate(
    image: ImageRiskDocument,
    trend: { rate: number; direction: string },
    daysUntilCritical: number | null
  ): Date {
    const now = new Date();
    
    if (daysUntilCritical && daysUntilCritical < 30) {
      // Kritik seviyeye yakınsa, hemen güncelle
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 gün sonra
    }

    if (trend.direction === "INCREASING" && trend.rate > 0.5) {
      // Hızlı artıyorsa, yakın zamanda güncelle
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 gün sonra
    }

    if (image.riskScore > 60) {
      // Yüksek risk, 30 gün içinde güncelle
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    // Normal durum, 90 gün içinde güncelle
    return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  }

  /**
   * Urgency belirler
   */
  private determineUrgency(
    currentScore: number,
    predictedScore: number,
    daysUntilCritical: number | null
  ): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
    if (daysUntilCritical && daysUntilCritical < 7) return "CRITICAL";
    if (currentScore >= 75 || predictedScore >= 80) return "CRITICAL";
    if (currentScore >= 60 || predictedScore >= 70) return "HIGH";
    if (currentScore >= 40 || predictedScore >= 50) return "MEDIUM";
    return "LOW";
  }

  /**
   * Reasons oluşturur
   */
  private generateReasons(
    image: ImageRiskDocument,
    trend: { rate: number; direction: string },
    predictedScore: number
  ): string[] {
    const reasons: string[] = [];

    if (trend.direction === "INCREASING") {
      reasons.push(`Risk skoru artıyor (günlük +${trend.rate.toFixed(2)} puan)`);
    }

    if (predictedScore > image.riskScore + 10) {
      reasons.push(`30 gün içinde risk skoru ${predictedScore.toFixed(0)}'a çıkacak`);
    }

    if (image.riskFactors.length > 5) {
      reasons.push(`${image.riskFactors.length} risk faktörü mevcut`);
    }

    if (image.riskScore >= 60) {
      reasons.push("Yüksek risk seviyesi");
    }

    return reasons;
  }

  /**
   * Risk azalması tahmini
   */
  private estimateRiskReduction(
    image: ImageRiskDocument,
    trend: { rate: number; direction: string }
  ): number {
    let reduction = 0;

    // Risk faktörlerine göre azalma
    if (image.riskFactors.includes("Uses latest tag")) reduction += 40;
    if (image.riskFactors.includes("Uses root user")) reduction += 30;
    if (image.riskFactors.includes("Legacy image tag")) reduction += 20;
    if (image.riskFactors.includes("Uses non-production tag")) reduction += 15;

    // Trend'e göre ek azalma
    if (trend.direction === "INCREASING") {
      reduction += 10; // Artan trend'i durdurmak için ekstra azalma
    }

    return Math.min(60, reduction); // Max 60 puan azalma
  }

  /**
   * Toplu maintenance schedule oluşturur
   */
  async generateMaintenanceSchedule(
    clusterId?: string,
    limit: number = 50
  ): Promise<MaintenanceSchedule[]> {
    const images = await ImageRiskModel.find({
      ...(clusterId && { clusterId }),
    })
      .sort({ riskScore: -1 })
      .limit(limit)
      .exec();

    const schedules: MaintenanceSchedule[] = [];

    for (const image of images) {
      try {
        const prediction = await this.predictMaintenance(image);

        // Last updated date (basit hesaplama)
        const lastUpdated = image.lastScannedAt;

        const recommendedActions: string[] = [];
        if (prediction.urgency === "CRITICAL") {
          recommendedActions.push("Acil güncelleme gerekli");
        }
        if (image.riskFactors.includes("Uses latest tag")) {
          recommendedActions.push("Versioned tag'e geç");
        }
        if (image.riskFactors.includes("Uses root user")) {
          recommendedActions.push("Non-root user kullan");
        }
        if (prediction.daysUntilCritical && prediction.daysUntilCritical < 30) {
          recommendedActions.push(`${prediction.daysUntilCritical} gün içinde kritik seviyeye ulaşacak`);
        }

        schedules.push({
          imageName: image.imageName,
          currentState: {
            riskScore: image.riskScore,
            riskLevel: image.riskLevel,
            lastUpdated: lastUpdated || null,
          },
          prediction,
          recommendedActions,
        });
      } catch (error) {
        logger.error(`Maintenance prediction hatası (${image.imageName}):`, error);
      }
    }

    return schedules.sort((a, b) => {
      // Urgency'ye göre sırala
      const urgencyOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return urgencyOrder[b.prediction.urgency] - urgencyOrder[a.prediction.urgency];
    });
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.predictionModel !== null;
  }
}

