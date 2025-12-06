import { ImageRiskResult } from "../risk/riskEngine";
import { AnomalyModel, AnomalyDocument, AnomalyType, AnomalySeverity } from "../persistence/anomaly.model";
import { ImageRiskRepository, MongoImageRiskRepository } from "../persistence/imageRisk.repository";
import { WebhookEventService } from "./webhookEventService";

export interface AnomalyDetectionResult {
  anomalies: AnomalyDocument[];
  totalDetected: number;
}

export class AnomalyDetectionService {
  private repository: ImageRiskRepository;
  private webhookEventService: WebhookEventService;

  constructor() {
    this.repository = new MongoImageRiskRepository();
    this.webhookEventService = new WebhookEventService();
  }

  /**
   * Yeni scan sonuçlarını analiz eder ve anomalileri tespit eder
   */
  async detectAnomalies(
    currentResults: ImageRiskResult[],
    clusterId?: string
  ): Promise<AnomalyDetectionResult> {
    const anomalies: AnomalyDocument[] = [];

    for (const current of currentResults) {
      // Önceki scan sonuçlarını bul
      const previous = await this.repository.findByImageName(
        current.imageName,
        clusterId
      );

      if (!previous) {
        // İlk kez görülen image - anomali değil, normal
        continue;
      }

      // Risk skoru değişikliği kontrolü
      const riskScoreChange = current.riskScore - previous.riskScore;
      const riskScoreChangePercent =
        previous.riskScore > 0
          ? (riskScoreChange / previous.riskScore) * 100
          : 0;

      // Risk skorunda ani artış (>%50 artış veya 30+ puan artış)
      if (
        riskScoreChangePercent > 50 ||
        (riskScoreChange > 30 && current.riskScore >= 50)
      ) {
        const anomaly = await AnomalyModel.create({
          imageName: current.imageName,
          clusterId,
          anomalyType: "RISK_SCORE_SPIKE",
          severity: this.calculateSeverity(riskScoreChange, current.riskScore),
          description: `Risk skoru ${previous.riskScore}'dan ${current.riskScore}'a yükseldi (${riskScoreChangePercent.toFixed(1)}% artış)`,
          previousValue: previous.riskScore,
          currentValue: current.riskScore,
          changePercentage: riskScoreChangePercent,
          affectedPods: current.pods,
          riskFactors: current.riskFactors,
          detectedAt: new Date(),
        });
        anomalies.push(anomaly);
      }

      // Risk skorunda ani düşüş (>%70 düşüş ve önceki skor yüksekse)
      if (
        riskScoreChangePercent < -70 &&
        previous.riskScore >= 50 &&
        current.riskScore < 30
      ) {
        const anomaly = await AnomalyModel.create({
          imageName: current.imageName,
          clusterId,
          anomalyType: "RISK_SCORE_DROP",
          severity: "LOW", // Düşüş genelde iyi bir şey
          description: `Risk skoru ${previous.riskScore}'dan ${current.riskScore}'a düştü (${Math.abs(riskScoreChangePercent).toFixed(1)}% düşüş)`,
          previousValue: previous.riskScore,
          currentValue: current.riskScore,
          changePercentage: riskScoreChangePercent,
          affectedPods: current.pods,
          riskFactors: current.riskFactors,
          detectedAt: new Date(),
        });
        anomalies.push(anomaly);
      }

      // Yeni risk faktörleri kontrolü
      const newRiskFactors = current.riskFactors.filter(
        (factor) => !previous.riskFactors.includes(factor)
      );

      if (newRiskFactors.length > 0) {
        const anomaly = await AnomalyModel.create({
          imageName: current.imageName,
          clusterId,
          anomalyType: "NEW_RISK_FACTOR",
          severity: this.calculateSeverityFromRiskFactors(newRiskFactors),
          description: `${newRiskFactors.length} yeni risk faktörü eklendi: ${newRiskFactors.join(", ")}`,
          previousValue: previous.riskFactors.join(", "),
          currentValue: current.riskFactors.join(", "),
          affectedPods: current.pods,
          riskFactors: newRiskFactors,
          detectedAt: new Date(),
        });
        anomalies.push(anomaly);
      }

      // Pod sayısı değişikliği kontrolü
      const podCountChange = current.pods.length - previous.pods.length;
      const podCountChangePercent =
        previous.pods.length > 0
          ? (podCountChange / previous.pods.length) * 100
          : 0;

      // Pod sayısında ani artış (>%100 artış veya 10+ pod artışı)
      if (
        (podCountChangePercent > 100 && podCountChange >= 5) ||
        podCountChange >= 10
      ) {
        const anomaly = await AnomalyModel.create({
          imageName: current.imageName,
          clusterId,
          anomalyType: "POD_COUNT_INCREASE",
          severity:
            podCountChange >= 20
              ? "HIGH"
              : podCountChange >= 10
              ? "MEDIUM"
              : "LOW",
          description: `Pod sayısı ${previous.pods.length}'den ${current.pods.length}'e yükseldi (${podCountChange} pod eklendi)`,
          previousValue: previous.pods.length,
          currentValue: current.pods.length,
          changePercentage: podCountChangePercent,
          affectedPods: current.pods,
          detectedAt: new Date(),
        });
        anomalies.push(anomaly);
      }

      // Alışılmadık namespace kontrolü (prod namespace'de yeni görünen image)
      const prodPods = current.pods.filter(
        (p) =>
          p.namespace.toLowerCase() === "prod" ||
          p.namespace.toLowerCase().startsWith("prod-")
      );
      const previousProdPods = previous.pods.filter(
        (p) =>
          p.namespace.toLowerCase() === "prod" ||
          p.namespace.toLowerCase().startsWith("prod-")
      );

      if (prodPods.length > 0 && previousProdPods.length === 0) {
        const anomaly = await AnomalyModel.create({
          imageName: current.imageName,
          clusterId,
          anomalyType: "UNUSUAL_NAMESPACE",
          severity: current.riskScore >= 50 ? "HIGH" : "MEDIUM",
          description: `Image ilk kez production namespace'lerinde görüldü: ${prodPods.map((p) => p.namespace).join(", ")}`,
          affectedPods: prodPods,
          riskFactors: current.riskFactors,
          detectedAt: new Date(),
        });
        anomalies.push(anomaly);
      }
    }

    return {
      anomalies,
      totalDetected: anomalies.length,
    };
  }

  /**
   * Risk skoru değişikliğine göre severity hesaplar
   */
  private calculateSeverity(
    change: number,
    currentScore: number
  ): AnomalySeverity {
    if (change >= 50 || currentScore >= 80) {
      return "CRITICAL";
    } else if (change >= 30 || currentScore >= 60) {
      return "HIGH";
    } else if (change >= 15 || currentScore >= 40) {
      return "MEDIUM";
    }
    return "LOW";
  }

  /**
   * Risk faktörlerine göre severity hesaplar
   */
  private calculateSeverityFromRiskFactors(
    factors: string[]
  ): AnomalySeverity {
    const criticalKeywords = ["CRITICAL", "root", "latest"];
    const highKeywords = ["HIGH", "prod", "legacy"];

    if (factors.some((f) => criticalKeywords.some((k) => f.includes(k)))) {
      return "CRITICAL";
    } else if (factors.some((f) => highKeywords.some((k) => f.includes(k)))) {
      return "HIGH";
    }
    return "MEDIUM";
  }

  /**
   * Tüm çözülmemiş anomalileri listeler
   */
  async getUnresolvedAnomalies(
    clusterId?: string,
    limit = 100
  ): Promise<AnomalyDocument[]> {
    const query: any = { resolvedAt: null };
    if (clusterId) query.clusterId = clusterId;

    return AnomalyModel.find(query)
      .sort({ detectedAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Belirli bir image için anomalileri listeler
   */
  async getAnomaliesForImage(
    imageName: string,
    clusterId?: string,
    limit = 50
  ): Promise<AnomalyDocument[]> {
    const query: any = { imageName };
    if (clusterId) query.clusterId = clusterId;

    return AnomalyModel.find(query)
      .sort({ detectedAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Bir anomaliyi çözülmüş olarak işaretler
   */
  async resolveAnomaly(anomalyId: string): Promise<AnomalyDocument | null> {
    return AnomalyModel.findByIdAndUpdate(
      anomalyId,
      { resolvedAt: new Date() },
      { new: true }
    ).exec();
  }
}

