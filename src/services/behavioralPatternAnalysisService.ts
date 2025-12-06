import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { ScanRunModel } from "../persistence/scanRun.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface BehavioralPattern {
  imageName: string;
  patternType: "STABLE" | "VOLATILE" | "TRENDING_UP" | "TRENDING_DOWN" | "SEASONAL" | "ANOMALOUS";
  characteristics: {
    riskScoreVolatility: number; // 0-1, 1 = very volatile
    updateFrequency: number; // Günlük ortalama update sayısı
    riskTrend: "INCREASING" | "STABLE" | "DECREASING";
    usagePattern: "GROWING" | "STABLE" | "DECLINING";
    peakHours: number[]; // Hangi saatlerde en çok kullanılıyor
  };
  predictions: {
    nextRiskScore: number;
    nextUpdateDate: Date;
    expectedUsage: number; // Pod sayısı tahmini
  };
  insights: string[];
  confidence: number;
}

export interface ClusterBehavior {
  clusterId: string;
  overallPattern: "HEALTHY" | "DETERIORATING" | "IMPROVING" | "VOLATILE";
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  commonPatterns: string[];
  recommendations: string[];
}

export class BehavioralPatternAnalysisService {
  private patternModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Behavioral pattern modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Behavioral pattern analysis modeli eğitiliyor...");

      // Historical scan data'dan pattern öğren
      const trainingData = await this.prepareTrainingData(clusterId);

      if (trainingData.features.length < 10) {
        logger.warn("Eğitim için yeterli veri yok");
        this.isModelTrained = false;
        return;
      }

      this.patternModel = tf.sequential({
        layers: [
          tf.layers.lstm({
            inputShape: [trainingData.sequenceLength, trainingData.featureSize],
            units: 32,
            returnSequences: false,
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 16,
            activation: "relu",
          }),
          tf.layers.dense({
            units: 4, // Pattern types
            activation: "softmax",
          }),
        ],
      });

      this.patternModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "categoricalCrossentropy",
        metrics: ["accuracy"],
      });

      // Simplified training (gerçek kullanımda sequence data gerekir)
      this.isModelTrained = true;
      logger.info("Behavioral pattern analysis modeli hazır");
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
    labels: number[][];
    sequenceLength: number;
    featureSize: number;
  }> {
    // Simplified - gerçek kullanımda time-series sequence data gerekir
    return {
      features: [],
      labels: [],
      sequenceLength: 10,
      featureSize: 8,
    };
  }

  /**
   * Image için behavioral pattern analizi yapar
   */
  async analyzeBehavior(
    image: ImageRiskDocument,
    clusterId?: string
  ): Promise<BehavioralPattern> {
    // Historical data al
    const history = await this.getImageHistory(image.imageName, clusterId);

    // Pattern type belirle
    const patternType = this.determinePatternType(history);

    // Characteristics hesapla
    const characteristics = this.calculateCharacteristics(image, history);

    // Predictions
    const predictions = this.generatePredictions(image, history);

    // Insights
    const insights = this.generateInsights(image, history, patternType);

    // Confidence
    const confidence = this.calculateConfidence(history.length);

    return {
      imageName: image.imageName,
      patternType,
      characteristics,
      predictions,
      insights,
      confidence,
    };
  }

  /**
   * Image history alır
   */
  private async getImageHistory(
    imageName: string,
    clusterId?: string
  ): Promise<Array<{ date: Date; riskScore: number; podCount: number }>> {
    const scanRuns = await ScanRunModel.find({
      status: "COMPLETED",
      "images.imageName": imageName,
    })
      .sort({ startedAt: -1 })
      .limit(30)
      .exec();

    const history: Array<{ date: Date; riskScore: number; podCount: number }> = [];

    for (const scanRun of scanRuns) {
      const imageEntry = scanRun.images.find(img => img.imageName === imageName);
      if (imageEntry) {
        const image = await ImageRiskModel.findOne({
          imageName,
          ...(clusterId && { clusterId }),
        }).exec();

        history.push({
          date: scanRun.startedAt,
          riskScore: imageEntry.riskScore,
          podCount: image?.pods.length || 0,
        });
      }
    }

    return history.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Pattern type belirler
   */
  private determinePatternType(
    history: Array<{ date: Date; riskScore: number; podCount: number }>
  ): "STABLE" | "VOLATILE" | "TRENDING_UP" | "TRENDING_DOWN" | "SEASONAL" | "ANOMALOUS" {
    if (history.length < 3) return "STABLE";

    const scores = history.map(h => h.riskScore);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Volatile
    if (stdDev > 15) return "VOLATILE";

    // Trend analysis
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 10) return "TRENDING_UP";
    if (diff < -10) return "TRENDING_DOWN";

    // Stable
    if (stdDev < 5) return "STABLE";

    return "ANOMALOUS";
  }

  /**
   * Characteristics hesaplar
   */
  private calculateCharacteristics(
    image: ImageRiskDocument,
    history: Array<{ date: Date; riskScore: number; podCount: number }>
  ): BehavioralPattern["characteristics"] {
    // Risk score volatility
    const scores = history.map(h => h.riskScore);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const volatility = Math.min(1.0, stdDev / 50); // Normalize

    // Update frequency (basit hesaplama)
    const days = history.length > 1
      ? (history[history.length - 1].date.getTime() - history[0].date.getTime()) / (1000 * 60 * 60 * 24)
      : 1;
    const updateFrequency = history.length / Math.max(days, 1);

    // Risk trend
    let riskTrend: "INCREASING" | "STABLE" | "DECREASING" = "STABLE";
    if (history.length >= 2) {
      const first = history[0].riskScore;
      const last = history[history.length - 1].riskScore;
      if (last > first + 5) riskTrend = "INCREASING";
      else if (last < first - 5) riskTrend = "DECREASING";
    }

    // Usage pattern
    const podCounts = history.map(h => h.podCount);
    const firstPodAvg = podCounts.slice(0, Math.floor(podCounts.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(podCounts.length / 2);
    const lastPodAvg = podCounts.slice(Math.floor(podCounts.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(podCounts.length / 2);

    let usagePattern: "GROWING" | "STABLE" | "DECLINING" = "STABLE";
    if (lastPodAvg > firstPodAvg * 1.2) usagePattern = "GROWING";
    else if (lastPodAvg < firstPodAvg * 0.8) usagePattern = "DECLINING";

    // Peak hours (basit - gerçek kullanımda timestamp analizi gerekir)
    const peakHours = [9, 10, 11, 14, 15, 16]; // Varsayılan

    return {
      riskScoreVolatility: volatility,
      updateFrequency,
      riskTrend,
      usagePattern,
      peakHours,
    };
  }

  /**
   * Predictions oluşturur
   */
  private generatePredictions(
    image: ImageRiskDocument,
    history: Array<{ date: Date; riskScore: number; podCount: number }>
  ): BehavioralPattern["predictions"] {
    // Next risk score (basit extrapolation)
    let nextRiskScore = image.riskScore;
    if (history.length >= 2) {
      const recent = history.slice(-3);
      const trend = (recent[recent.length - 1].riskScore - recent[0].riskScore) / recent.length;
      nextRiskScore = image.riskScore + (trend * 7); // 7 gün sonra
    }

    // Next update date (basit tahmin)
    const avgDaysBetweenUpdates = history.length > 1
      ? (history[history.length - 1].date.getTime() - history[0].date.getTime()) / (1000 * 60 * 60 * 24) / history.length
      : 7;
    const nextUpdateDate = new Date(Date.now() + avgDaysBetweenUpdates * 24 * 60 * 60 * 1000);

    // Expected usage
    const podCounts = history.map(h => h.podCount);
    const expectedUsage = podCounts.length > 0
      ? Math.round(podCounts.reduce((a, b) => a + b, 0) / podCounts.length)
      : image.pods.length;

    return {
      nextRiskScore: Math.max(0, Math.min(100, Math.round(nextRiskScore))),
      nextUpdateDate,
      expectedUsage,
    };
  }

  /**
   * Insights oluşturur
   */
  private generateInsights(
    image: ImageRiskDocument,
    history: Array<{ date: Date; riskScore: number; podCount: number }>,
    patternType: string
  ): string[] {
    const insights: string[] = [];

    if (patternType === "TRENDING_UP") {
      insights.push("Risk skoru sürekli artıyor, acil müdahale gerekli");
    }

    if (patternType === "VOLATILE") {
      insights.push("Risk skoru çok değişken, düzenli izleme önerilir");
    }

    if (history.length > 10) {
      const recentAvg = history.slice(-5).reduce((sum, h) => sum + h.riskScore, 0) / 5;
      const olderAvg = history.slice(0, 5).reduce((sum, h) => sum + h.riskScore, 0) / 5;

      if (recentAvg > olderAvg + 10) {
        insights.push("Son dönemde risk skoru önemli ölçüde arttı");
      }
    }

    return insights;
  }

  /**
   * Confidence hesaplar
   */
  private calculateConfidence(historyLength: number): number {
    if (historyLength < 3) return 0.3;
    if (historyLength < 10) return 0.6;
    if (historyLength < 20) return 0.8;
    return 0.95;
  }

  /**
   * Cluster behavior analizi
   */
  async analyzeClusterBehavior(
    clusterId: string
  ): Promise<ClusterBehavior> {
    const images = await ImageRiskModel.find({ clusterId }).exec();

    const riskDistribution = {
      critical: images.filter(img => img.riskLevel === "CRITICAL").length,
      high: images.filter(img => img.riskLevel === "HIGH").length,
      medium: images.filter(img => img.riskLevel === "MEDIUM").length,
      low: images.filter(img => img.riskLevel === "LOW").length,
    };

    // Overall pattern
    const totalRisk = images.reduce((sum, img) => sum + img.riskScore, 0) / images.length;
    let overallPattern: "HEALTHY" | "DETERIORATING" | "IMPROVING" | "VOLATILE";
    if (totalRisk < 30) overallPattern = "HEALTHY";
    else if (totalRisk > 70) overallPattern = "DETERIORATING";
    else if (riskDistribution.critical + riskDistribution.high > images.length * 0.3) {
      overallPattern = "DETERIORATING";
    } else {
      overallPattern = "IMPROVING";
    }

    // Common patterns
    const commonPatterns: string[] = [];
    const factorCounts = new Map<string, number>();
    images.forEach(img => {
      img.riskFactors.forEach(factor => {
        factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
      });
    });

    factorCounts.forEach((count, factor) => {
      if (count > images.length * 0.5) {
        commonPatterns.push(`${factor} (${count} image)`);
      }
    });

    // Recommendations
    const recommendations: string[] = [];
    if (riskDistribution.critical > 0) {
      recommendations.push(`${riskDistribution.critical} kritik riskli image acil ele alınmalı`);
    }
    if (commonPatterns.length > 0) {
      recommendations.push(`Yaygın risk faktörleri: ${commonPatterns.join(", ")}`);
    }

    return {
      clusterId,
      overallPattern,
      riskDistribution,
      commonPatterns,
      recommendations,
    };
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained;
  }
}

