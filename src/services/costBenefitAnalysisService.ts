import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface CostBenefitAnalysis {
  imageName: string;
  remediationCost: {
    timeCost: number; // Saat cinsinden
    resourceCost: number; // $ cinsinden
    opportunityCost: number; // $ cinsinden
    totalCost: number; // $ cinsinden
  };
  benefit: {
    riskReduction: number; // Risk skoru azalması
    securityImprovement: number; // 0-100
    complianceGain: number; // 0-100
    incidentPrevention: number; // Potansiyel incident maliyeti ($)
    totalBenefit: number; // $ cinsinden
  };
  roi: number; // Return on Investment (%)
  paybackPeriod: number; // Gün cinsinden
  recommendation: "HIGHLY_RECOMMENDED" | "RECOMMENDED" | "NEUTRAL" | "NOT_RECOMMENDED";
  reasoning: string;
  factors: {
    name: string;
    impact: "POSITIVE" | "NEGATIVE";
    value: number;
  }[];
}

export class CostBenefitAnalysisService {
  private costModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Cost-benefit modelini eğitir
   */
  async trainModel(): Promise<void> {
    try {
      logger.info("Cost-benefit analysis modeli eğitiliyor...");

      const trainingData = this.generateTrainingData();

      this.costModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [10],
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
            activation: "linear", // ROI prediction
          }),
        ],
      });

      this.costModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "meanSquaredError",
        metrics: ["meanAbsoluteError"],
      });

      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1]);

      await this.costModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Cost-benefit analysis modeli eğitimi tamamlandı");
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
      const riskScore = Math.random() * 100;
      const riskReduction = Math.random() * 50;
      const effort = Math.random();
      const podCount = Math.random() * 20;
      const prodPods = Math.random() > 0.5 ? 1 : 0;
      const incidentCost = Math.random() * 100000;
      const timeCost = Math.random() * 40;
      const resourceCost = Math.random() * 5000;
      const complianceRisk = Math.random();
      const securityImpact = Math.random();

      features.push([
        riskScore / 100,
        riskReduction / 50,
        effort,
        Math.min(podCount / 20, 1),
        prodPods,
        Math.min(incidentCost / 100000, 1),
        Math.min(timeCost / 40, 1),
        Math.min(resourceCost / 5000, 1),
        complianceRisk,
        securityImpact,
      ]);

      // ROI label: (benefit - cost) / cost * 100
      const benefit = riskReduction * 1000 + incidentCost * 0.1;
      const cost = timeCost * 100 + resourceCost;
      const roi = cost > 0 ? ((benefit - cost) / cost) * 100 : 0;

      labels.push(Math.max(-100, Math.min(500, roi)) / 100); // Normalize
    }

    return { features, labels };
  }

  /**
   * Cost-benefit analizi yapar
   */
  async analyze(
    image: ImageRiskDocument,
    estimatedRiskReduction: number,
    estimatedEffort: "LOW" | "MEDIUM" | "HIGH"
  ): Promise<CostBenefitAnalysis> {
    // Remediation cost hesapla
    const remediationCost = this.calculateRemediationCost(image, estimatedEffort);

    // Benefit hesapla
    const benefit = this.calculateBenefit(image, estimatedRiskReduction);

    // ROI hesapla
    const roi = this.calculateROI(remediationCost.totalCost, benefit.totalBenefit);

    // Payback period
    const paybackPeriod = this.calculatePaybackPeriod(
      remediationCost.totalCost,
      benefit.totalBenefit
    );

    // Recommendation
    const recommendation = this.determineRecommendation(roi, paybackPeriod, image);

    // Reasoning
    const reasoning = this.generateReasoning(roi, paybackPeriod, benefit, remediationCost);

    // Factors
    const factors = this.analyzeFactors(image, benefit, remediationCost);

    return {
      imageName: image.imageName,
      remediationCost,
      benefit,
      roi,
      paybackPeriod,
      recommendation,
      reasoning,
      factors,
    };
  }

  /**
   * Remediation cost hesaplar
   */
  private calculateRemediationCost(
    image: ImageRiskDocument,
    effort: "LOW" | "MEDIUM" | "HIGH"
  ): CostBenefitAnalysis["remediationCost"] {
    const effortHours = { LOW: 2, MEDIUM: 8, HIGH: 24 };
    const hours = effortHours[effort];

    // Time cost (engineer saat ücreti: $100/saat)
    const timeCost = hours;
    const timeCostDollar = hours * 100;

    // Resource cost (compute, storage, etc.)
    const podCount = image.pods.length;
    const resourceCost = podCount * 10; // $10 per pod

    // Opportunity cost (diğer işlerden vazgeçilen fayda)
    const opportunityCost = hours * 50; // $50/saat opportunity cost

    const totalCost = timeCostDollar + resourceCost + opportunityCost;

    return {
      timeCost: hours,
      resourceCost,
      opportunityCost,
      totalCost: Math.round(totalCost),
    };
  }

  /**
   * Benefit hesaplar
   */
  private calculateBenefit(
    image: ImageRiskDocument,
    riskReduction: number
  ): CostBenefitAnalysis["benefit"] {
    // Security improvement
    const securityImprovement = Math.min(100, riskReduction * 2);

    // Compliance gain
    const complianceGain = image.riskLevel === "CRITICAL" || image.riskLevel === "HIGH"
      ? Math.min(100, riskReduction * 1.5)
      : Math.min(100, riskReduction * 1.2);

    // Incident prevention cost
    // Ortalama security incident maliyeti: $100,000
    const baseIncidentCost = 100000;
    const incidentProbability = image.riskScore / 100; // Risk skoruna göre probability
    const incidentPrevention = baseIncidentCost * incidentProbability * (riskReduction / 100);

    // Total benefit
    const totalBenefit = incidentPrevention + (securityImprovement * 100) + (complianceGain * 50);

    return {
      riskReduction: Math.round(riskReduction),
      securityImprovement: Math.round(securityImprovement),
      complianceGain: Math.round(complianceGain),
      incidentPrevention: Math.round(incidentPrevention),
      totalBenefit: Math.round(totalBenefit),
    };
  }

  /**
   * ROI hesaplar
   */
  private calculateROI(cost: number, benefit: number): number {
    if (cost === 0) return benefit > 0 ? 1000 : 0;
    return ((benefit - cost) / cost) * 100;
  }

  /**
   * Payback period hesaplar
   */
  private calculatePaybackPeriod(cost: number, benefit: number): number {
    if (benefit <= 0) return Infinity;
    // Aylık benefit (basit hesaplama)
    const monthlyBenefit = benefit / 12;
    if (monthlyBenefit <= 0) return Infinity;
    const months = cost / monthlyBenefit;
    return Math.round(months * 30); // Gün cinsinden
  }

  /**
   * Recommendation belirler
   */
  private determineRecommendation(
    roi: number,
    paybackPeriod: number,
    image: ImageRiskDocument
  ): "HIGHLY_RECOMMENDED" | "RECOMMENDED" | "NEUTRAL" | "NOT_RECOMMENDED" {
    if (roi > 200 && paybackPeriod < 30) return "HIGHLY_RECOMMENDED";
    if (roi > 100 && paybackPeriod < 90) return "RECOMMENDED";
    if (roi > 0 && paybackPeriod < 180) return "NEUTRAL";
    if (image.riskLevel === "CRITICAL" && roi > -50) return "RECOMMENDED"; // Critical için daha esnek
    return "NOT_RECOMMENDED";
  }

  /**
   * Reasoning oluşturur
   */
  private generateReasoning(
    roi: number,
    paybackPeriod: number,
    benefit: CostBenefitAnalysis["benefit"],
    cost: CostBenefitAnalysis["remediationCost"]
  ): string {
    const reasons: string[] = [];

    if (roi > 100) {
      reasons.push(`Yüksek ROI (${roi.toFixed(1)}%)`);
    }

    if (paybackPeriod < 30) {
      reasons.push(`Hızlı geri dönüş (${paybackPeriod} gün)`);
    }

    if (benefit.incidentPrevention > cost.totalCost * 2) {
      reasons.push(`Yüksek incident önleme değeri ($${benefit.incidentPrevention.toLocaleString()})`);
    }

    if (benefit.securityImprovement > 50) {
      reasons.push(`Önemli güvenlik iyileştirmesi (${benefit.securityImprovement}%)`);
    }

    return reasons.length > 0
      ? `Cost-benefit analizi: ${reasons.join(", ")}`
      : "Cost-benefit analizi: Nötr";
  }

  /**
   * Factors analizi
   */
  private analyzeFactors(
    image: ImageRiskDocument,
    benefit: CostBenefitAnalysis["benefit"],
    cost: CostBenefitAnalysis["remediationCost"]
  ): Array<{ name: string; impact: "POSITIVE" | "NEGATIVE"; value: number }> {
    const factors: Array<{ name: string; impact: "POSITIVE" | "NEGATIVE"; value: number }> = [];

    // Positive factors
    if (benefit.incidentPrevention > 50000) {
      factors.push({
        name: "Yüksek Incident Önleme Değeri",
        impact: "POSITIVE",
        value: benefit.incidentPrevention,
      });
    }

    if (benefit.securityImprovement > 50) {
      factors.push({
        name: "Yüksek Güvenlik İyileştirmesi",
        impact: "POSITIVE",
        value: benefit.securityImprovement,
      });
    }

    // Negative factors
    if (cost.totalCost > 10000) {
      factors.push({
        name: "Yüksek Remediation Maliyeti",
        impact: "NEGATIVE",
        value: cost.totalCost,
      });
    }

    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    if (prodPods > 0 && cost.totalCost > 5000) {
      factors.push({
        name: "Production Ortamı Yüksek Maliyet",
        impact: "NEGATIVE",
        value: cost.totalCost * 1.5,
      });
    }

    return factors;
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.costModel !== null;
  }
}

