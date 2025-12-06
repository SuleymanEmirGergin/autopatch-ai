import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface HealthScore {
  overallScore: number; // 0-100, 100 = perfect health
  categoryScores: {
    security: number;
    freshness: number;
    compliance: number;
    stability: number;
  };
  factors: {
    name: string;
    impact: number; // Positive or negative impact on health
    explanation: string;
  }[];
  recommendations: string[];
  trend: "IMPROVING" | "STABLE" | "DETERIORATING";
}

export class ImageHealthScoreService {
  private healthModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Health score modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Image health score modeli eğitiliyor...");

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
        const featureVector = this.extractHealthFeatures(img);
        features.push(featureVector);

        // Health score label (risk score'u tersine çevir)
        const healthScore = 100 - img.riskScore;
        labels.push(healthScore / 100); // Normalize
      });

      this.healthModel = tf.sequential({
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
            activation: "sigmoid", // Health score (0-1)
          }),
        ],
      });

      this.healthModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "meanSquaredError",
        metrics: ["meanAbsoluteError"],
      });

      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels, [labels.length, 1]);

      await this.healthModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Image health score modeli eğitimi tamamlandı");
    } catch (error) {
      logger.error("Model eğitimi sırasında hata:", error);
      this.isModelTrained = false;
    }
  }

  /**
   * Health features çıkarır
   */
  private extractHealthFeatures(image: ImageRiskDocument): number[] {
    const features: number[] = [];

    // Risk skoru (tersine çevrilmiş)
    features.push((100 - image.riskScore) / 100);

    // Risk faktör sayısı (tersine çevrilmiş)
    features.push(1 - Math.min(image.riskFactors.length / 8, 1));

    // Risk level (tersine çevrilmiş)
    const riskLevelMap = { LOW: 1.0, MEDIUM: 0.75, HIGH: 0.5, CRITICAL: 0.25 };
    features.push(riskLevelMap[image.riskLevel] || 0.5);

    // Pod sayısı (daha fazla pod = daha yaygın kullanım = daha sağlıklı olabilir)
    features.push(Math.min(image.pods.length / 10, 1));

    // Namespace sayısı
    const uniqueNamespaces = new Set(image.pods.map(p => p.namespace)).size;
    features.push(Math.min(uniqueNamespaces / 5, 1));

    // Risk faktörleri (binary flags, tersine çevrilmiş)
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

    riskFactorFlags.forEach(factor => {
      features.push(image.riskFactors.includes(factor) ? 0 : 1); // Inverted
    });

    return features;
  }

  /**
   * Image için health score hesaplar
   */
  async calculateHealthScore(
    image: ImageRiskDocument
  ): Promise<HealthScore> {
    // Category scores
    const securityScore = this.calculateSecurityScore(image);
    const freshnessScore = this.calculateFreshnessScore(image);
    const complianceScore = this.calculateComplianceScore(image);
    const stabilityScore = this.calculateStabilityScore(image);

    // Overall score (weighted average)
    const overallScore = (
      securityScore * 0.4 +
      freshnessScore * 0.3 +
      complianceScore * 0.2 +
      stabilityScore * 0.1
    );

    // Factors
    const factors = this.analyzeHealthFactors(image);

    // Recommendations
    const recommendations = this.generateHealthRecommendations(
      image,
      securityScore,
      freshnessScore,
      complianceScore,
      stabilityScore
    );

    // Trend (basit hesaplama)
    const trend = this.calculateTrend(image);

    return {
      overallScore: Math.round(overallScore),
      categoryScores: {
        security: Math.round(securityScore),
        freshness: Math.round(freshnessScore),
        compliance: Math.round(complianceScore),
        stability: Math.round(stabilityScore),
      },
      factors,
      recommendations,
      trend,
    };
  }

  /**
   * Security score hesaplar
   */
  private calculateSecurityScore(image: ImageRiskDocument): number {
    let score = 100;

    // Risk faktörlerine göre azalt
    if (image.riskFactors.includes("Uses root user")) score -= 30;
    if (image.riskFactors.includes("Uses latest tag")) score -= 25;
    if (image.riskFactors.includes("Uses unknown base image")) score -= 20;
    if (image.riskFactors.includes("Legacy image tag")) score -= 15;
    if (image.riskFactors.includes("Uses non-production tag")) score -= 10;

    // Risk skoruna göre azalt
    score -= image.riskScore * 0.3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Freshness score hesaplar
   */
  private calculateFreshnessScore(image: ImageRiskDocument): number {
    let score = 100;

    // Image yaşı
    const daysSinceScan = Math.floor(
      (Date.now() - image.lastScannedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceScan > 180) score -= 40;
    else if (daysSinceScan > 90) score -= 25;
    else if (daysSinceScan > 30) score -= 10;

    // Legacy tag
    if (image.riskFactors.includes("Legacy image tag")) score -= 20;

    // Old image
    if (image.riskFactors.includes("Image older than 180 days")) score -= 30;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Compliance score hesaplar
   */
  private calculateComplianceScore(image: ImageRiskDocument): number {
    let score = 100;

    // Production namespace'te risk faktörleri
    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    });

    if (prodPods.length > 0) {
      if (image.riskFactors.includes("Uses latest tag")) score -= 20;
      if (image.riskFactors.includes("Uses root user")) score -= 25;
      if (image.riskFactors.includes("Test image used in workload")) score -= 30;
      if (image.riskFactors.includes("Uses non-production tag")) score -= 15;
    }

    // Risk seviyesi
    if (image.riskLevel === "CRITICAL") score -= 30;
    else if (image.riskLevel === "HIGH") score -= 20;
    else if (image.riskLevel === "MEDIUM") score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Stability score hesaplar
   */
  private calculateStabilityScore(image: ImageRiskDocument): number {
    let score = 100;

    // Latest tag = unstable
    if (image.riskFactors.includes("Uses latest tag")) score -= 30;

    // Non-prod tag = unstable
    if (image.riskFactors.includes("Uses non-production tag")) score -= 20;

    // Test image = unstable
    if (image.riskFactors.includes("Test image used in workload")) score -= 25;

    // Pod sayısı (daha fazla pod = daha stabil olabilir)
    if (image.pods.length > 5) score += 10;
    if (image.pods.length > 10) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Health factors analizi
   */
  private analyzeHealthFactors(image: ImageRiskDocument): Array<{
    name: string;
    impact: number;
    explanation: string;
  }> {
    const factors: Array<{
      name: string;
      impact: number;
      explanation: string;
    }> = [];

    // Positive factors
    if (!image.riskFactors.includes("Uses latest tag")) {
      factors.push({
        name: "Versioned Tag",
        impact: 25,
        explanation: "Versioned tag kullanımı sağlık skorunu artırır",
      });
    }

    if (!image.riskFactors.includes("Uses root user")) {
      factors.push({
        name: "Non-Root User",
        impact: 30,
        explanation: "Non-root user kullanımı güvenlik skorunu artırır",
      });
    }

    if (image.pods.length > 5) {
      factors.push({
        name: "Wide Usage",
        impact: 10,
        explanation: "Yaygın kullanım stabiliteyi gösterir",
      });
    }

    // Negative factors
    if (image.riskFactors.includes("Uses latest tag")) {
      factors.push({
        name: "Latest Tag",
        impact: -25,
        explanation: "Latest tag kullanımı stabiliteyi azaltır",
      });
    }

    if (image.riskFactors.includes("Uses root user")) {
      factors.push({
        name: "Root User",
        impact: -30,
        explanation: "Root user kullanımı güvenlik riski oluşturur",
      });
    }

    if (image.riskScore > 60) {
      factors.push({
        name: "High Risk Score",
        impact: -20,
        explanation: "Yüksek risk skoru genel sağlığı etkiler",
      });
    }

    return factors;
  }

  /**
   * Health recommendations oluşturur
   */
  private generateHealthRecommendations(
    image: ImageRiskDocument,
    securityScore: number,
    freshnessScore: number,
    complianceScore: number,
    stabilityScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (securityScore < 50) {
      recommendations.push("Güvenlik skoru düşük, acil güvenlik iyileştirmeleri gerekli");
    }

    if (freshnessScore < 50) {
      recommendations.push("Image eski, güncelleme önerilir");
    }

    if (complianceScore < 50) {
      recommendations.push("Compliance skoru düşük, production ortamı için uygun değil");
    }

    if (stabilityScore < 50) {
      recommendations.push("Stabilite skoru düşük, versioned tag kullanılmalı");
    }

    if (image.riskFactors.includes("Uses latest tag")) {
      recommendations.push("Latest tag yerine versioned tag kullan");
    }

    if (image.riskFactors.includes("Uses root user")) {
      recommendations.push("Root user yerine non-root user kullan");
    }

    return recommendations;
  }

  /**
   * Trend hesaplar (basit)
   */
  private calculateTrend(image: ImageRiskDocument): "IMPROVING" | "STABLE" | "DETERIORATING" {
    // Basit hesaplama (gerçek kullanımda historical data kullanılır)
    if (image.riskScore < 30) return "IMPROVING";
    if (image.riskScore > 70) return "DETERIORATING";
    return "STABLE";
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.healthModel !== null;
  }
}

