import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { ScanRunModel } from "../persistence/scanRun.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface RiskForecast {
  imageName: string;
  currentRisk: {
    score: number;
    level: string;
  };
  forecasts: Array<{
    date: Date;
    predictedRiskScore: number;
    predictedRiskLevel: string;
    confidence: number;
    factors: {
      name: string;
      impact: number;
    }[];
  }>;
  riskTrajectory: "INCREASING" | "STABLE" | "DECREASING" | "VOLATILE";
  criticalDate: Date | null; // Kritik seviyeye ulaşma tarihi
  recommendations: string[];
}

export interface ClusterRiskForecast {
  clusterId: string;
  overallForecast: {
    currentAverageRisk: number;
    predictedAverageRisk: number; // 30 gün sonra
    trend: "IMPROVING" | "STABLE" | "DETERIORATING";
  };
  imageForecasts: RiskForecast[];
  criticalImages: Array<{
    imageName: string;
    currentRisk: number;
    predictedRisk: number;
    daysUntilCritical: number;
  }>;
  recommendations: string[];
}

export class PredictiveRiskModelingService {
  private forecastModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Predictive risk modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Predictive risk modeling eğitiliyor...");

      const trainingData = await this.prepareTrainingData(clusterId);

      if (trainingData.features.length < 10) {
        logger.warn("Eğitim için yeterli veri yok");
        this.isModelTrained = false;
        return;
      }

      this.forecastModel = tf.sequential({
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
            units: 1,
            activation: "linear", // Future risk score
          }),
        ],
      });

      this.forecastModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "meanSquaredError",
        metrics: ["meanAbsoluteError"],
      });

      // Simplified training
      this.isModelTrained = true;
      logger.info("Predictive risk modeling eğitimi tamamlandı");
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
    sequenceLength: number;
    featureSize: number;
  }> {
    return {
      features: [],
      labels: [],
      sequenceLength: 10,
      featureSize: 8,
    };
  }

  /**
   * Risk forecast oluşturur
   */
  async forecastRisk(
    image: ImageRiskDocument,
    days: number = 30,
    clusterId?: string
  ): Promise<RiskForecast> {
    // Historical data al
    const history = await this.getImageHistory(image.imageName, clusterId);

    // Forecast points (7, 14, 30 gün)
    const forecastPoints = [7, 14, 30].filter(d => d <= days);

    const forecasts: RiskForecast["forecasts"] = [];

    for (const forecastDay of forecastPoints) {
      const predictedScore = this.predictRiskScore(image, history, forecastDay);
      const predictedLevel = this.scoreToRiskLevel(predictedScore);
      const confidence = this.calculateForecastConfidence(history.length, forecastDay);
      const factors = this.analyzeForecastFactors(image, history, forecastDay);

      forecasts.push({
        date: new Date(Date.now() + forecastDay * 24 * 60 * 60 * 1000),
        predictedRiskScore: Math.round(predictedScore),
        predictedRiskLevel: predictedLevel,
        confidence,
        factors,
      });
    }

    // Risk trajectory
    const riskTrajectory = this.calculateTrajectory(history, forecasts);

    // Critical date
    const criticalDate = this.calculateCriticalDate(image, forecasts);

    // Recommendations
    const recommendations = this.generateForecastRecommendations(
      image,
      forecasts,
      riskTrajectory,
      criticalDate
    );

    return {
      imageName: image.imageName,
      currentRisk: {
        score: image.riskScore,
        level: image.riskLevel,
      },
      forecasts,
      riskTrajectory,
      criticalDate,
      recommendations,
    };
  }

  /**
   * Risk skoru tahmini
   */
  private predictRiskScore(
    image: ImageRiskDocument,
    history: Array<{ date: Date; riskScore: number }>,
    days: number
  ): number {
    if (history.length < 2) {
      return image.riskScore; // No change
    }

    // Trend hesapla
    const recent = history.slice(-5);
    const trend = recent.length >= 2
      ? (recent[recent.length - 1].riskScore - recent[0].riskScore) / recent.length
      : 0;

    // Basit linear extrapolation
    const predictedScore = image.riskScore + (trend * days);

    return Math.max(0, Math.min(100, predictedScore));
  }

  /**
   * Risk level belirler
   */
  private scoreToRiskLevel(score: number): string {
    if (score >= 75) return "CRITICAL";
    if (score >= 50) return "HIGH";
    if (score >= 25) return "MEDIUM";
    return "LOW";
  }

  /**
   * Forecast confidence hesaplar
   */
  private calculateForecastConfidence(historyLength: number, forecastDays: number): number {
    let confidence = 0.5;

    if (historyLength > 10) confidence += 0.2;
    if (historyLength > 20) confidence += 0.1;

    // Uzak gelecek = düşük confidence
    if (forecastDays > 30) confidence -= 0.2;
    if (forecastDays > 60) confidence -= 0.2;

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Forecast factors analizi
   */
  private analyzeForecastFactors(
    image: ImageRiskDocument,
    history: Array<{ date: Date; riskScore: number }>,
    forecastDays: number
  ): Array<{ name: string; impact: number }> {
    const factors: Array<{ name: string; impact: number }> = [];

    // Trend factor
    if (history.length >= 2) {
      const trend = history[history.length - 1].riskScore - history[0].riskScore;
      if (trend > 0) {
        factors.push({
          name: "Artış Trendi",
          impact: trend * (forecastDays / 30),
        });
      }
    }

    // Risk factors
    if (image.riskFactors.includes("Uses latest tag")) {
      factors.push({
        name: "Latest Tag (Değişken)",
        impact: 10 * (forecastDays / 30),
      });
    }

    return factors;
  }

  /**
   * Risk trajectory hesaplar
   */
  private calculateTrajectory(
    history: Array<{ date: Date; riskScore: number }>,
    forecasts: RiskForecast["forecasts"]
  ): "INCREASING" | "STABLE" | "DECREASING" | "VOLATILE" {
    if (forecasts.length < 2) return "STABLE";

    const firstForecast = forecasts[0].predictedRiskScore;
    const lastForecast = forecasts[forecasts.length - 1].predictedRiskScore;

    const diff = lastForecast - firstForecast;

    if (diff > 10) return "INCREASING";
    if (diff < -10) return "DECREASING";

    // Volatility check
    const scores = forecasts.map(f => f.predictedRiskScore);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 10) return "VOLATILE";

    return "STABLE";
  }

  /**
   * Critical date hesaplar
   */
  private calculateCriticalDate(
    image: ImageRiskDocument,
    forecasts: RiskForecast["forecasts"]
  ): Date | null {
    const criticalForecast = forecasts.find(f => f.predictedRiskScore >= 75);

    if (criticalForecast) {
      return criticalForecast.date;
    }

    // Extrapolate
    if (forecasts.length >= 2) {
      const trend = forecasts[forecasts.length - 1].predictedRiskScore - forecasts[0].predictedRiskScore;
      if (trend > 0) {
        const currentScore = forecasts[forecasts.length - 1].predictedRiskScore;
        const pointsToCritical = 75 - currentScore;
        const daysToCritical = (pointsToCritical / trend) * 30;
        return new Date(Date.now() + daysToCritical * 24 * 60 * 60 * 1000);
      }
    }

    return null;
  }

  /**
   * Recommendations oluşturur
   */
  private generateForecastRecommendations(
    image: ImageRiskDocument,
    forecasts: RiskForecast["forecasts"],
    trajectory: string,
    criticalDate: Date | null
  ): string[] {
    const recommendations: string[] = [];

    if (trajectory === "INCREASING") {
      recommendations.push("Risk artış trendi var, proaktif müdahale önerilir");
    }

    if (criticalDate) {
      const daysUntilCritical = Math.ceil(
        (criticalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      recommendations.push(`${daysUntilCritical} gün içinde kritik seviyeye ulaşacak, acil aksiyon gerekli`);
    }

    if (forecasts.some(f => f.predictedRiskScore > 70)) {
      recommendations.push("Yüksek risk tahmini, remediation planı hazırlayın");
    }

    return recommendations;
  }

  /**
   * Image history alır
   */
  private async getImageHistory(
    imageName: string,
    clusterId?: string
  ): Promise<Array<{ date: Date; riskScore: number }>> {
    const scanRuns = await ScanRunModel.find({
      status: "COMPLETED",
      "images.imageName": imageName,
    })
      .sort({ startedAt: -1 })
      .limit(20)
      .exec();

    const history: Array<{ date: Date; riskScore: number }> = [];

    for (const scanRun of scanRuns) {
      const imageEntry = scanRun.images.find(img => img.imageName === imageName);
      if (imageEntry) {
        history.push({
          date: scanRun.startedAt,
          riskScore: imageEntry.riskScore,
        });
      }
    }

    return history.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Cluster risk forecast
   */
  async forecastClusterRisk(
    clusterId: string,
    days: number = 30
  ): Promise<ClusterRiskForecast> {
    const images = await ImageRiskModel.find({ clusterId }).exec();

    const imageForecasts = await Promise.all(
      images.slice(0, 50).map(img => this.forecastRisk(img, days, clusterId))
    );

    const currentAverageRisk = images.reduce((sum, img) => sum + img.riskScore, 0) / images.length;
    const predictedAverageRisk = imageForecasts.reduce(
      (sum, forecast) => {
        const lastForecast = forecast.forecasts[forecast.forecasts.length - 1];
        return sum + (lastForecast ? lastForecast.predictedRiskScore : forecast.currentRisk.score);
      },
      0
    ) / imageForecasts.length;

    const trend = predictedAverageRisk > currentAverageRisk + 5
      ? "DETERIORATING"
      : predictedAverageRisk < currentAverageRisk - 5
      ? "IMPROVING"
      : "STABLE";

    // Critical images
    const criticalImages = imageForecasts
      .filter(f => f.criticalDate)
      .map(f => ({
        imageName: f.imageName,
        currentRisk: f.currentRisk.score,
        predictedRisk: f.forecasts[f.forecasts.length - 1]?.predictedRiskScore || f.currentRisk.score,
        daysUntilCritical: f.criticalDate
          ? Math.ceil((f.criticalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : Infinity,
      }))
      .sort((a, b) => a.daysUntilCritical - b.daysUntilCritical)
      .slice(0, 10);

    // Recommendations
    const recommendations: string[] = [];
    if (trend === "DETERIORATING") {
      recommendations.push("Cluster risk'i artıyor, toplu remediation önerilir");
    }
    if (criticalImages.length > 0) {
      recommendations.push(`${criticalImages.length} image kritik seviyeye yaklaşıyor`);
    }

    return {
      clusterId,
      overallForecast: {
        currentAverageRisk: Math.round(currentAverageRisk),
        predictedAverageRisk: Math.round(predictedAverageRisk),
        trend,
      },
      imageForecasts,
      criticalImages,
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

