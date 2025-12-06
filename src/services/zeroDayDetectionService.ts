import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { SBOMModel } from "../persistence/sbom.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface ZeroDayIndicator {
  type: "UNKNOWN_CVE" | "SUSPICIOUS_PATTERN" | "ANOMALOUS_BEHAVIOR" | "NEW_VULNERABILITY";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  confidence: number; // 0-1
  evidence: string[];
  recommendedAction: string;
}

export interface ZeroDayDetection {
  imageName: string;
  hasZeroDayRisk: boolean;
  riskScore: number; // 0-100
  indicators: ZeroDayIndicator[];
  timeline: Array<{
    date: Date;
    event: string;
    significance: "HIGH" | "MEDIUM" | "LOW";
  }>;
  recommendations: string[];
  mitigationSteps: string[];
}

export class ZeroDayDetectionService {
  private detectionModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Zero-day detection modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Zero-day detection modeli eğitiliyor...");

      const trainingData = this.generateTrainingData();

      this.detectionModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [12],
            units: 64,
            activation: "relu",
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 32,
            activation: "relu",
          }),
          tf.layers.dense({
            units: 1,
            activation: "sigmoid", // Zero-day risk probability
          }),
        ],
      });

      this.detectionModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
      });

      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1]);

      await this.detectionModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Zero-day detection modeli eğitimi tamamlandı");
    } catch (error) {
      logger.error("Model eğitimi sırasında hata:", error);
      this.isModelTrained = false;
    }
  }

  /**
   * Synthetic training data
   */
  private generateTrainingData(): { features: number[][]; labels: number[] } {
    const features: number[][] = [];
    const labels: number[] = [];

    for (let i = 0; i < 200; i++) {
      const hasUnknownCVE = Math.random() > 0.8 ? 1 : 0;
      const suspiciousPattern = Math.random() > 0.85 ? 1 : 0;
      const anomalousBehavior = Math.random() > 0.9 ? 1 : 0;
      const newVulnerability = Math.random() > 0.9 ? 1 : 0;
      const riskScore = Math.random() * 100;
      const hasLatestTag = Math.random() > 0.5 ? 1 : 0;
      const hasRootUser = Math.random() > 0.5 ? 1 : 0;
      const prodPods = Math.random() > 0.5 ? 1 : 0;
      const recentUpdate = Math.random() > 0.7 ? 1 : 0;
      const unknownBase = Math.random() > 0.8 ? 1 : 0;
      const highRiskFactors = Math.random() > 0.6 ? 1 : 0;
      const unusualNamespace = Math.random() > 0.9 ? 1 : 0;

      features.push([
        hasUnknownCVE,
        suspiciousPattern,
        anomalousBehavior,
        newVulnerability,
        riskScore / 100,
        hasLatestTag,
        hasRootUser,
        prodPods,
        recentUpdate,
        unknownBase,
        highRiskFactors,
        unusualNamespace,
      ]);

      // Label: zero-day risk?
      let zeroDayRisk = 0;
      if (hasUnknownCVE || suspiciousPattern || anomalousBehavior || newVulnerability) {
        zeroDayRisk = 1;
      } else if (unknownBase && riskScore > 70) {
        zeroDayRisk = 0.7;
      }

      labels.push(zeroDayRisk);
    }

    return { features, labels };
  }

  /**
   * Zero-day risk tespiti yapar
   */
  async detectZeroDay(
    image: ImageRiskDocument,
    clusterId?: string
  ): Promise<ZeroDayDetection> {
    // SBOM verilerini al
    const sbomData = await SBOMModel.findOne({
      imageName: image.imageName,
    })
      .sort({ scannedAt: -1 })
      .exec();

    // Indicators topla
    const indicators: ZeroDayIndicator[] = [];

    // Unknown CVE check
    if (sbomData?.vulnerabilities) {
      const unknownCVEs = sbomData.vulnerabilities.filter(v => 
        !v.cveId || v.cveId === "UNKNOWN" || v.severity === "UNKNOWN"
      );

      if (unknownCVEs.length > 0) {
        indicators.push({
          type: "UNKNOWN_CVE",
          severity: "HIGH",
          description: `${unknownCVEs.length} bilinmeyen CVE tespit edildi`,
          confidence: 0.7,
          evidence: unknownCVEs.map(v => v.cveId || "UNKNOWN"),
          recommendedAction: "CVE veritabanını güncelleyin ve image'i yeniden tarayın",
        });
      }
    }

    // Suspicious pattern check
    if (image.riskFactors.includes("Uses unknown base image")) {
      indicators.push({
        type: "SUSPICIOUS_PATTERN",
        severity: "MEDIUM",
        description: "Bilinmeyen base image kullanımı şüpheli pattern oluşturuyor",
        confidence: 0.6,
        evidence: ["Unknown base image", "Limited security information"],
        recommendedAction: "Güvenilir base image kullanın",
      });
    }

    // Anomalous behavior
    if (image.riskScore > 80 && image.riskFactors.length > 6) {
      indicators.push({
        type: "ANOMALOUS_BEHAVIOR",
        severity: "HIGH",
        description: "Yüksek risk skoru ve çok sayıda risk faktörü anormal davranış gösteriyor",
        confidence: 0.75,
        evidence: [
          `Risk skoru: ${image.riskScore}`,
          `${image.riskFactors.length} risk faktörü`,
        ],
        recommendedAction: "Detaylı güvenlik incelemesi yapın",
      });
    }

    // New vulnerability pattern
    if (image.riskFactors.includes("Uses latest tag") && image.riskScore > 60) {
      indicators.push({
        type: "NEW_VULNERABILITY",
        severity: "MEDIUM",
        description: "Latest tag kullanımı yeni güvenlik açıklarına maruz kalabilir",
        confidence: 0.65,
        evidence: ["Latest tag", "Değişken versiyon"],
        recommendedAction: "Versioned tag'e geçin ve güvenlik yamalarını takip edin",
      });
    }

    // AI-based risk score
    let zeroDayRiskScore = 0;
    if (this.isModelTrained && this.detectionModel) {
      try {
        const features = this.extractZeroDayFeatures(image, sbomData);
        const featuresTensor = tf.tensor2d([features]);
        const prediction = this.detectionModel.predict(featuresTensor) as tf.Tensor;
        const riskProbability = (await prediction.data())[0];
        prediction.dispose();
        featuresTensor.dispose();
        zeroDayRiskScore = riskProbability * 100;
      } catch (error) {
        logger.error("Zero-day detection hatası:", error);
        zeroDayRiskScore = this.ruleBasedZeroDayRisk(indicators);
      }
    } else {
      zeroDayRiskScore = this.ruleBasedZeroDayRisk(indicators);
    }

    const hasZeroDayRisk = zeroDayRiskScore > 50 || indicators.length > 0;

    // Timeline
    const timeline = this.buildZeroDayTimeline(image, indicators);

    // Recommendations
    const recommendations = this.generateZeroDayRecommendations(indicators, zeroDayRiskScore);

    // Mitigation steps
    const mitigationSteps = this.generateMitigationSteps(indicators, image);

    return {
      imageName: image.imageName,
      hasZeroDayRisk,
      riskScore: Math.round(zeroDayRiskScore),
      indicators,
      timeline,
      recommendations,
      mitigationSteps,
    };
  }

  /**
   * Zero-day features çıkarır
   */
  private extractZeroDayFeatures(
    image: ImageRiskDocument,
    sbomData: any
  ): number[] {
    const unknownCVECount = sbomData?.vulnerabilities?.filter((v: any) => 
      !v.cveId || v.cveId === "UNKNOWN"
    ).length || 0;

    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    return [
      Math.min(unknownCVECount / 10, 1),
      image.riskFactors.includes("Uses unknown base image") ? 1 : 0,
      image.riskScore > 80 ? 1 : 0,
      image.riskFactors.length > 6 ? 1 : 0,
      image.riskFactors.includes("Uses latest tag") ? 1 : 0,
      image.riskFactors.includes("Uses root user") ? 1 : 0,
      prodPods > 0 ? 1 : 0,
      image.riskLevel === "CRITICAL" ? 1 : 0,
      image.riskLevel === "HIGH" ? 1 : 0,
      Math.min(image.pods.length / 20, 1),
      Math.min(image.riskFactors.length / 8, 1),
      image.riskScore / 100,
    ];
  }

  /**
   * Rule-based zero-day risk
   */
  private ruleBasedZeroDayRisk(indicators: ZeroDayIndicator[]): number {
    let risk = 0;

    indicators.forEach(indicator => {
      if (indicator.severity === "CRITICAL") risk += 30;
      else if (indicator.severity === "HIGH") risk += 20;
      else if (indicator.severity === "MEDIUM") risk += 10;
      else risk += 5;
    });

    return Math.min(100, risk);
  }

  /**
   * Timeline oluşturur
   */
  private buildZeroDayTimeline(
    image: ImageRiskDocument,
    indicators: ZeroDayIndicator[]
  ): ZeroDayDetection["timeline"] {
    const timeline: ZeroDayDetection["timeline"] = [];

    timeline.push({
      date: image.lastScannedAt,
      event: "Image tarandı",
      significance: "MEDIUM",
    });

    indicators.forEach((indicator, idx) => {
      timeline.push({
        date: new Date(Date.now() - (indicators.length - idx) * 24 * 60 * 60 * 1000),
        event: `Zero-day indicator tespit edildi: ${indicator.type}`,
        significance: indicator.severity === "CRITICAL" || indicator.severity === "HIGH" ? "HIGH" : "MEDIUM",
      });
    });

    return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Recommendations oluşturur
   */
  private generateZeroDayRecommendations(
    indicators: ZeroDayIndicator[],
    riskScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (riskScore > 70) {
      recommendations.push("Yüksek zero-day risk, acil güvenlik incelemesi önerilir");
    }

    indicators.forEach(indicator => {
      recommendations.push(indicator.recommendedAction);
    });

    if (indicators.length > 2) {
      recommendations.push("Birden fazla zero-day indicator tespit edildi, kapsamlı güvenlik audit yapın");
    }

    return recommendations;
  }

  /**
   * Mitigation steps oluşturur
   */
  private generateMitigationSteps(
    indicators: ZeroDayIndicator[],
    image: ImageRiskDocument
  ): string[] {
    const steps: string[] = [];

    steps.push("Image'i production'dan geçici olarak kaldırın veya izole edin");
    steps.push("Güvenlik ekibi ile acil toplantı yapın");
    steps.push("CVE veritabanını güncelleyin ve yeniden tarayın");

    if (image.riskFactors.includes("Uses latest tag")) {
      steps.push("Latest tag yerine güvenli bir versiyon kullanın");
    }

    if (image.riskFactors.includes("Uses root user")) {
      steps.push("Non-root user ile yeniden build edin");
    }

    steps.push("Güvenlik yamalarını uygulayın");
    steps.push("Test ortamında doğrulama yapın");

    return steps;
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.detectionModel !== null;
  }
}

