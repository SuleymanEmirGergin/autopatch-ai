import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { AnomalyModel, AnomalyDocument } from "../persistence/anomaly.model";
import { ScanRunModel } from "../persistence/scanRun.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface RootCauseAnalysis {
  anomalyId: string;
  anomalyType: string;
  rootCauses: Array<{
    cause: string;
    confidence: number; // 0-1
    evidence: string[];
    impact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    recommendation: string;
  }>;
  primaryRootCause: {
    cause: string;
    confidence: number;
    explanation: string;
  };
  contributingFactors: string[];
  timeline: Array<{
    timestamp: Date;
    event: string;
    significance: "HIGH" | "MEDIUM" | "LOW";
  }>;
  recommendations: string[];
}

export class AnomalyRootCauseService {
  private rootCauseModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Root cause modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Anomaly root cause analysis modeli eğitiliyor...");

      // Historical anomalies ve root causes'dan öğren
      const trainingData = this.generateTrainingData();

      this.rootCauseModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [15],
            units: 64,
            activation: "relu",
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: "relu",
          }),
          tf.layers.dense({
            units: 5, // Root cause categories
            activation: "softmax",
          }),
        ],
      });

      this.rootCauseModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "categoricalCrossentropy",
        metrics: ["accuracy"],
      });

      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels);

      await this.rootCauseModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Anomaly root cause analysis modeli eğitimi tamamlandı");
    } catch (error) {
      logger.error("Model eğitimi sırasında hata:", error);
      this.isModelTrained = false;
    }
  }

  /**
   * Synthetic training data
   */
  private generateTrainingData(): { features: number[][]; labels: number[][] } {
    const features: number[][] = [];
    const labels: number[][] = [];

    // Root cause categories: [Image Update, Config Change, New Deployment, Security Issue, Resource Change]
    for (let i = 0; i < 200; i++) {
      const riskScoreChange = Math.random() * 50;
      const podCountChange = Math.random() * 20;
      const newRiskFactors = Math.floor(Math.random() * 5);
      const imageUpdate = Math.random() > 0.7 ? 1 : 0;
      const configChange = Math.random() > 0.8 ? 1 : 0;
      const newDeployment = Math.random() > 0.6 ? 1 : 0;
      const securityIssue = Math.random() > 0.7 ? 1 : 0;
      const resourceChange = Math.random() > 0.8 ? 1 : 0;
      const prodImpact = Math.random() > 0.5 ? 1 : 0;
      const timeOfDay = Math.random();
      const dayOfWeek = Math.random();
      const recentScans = Math.floor(Math.random() * 10);
      const anomalyType = Math.random();
      const severity = Math.random();
      const hasLatestTag = Math.random() > 0.5 ? 1 : 0;
      const hasRootUser = Math.random() > 0.5 ? 1 : 0;

      features.push([
        riskScoreChange / 50,
        podCountChange / 20,
        newRiskFactors / 5,
        imageUpdate,
        configChange,
        newDeployment,
        securityIssue,
        resourceChange,
        prodImpact,
        timeOfDay,
        dayOfWeek,
        Math.min(recentScans / 10, 1),
        anomalyType,
        severity,
        hasLatestTag,
      ]);

      // Label: root cause category
      let rootCause = [0, 0, 0, 0, 0];
      if (imageUpdate && riskScoreChange > 20) {
        rootCause[0] = 1; // Image Update
      } else if (configChange) {
        rootCause[1] = 1; // Config Change
      } else if (newDeployment && podCountChange > 5) {
        rootCause[2] = 1; // New Deployment
      } else if (securityIssue || hasRootUser) {
        rootCause[3] = 1; // Security Issue
      } else if (resourceChange) {
        rootCause[4] = 1; // Resource Change
      } else {
        rootCause[0] = 1; // Default: Image Update
      }

      labels.push(rootCause);
    }

    return { features, labels };
  }

  /**
   * Root cause analizi yapar
   */
  async analyzeRootCause(
    anomaly: AnomalyDocument,
    image: ImageRiskDocument,
    clusterId?: string
  ): Promise<RootCauseAnalysis> {
    // Historical context al
    const history = await this.getImageHistory(image.imageName, clusterId);
    const recentAnomalies = await this.getRecentAnomalies(image.imageName, clusterId);

    // Root causes belirle
    const rootCauses = this.identifyRootCauses(anomaly, image, history, recentAnomalies);

    // Primary root cause
    const primaryRootCause = rootCauses.sort((a, b) => b.confidence - a.confidence)[0];

    // Contributing factors
    const contributingFactors = this.identifyContributingFactors(anomaly, image, history);

    // Timeline
    const timeline = this.buildTimeline(anomaly, image, history);

    // Recommendations
    const recommendations = this.generateRootCauseRecommendations(
      primaryRootCause,
      rootCauses,
      image
    );

    return {
      anomalyId: anomaly._id.toString(),
      anomalyType: anomaly.anomalyType,
      rootCauses,
      primaryRootCause: {
        cause: primaryRootCause.cause,
        confidence: primaryRootCause.confidence,
        explanation: primaryRootCause.evidence.join(". "),
      },
      contributingFactors,
      timeline,
      recommendations,
    };
  }

  /**
   * Root causes belirler
   */
  private identifyRootCauses(
    anomaly: AnomalyDocument,
    image: ImageRiskDocument,
    history: Array<{ date: Date; riskScore: number }>,
    recentAnomalies: AnomalyDocument[]
  ): RootCauseAnalysis["rootCauses"] {
    const causes: RootCauseAnalysis["rootCauses"] = [];

    // Risk score spike
    if (anomaly.anomalyType === "RISK_SCORE_SPIKE") {
      const previousScore = history.length > 0 ? history[history.length - 1].riskScore : image.riskScore;
      const scoreIncrease = (anomaly.currentValue as number) - previousScore;

      if (scoreIncrease > 30) {
        causes.push({
          cause: "Image Güncellemesi veya Yeni Risk Faktörü",
          confidence: 0.85,
          evidence: [
            `Risk skoru ${previousScore}'dan ${anomaly.currentValue}'a yükseldi (${scoreIncrease} puan artış)`,
            "Yeni risk faktörleri eklendi olabilir",
          ],
          impact: "HIGH",
          recommendation: "Image güncellemesini ve risk faktörlerini kontrol edin",
        });
      }
    }

    // New risk factors
    if (anomaly.anomalyType === "NEW_RISK_FACTOR") {
      causes.push({
        cause: "Yeni Risk Faktörü Eklendi",
        confidence: 0.9,
        evidence: [
          `Yeni risk faktörleri: ${(anomaly.riskFactors || []).join(", ")}`,
          "Image güncellemesi veya konfigürasyon değişikliği olabilir",
        ],
        impact: "MEDIUM",
        recommendation: "Risk faktörlerini inceleyin ve gerekirse remediation uygulayın",
      });
    }

    // Pod count increase
    if (anomaly.anomalyType === "POD_COUNT_INCREASE") {
      causes.push({
        cause: "Yeni Deployment veya Scaling",
        confidence: 0.8,
        evidence: [
          `Pod sayısı ${anomaly.previousValue}'dan ${anomaly.currentValue}'a yükseldi`,
          "Yeni deployment veya horizontal scaling olabilir",
        ],
        impact: "MEDIUM",
        recommendation: "Deployment geçmişini kontrol edin",
      });
    }

    // Production namespace
    if (anomaly.anomalyType === "UNUSUAL_NAMESPACE") {
      causes.push({
        cause: "Production Ortamına Yeni Image Deploy Edildi",
        confidence: 0.95,
        evidence: [
          "Image ilk kez production namespace'lerinde görüldü",
          "Production deployment sürecini kontrol edin",
        ],
        impact: "CRITICAL",
        recommendation: "Production deployment'ı gözden geçirin ve gerekirse rollback yapın",
      });
    }

    // Latest tag risk
    if (image.riskFactors.includes("Uses latest tag")) {
      causes.push({
        cause: "Latest Tag Kullanımı - Değişken Versiyon",
        confidence: 0.7,
        evidence: [
          "Latest tag kullanımı image versiyonunun değişmesine neden olabilir",
          "Yeni versiyon yeni risk faktörleri getirmiş olabilir",
        ],
        impact: "HIGH",
        recommendation: "Versioned tag'e geçin",
      });
    }

    return causes;
  }

  /**
   * Contributing factors belirler
   */
  private identifyContributingFactors(
    anomaly: AnomalyDocument,
    image: ImageRiskDocument,
    history: Array<{ date: Date; riskScore: number }>
  ): string[] {
    const factors: string[] = [];

    if (image.riskFactors.includes("Uses latest tag")) {
      factors.push("Latest tag kullanımı");
    }

    if (image.riskFactors.includes("Uses root user")) {
      factors.push("Root user kullanımı");
    }

    if (history.length > 0) {
      const recentTrend = history.slice(-3);
      if (recentTrend.length >= 2) {
        const trend = recentTrend[recentTrend.length - 1].riskScore - recentTrend[0].riskScore;
        if (trend > 10) {
          factors.push("Son dönemde risk artış trendi");
        }
      }
    }

    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    if (prodPods > 0) {
      factors.push("Production ortamında kullanım");
    }

    return factors;
  }

  /**
   * Timeline oluşturur
   */
  private buildTimeline(
    anomaly: AnomalyDocument,
    image: ImageRiskDocument,
    history: Array<{ date: Date; riskScore: number }>
  ): RootCauseAnalysis["timeline"] {
    const timeline: RootCauseAnalysis["timeline"] = [];

    // Historical points
    history.slice(-5).forEach((point, idx) => {
      timeline.push({
        timestamp: point.date,
        event: `Risk skoru: ${point.riskScore}`,
        significance: idx === history.length - 1 ? "HIGH" : "MEDIUM",
      });
    });

    // Anomaly detection
    timeline.push({
      timestamp: anomaly.detectedAt,
      event: `Anomali tespit edildi: ${anomaly.anomalyType}`,
      significance: "HIGH",
    });

    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Recommendations oluşturur
   */
  private generateRootCauseRecommendations(
    primaryRootCause: RootCauseAnalysis["rootCauses"][0],
    allCauses: RootCauseAnalysis["rootCauses"],
    image: ImageRiskDocument
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(primaryRootCause.recommendation);

    if (allCauses.length > 1) {
      recommendations.push(`${allCauses.length} farklı root cause tespit edildi, kapsamlı inceleme önerilir`);
    }

    if (image.riskLevel === "CRITICAL") {
      recommendations.push("Kritik risk seviyesi, acil müdahale gerekli");
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
      .limit(10)
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
   * Recent anomalies alır
   */
  private async getRecentAnomalies(
    imageName: string,
    clusterId?: string
  ): Promise<AnomalyDocument[]> {
    return AnomalyModel.find({
      imageName,
      ...(clusterId && { clusterId }),
      detectedAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Son 7 gün
      },
    })
      .sort({ detectedAt: -1 })
      .limit(10)
      .exec();
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.rootCauseModel !== null;
  }
}

