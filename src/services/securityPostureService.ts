import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface SecurityPosture {
  overallScore: number; // 0-100
  categoryScores: {
    vulnerabilityManagement: number;
    accessControl: number;
    imageSecurity: number;
    runtimeSecurity: number;
    compliance: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trend: "IMPROVING" | "STABLE" | "DETERIORATING";
  benchmark: {
    industryAverage: number;
    bestPractice: number;
    gap: number;
  };
}

export interface ClusterSecurityPosture {
  clusterId: string;
  overallScore: number;
  imageCount: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryScores: SecurityPosture["categoryScores"];
  topRisks: Array<{
    imageName: string;
    riskScore: number;
    riskLevel: string;
  }>;
  recommendations: string[];
}

export class SecurityPostureService {
  private postureModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Security posture modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Security posture modeli eğitiliyor...");

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
        const featureVector = this.extractPostureFeatures(img);
        features.push(featureVector);

        // Security posture label (risk score'u tersine çevir)
        const postureScore = 100 - img.riskScore;
        labels.push(postureScore / 100);
      });

      this.postureModel = tf.sequential({
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

      this.postureModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "meanSquaredError",
        metrics: ["meanAbsoluteError"],
      });

      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels, [labels.length, 1]);

      await this.postureModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Security posture modeli eğitimi tamamlandı");
    } catch (error) {
      logger.error("Model eğitimi sırasında hata:", error);
      this.isModelTrained = false;
    }
  }

  /**
   * Posture features çıkarır
   */
  private extractPostureFeatures(image: ImageRiskDocument): number[] {
    const features: number[] = [];

    // Vulnerability management
    const hasLatestTag = image.riskFactors.includes("Uses latest tag") ? 0 : 1;
    const hasOldImage = image.riskFactors.includes("Image older than 180 days") ? 0 : 1;
    features.push((hasLatestTag + hasOldImage) / 2);

    // Access control
    const hasRootUser = image.riskFactors.includes("Uses root user") ? 0 : 1;
    features.push(hasRootUser);

    // Image security
    const hasUnknownBase = image.riskFactors.includes("Uses unknown base image") ? 0 : 1;
    const hasNonProdTag = image.riskFactors.includes("Uses non-production tag") ? 0 : 1;
    features.push((hasUnknownBase + hasNonProdTag) / 2);

    // Runtime security
    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;
    const runtimeSecurity = prodPods > 0 && image.riskScore > 50 ? 0.3 : 0.8;
    features.push(runtimeSecurity);

    // Compliance
    const complianceScore = image.riskLevel === "CRITICAL" ? 0.2 :
      image.riskLevel === "HIGH" ? 0.4 :
      image.riskLevel === "MEDIUM" ? 0.7 : 1.0;
    features.push(complianceScore);

    // Risk score (normalize, tersine çevrilmiş)
    features.push((100 - image.riskScore) / 100);

    // Risk factor count (tersine çevrilmiş)
    features.push(1 - Math.min(image.riskFactors.length / 8, 1));

    return features;
  }

  /**
   * Image için security posture hesaplar
   */
  async calculatePosture(
    image: ImageRiskDocument
  ): Promise<SecurityPosture> {
    // Category scores
    const vulnerabilityManagement = this.calculateVulnerabilityManagement(image);
    const accessControl = this.calculateAccessControl(image);
    const imageSecurity = this.calculateImageSecurity(image);
    const runtimeSecurity = this.calculateRuntimeSecurity(image);
    const compliance = this.calculateCompliance(image);

    // Overall score (weighted average)
    const overallScore = (
      vulnerabilityManagement * 0.25 +
      accessControl * 0.20 +
      imageSecurity * 0.25 +
      runtimeSecurity * 0.15 +
      compliance * 0.15
    );

    // Strengths
    const strengths = this.identifyStrengths(image, {
      vulnerabilityManagement,
      accessControl,
      imageSecurity,
      runtimeSecurity,
      compliance,
    });

    // Weaknesses
    const weaknesses = this.identifyWeaknesses(image, {
      vulnerabilityManagement,
      accessControl,
      imageSecurity,
      runtimeSecurity,
      compliance,
    });

    // Recommendations
    const recommendations = this.generatePostureRecommendations(
      image,
      {
        vulnerabilityManagement,
        accessControl,
        imageSecurity,
        runtimeSecurity,
        compliance,
      }
    );

    // Trend (basit hesaplama)
    const trend = this.calculatePostureTrend(image);

    // Benchmark
    const benchmark = {
      industryAverage: 65,
      bestPractice: 85,
      gap: 85 - overallScore,
    };

    return {
      overallScore: Math.round(overallScore),
      categoryScores: {
        vulnerabilityManagement: Math.round(vulnerabilityManagement),
        accessControl: Math.round(accessControl),
        imageSecurity: Math.round(imageSecurity),
        runtimeSecurity: Math.round(runtimeSecurity),
        compliance: Math.round(compliance),
      },
      strengths,
      weaknesses,
      recommendations,
      trend,
      benchmark,
    };
  }

  /**
   * Vulnerability management score
   */
  private calculateVulnerabilityManagement(image: ImageRiskDocument): number {
    let score = 100;

    if (image.riskFactors.includes("Uses latest tag")) score -= 30;
    if (image.riskFactors.includes("Image older than 180 days")) score -= 25;
    if (image.riskFactors.includes("Legacy image tag")) score -= 20;

    return Math.max(0, score);
  }

  /**
   * Access control score
   */
  private calculateAccessControl(image: ImageRiskDocument): number {
    let score = 100;

    if (image.riskFactors.includes("Uses root user")) score -= 40;
    if (image.riskFactors.includes("Uses unknown base image")) score -= 20;

    return Math.max(0, score);
  }

  /**
   * Image security score
   */
  private calculateImageSecurity(image: ImageRiskDocument): number {
    let score = 100;

    if (image.riskFactors.includes("Uses non-production tag")) score -= 25;
    if (image.riskFactors.includes("Test image used in workload")) score -= 30;
    if (image.riskFactors.includes("Uses unknown base image")) score -= 20;

    return Math.max(0, score);
  }

  /**
   * Runtime security score
   */
  private calculateRuntimeSecurity(image: ImageRiskDocument): number {
    let score = 100;

    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    if (prodPods > 0) {
      if (image.riskScore > 70) score -= 40;
      else if (image.riskScore > 50) score -= 25;
      else if (image.riskScore > 30) score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Compliance score
   */
  private calculateCompliance(image: ImageRiskDocument): number {
    let score = 100;

    if (image.riskLevel === "CRITICAL") score -= 50;
    else if (image.riskLevel === "HIGH") score -= 30;
    else if (image.riskLevel === "MEDIUM") score -= 15;

    if (image.riskFactors.length > 5) score -= 20;

    return Math.max(0, score);
  }

  /**
   * Strengths belirler
   */
  private identifyStrengths(
    image: ImageRiskDocument,
    scores: SecurityPosture["categoryScores"]
  ): string[] {
    const strengths: string[] = [];

    if (scores.accessControl > 80) {
      strengths.push("Güçlü erişim kontrolü (non-root user)");
    }

    if (scores.vulnerabilityManagement > 80) {
      strengths.push("İyi güvenlik açığı yönetimi");
    }

    if (!image.riskFactors.includes("Uses latest tag")) {
      strengths.push("Versioned tag kullanımı");
    }

    if (image.riskScore < 30) {
      strengths.push("Düşük risk seviyesi");
    }

    return strengths;
  }

  /**
   * Weaknesses belirler
   */
  private identifyWeaknesses(
    image: ImageRiskDocument,
    scores: SecurityPosture["categoryScores"]
  ): string[] {
    const weaknesses: string[] = [];

    if (scores.accessControl < 50) {
      weaknesses.push("Zayıf erişim kontrolü (root user kullanımı)");
    }

    if (scores.vulnerabilityManagement < 50) {
      weaknesses.push("Zayıf güvenlik açığı yönetimi");
    }

    if (image.riskFactors.includes("Uses latest tag")) {
      weaknesses.push("Latest tag kullanımı (değişken versiyon)");
    }

    if (image.riskLevel === "CRITICAL" || image.riskLevel === "HIGH") {
      weaknesses.push("Yüksek risk seviyesi");
    }

    return weaknesses;
  }

  /**
   * Recommendations oluşturur
   */
  private generatePostureRecommendations(
    image: ImageRiskDocument,
    scores: SecurityPosture["categoryScores"]
  ): string[] {
    const recommendations: string[] = [];

    if (scores.vulnerabilityManagement < 60) {
      recommendations.push("Image güncellemelerini düzenli yapın");
    }

    if (scores.accessControl < 60) {
      recommendations.push("Root user kullanımını kaldırın");
    }

    if (scores.imageSecurity < 60) {
      recommendations.push("Production-ready image'ler kullanın");
    }

    if (scores.compliance < 60) {
      recommendations.push("Compliance gereksinimlerini karşılayın");
    }

    return recommendations;
  }

  /**
   * Trend hesaplar
   */
  private calculatePostureTrend(image: ImageRiskDocument): "IMPROVING" | "STABLE" | "DETERIORATING" {
    // Basit hesaplama (gerçek kullanımda historical data gerekir)
    if (image.riskScore < 30) return "IMPROVING";
    if (image.riskScore > 70) return "DETERIORATING";
    return "STABLE";
  }

  /**
   * Cluster security posture hesaplar
   */
  async calculateClusterPosture(
    clusterId: string
  ): Promise<ClusterSecurityPosture> {
    const images = await ImageRiskModel.find({ clusterId }).exec();

    if (images.length === 0) {
      return {
        clusterId,
        overallScore: 0,
        imageCount: 0,
        riskDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
        categoryScores: {
          vulnerabilityManagement: 0,
          accessControl: 0,
          imageSecurity: 0,
          runtimeSecurity: 0,
          compliance: 0,
        },
        topRisks: [],
        recommendations: [],
      };
    }

    // Individual postures hesapla
    const postures = await Promise.all(
      images.map(img => this.calculatePosture(img))
    );

    // Average scores
    const avgScores = {
      vulnerabilityManagement: postures.reduce((sum, p) => sum + p.categoryScores.vulnerabilityManagement, 0) / postures.length,
      accessControl: postures.reduce((sum, p) => sum + p.categoryScores.accessControl, 0) / postures.length,
      imageSecurity: postures.reduce((sum, p) => sum + p.categoryScores.imageSecurity, 0) / postures.length,
      runtimeSecurity: postures.reduce((sum, p) => sum + p.categoryScores.runtimeSecurity, 0) / postures.length,
      compliance: postures.reduce((sum, p) => sum + p.categoryScores.compliance, 0) / postures.length,
    };

    const overallScore = (
      avgScores.vulnerabilityManagement * 0.25 +
      avgScores.accessControl * 0.20 +
      avgScores.imageSecurity * 0.25 +
      avgScores.runtimeSecurity * 0.15 +
      avgScores.compliance * 0.15
    );

    // Risk distribution
    const riskDistribution = {
      critical: images.filter(img => img.riskLevel === "CRITICAL").length,
      high: images.filter(img => img.riskLevel === "HIGH").length,
      medium: images.filter(img => img.riskLevel === "MEDIUM").length,
      low: images.filter(img => img.riskLevel === "LOW").length,
    };

    // Top risks
    const topRisks = images
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)
      .map(img => ({
        imageName: img.imageName,
        riskScore: img.riskScore,
        riskLevel: img.riskLevel,
      }));

    // Recommendations
    const recommendations: string[] = [];
    if (riskDistribution.critical > 0) {
      recommendations.push(`${riskDistribution.critical} kritik riskli image acil ele alınmalı`);
    }
    if (avgScores.vulnerabilityManagement < 60) {
      recommendations.push("Güvenlik açığı yönetimi iyileştirilmeli");
    }
    if (avgScores.accessControl < 60) {
      recommendations.push("Erişim kontrolü güçlendirilmeli");
    }

    return {
      clusterId,
      overallScore: Math.round(overallScore),
      imageCount: images.length,
      riskDistribution,
      categoryScores: {
        vulnerabilityManagement: Math.round(avgScores.vulnerabilityManagement),
        accessControl: Math.round(avgScores.accessControl),
        imageSecurity: Math.round(avgScores.imageSecurity),
        runtimeSecurity: Math.round(avgScores.runtimeSecurity),
        compliance: Math.round(avgScores.compliance),
      },
      topRisks,
      recommendations,
    };
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.postureModel !== null;
  }
}

