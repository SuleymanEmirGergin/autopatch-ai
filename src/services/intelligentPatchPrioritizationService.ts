import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { SBOMModel } from "../persistence/sbom.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface Patch {
  patchId: string;
  cveId?: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  affectedPackage: string;
  fixedVersion: string;
  currentVersion?: string;
}

export interface PrioritizedPatch extends Patch {
  aiPriority: number; // 0-10
  urgency: "IMMEDIATE" | "HIGH" | "MEDIUM" | "LOW";
  estimatedRiskReduction: number;
  estimatedEffort: "LOW" | "MEDIUM" | "HIGH";
  affectedImages: string[];
  exploitability: number; // 0-100
  impact: number; // 0-100
  cvssScore?: number;
  reasoning: string;
  recommendedSchedule: Date;
}

export class IntelligentPatchPrioritizationService {
  private priorityModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Patch prioritization modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Intelligent patch prioritization modeli eğitiliyor...");

      const trainingData = this.generateTrainingData();

      this.priorityModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [12],
            units: 64,
            activation: "relu",
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: "relu",
          }),
          tf.layers.dense({
            units: 1,
            activation: "sigmoid", // Priority score (0-1)
          }),
        ],
      });

      this.priorityModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
      });

      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1]);

      await this.priorityModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Intelligent patch prioritization modeli eğitimi tamamlandı");
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
      const severity = Math.random();
      const cvssScore = Math.random() * 10;
      const exploitability = Math.random();
      const impact = Math.random();
      const affectedImages = Math.random() * 20;
      const prodImpact = Math.random() > 0.5 ? 1 : 0;
      const hasExploit = Math.random() > 0.7 ? 1 : 0;
      const patchAge = Math.random(); // Days since patch released
      const effort = Math.random();
      const riskReduction = Math.random() * 50;
      const complianceRisk = Math.random();
      const businessCritical = Math.random() > 0.6 ? 1 : 0;

      features.push([
        severity,
        cvssScore / 10,
        exploitability,
        impact,
        Math.min(affectedImages / 20, 1),
        prodImpact,
        hasExploit,
        Math.min(patchAge, 1),
        effort,
        riskReduction / 50,
        complianceRisk,
        businessCritical,
      ]);

      // Priority label
      let priority = severity;
      if (hasExploit) priority += 0.2;
      if (prodImpact) priority += 0.15;
      if (cvssScore > 7) priority += 0.1;
      if (businessCritical) priority += 0.1;
      priority = Math.min(1.0, priority);

      labels.push(priority);
    }

    return { features, labels };
  }

  /**
   * Patch'leri önceliklendirir
   */
  async prioritizePatches(
    patches: Patch[],
    clusterId?: string
  ): Promise<PrioritizedPatch[]> {
    const prioritized: PrioritizedPatch[] = [];

    for (const patch of patches) {
      // Affected images bul
      const affectedImages = await this.findAffectedImages(patch, clusterId);

      // AI priority hesapla
      const aiPriority = await this.calculateAIPriority(patch, affectedImages);
      const urgency = this.determineUrgency(aiPriority, patch.severity);
      const estimatedRiskReduction = this.estimateRiskReduction(patch, affectedImages);
      const estimatedEffort = this.estimateEffort(patch);
      const exploitability = this.calculateExploitability(patch);
      const impact = this.calculateImpact(patch, affectedImages);
      const reasoning = this.generateReasoning(patch, aiPriority, affectedImages);
      const recommendedSchedule = this.calculateRecommendedSchedule(
        urgency,
        patch.severity
      );

      prioritized.push({
        ...patch,
        aiPriority,
        urgency,
        estimatedRiskReduction,
        estimatedEffort,
        affectedImages: affectedImages.map(img => img.imageName),
        exploitability,
        impact,
        reasoning,
        recommendedSchedule,
      });
    }

    // AI priority'ye göre sırala
    return prioritized.sort((a, b) => b.aiPriority - a.aiPriority);
  }

  /**
   * Affected images bulur
   */
  private async findAffectedImages(
    patch: Patch,
    clusterId?: string
  ): Promise<ImageRiskDocument[]> {
    const images: ImageRiskDocument[] = [];

    if (patch.cveId) {
      // SBOM'dan CVE'yi içeren image'leri bul
      const sbomDocs = await SBOMModel.find({
        "vulnerabilities.cveId": patch.cveId,
      }).exec();

      for (const sbom of sbomDocs) {
        const image = await ImageRiskModel.findOne({
          imageName: sbom.imageName,
          ...(clusterId && { clusterId }),
        }).exec();

        if (image) {
          images.push(image);
        }
      }
    } else {
      // Package-based search
      const sbomDocs = await SBOMModel.find({
        "packages.name": patch.affectedPackage,
      }).exec();

      for (const sbom of sbomDocs) {
        const image = await ImageRiskModel.findOne({
          imageName: sbom.imageName,
          ...(clusterId && { clusterId }),
        }).exec();

        if (image) {
          images.push(image);
        }
      }
    }

    return images;
  }

  /**
   * AI priority hesaplar
   */
  private async calculateAIPriority(
    patch: Patch,
    affectedImages: ImageRiskDocument[]
  ): Promise<number> {
    if (!this.isModelTrained || !this.priorityModel) {
      return this.ruleBasedPriority(patch, affectedImages);
    }

    try {
      const features = this.extractPatchFeatures(patch, affectedImages);
      const featuresTensor = tf.tensor2d([features]);

      const prediction = this.priorityModel.predict(featuresTensor) as tf.Tensor;
      const priority = (await prediction.data())[0];
      prediction.dispose();
      featuresTensor.dispose();

      return priority * 10; // 0-1'den 0-10'a scale
    } catch (error) {
      logger.error("AI priority hesaplama hatası:", error);
      return this.ruleBasedPriority(patch, affectedImages);
    }
  }

  /**
   * Patch features çıkarır
   */
  private extractPatchFeatures(
    patch: Patch,
    affectedImages: ImageRiskDocument[]
  ): number[] {
    const severityMap = { CRITICAL: 1.0, HIGH: 0.75, MEDIUM: 0.5, LOW: 0.25 };
    const prodImages = affectedImages.filter(img => {
      const prodPods = img.pods.filter(p => {
        const ns = p.namespace.toLowerCase();
        return ns === "prod" || ns.startsWith("prod-");
      });
      return prodPods.length > 0;
    });

    return [
      severityMap[patch.severity],
      0, // CVSS score (placeholder)
      Math.random(), // Exploitability (placeholder)
      Math.random(), // Impact (placeholder)
      Math.min(affectedImages.length / 20, 1),
      prodImages.length > 0 ? 1 : 0,
      0, // Has exploit (placeholder)
      Math.random(), // Patch age (placeholder)
      Math.random(), // Effort (placeholder)
      Math.random(), // Risk reduction (placeholder)
      Math.random(), // Compliance risk (placeholder)
      prodImages.length > 0 ? 1 : 0, // Business critical
    ];
  }

  /**
   * Rule-based priority (fallback)
   */
  private ruleBasedPriority(
    patch: Patch,
    affectedImages: ImageRiskDocument[]
  ): number {
    let priority = 5; // Base

    // Severity
    const severityMap = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
    priority += severityMap[patch.severity];

    // Affected images count
    priority += Math.min(affectedImages.length / 5, 2);

    // Prod impact
    const prodImages = affectedImages.filter(img => {
      const prodPods = img.pods.filter(p => {
        const ns = p.namespace.toLowerCase();
        return ns === "prod" || ns.startsWith("prod-");
      });
      return prodPods.length > 0;
    });

    if (prodImages.length > 0) priority += 2;

    return Math.min(10, Math.max(0, priority));
  }

  /**
   * Urgency belirler
   */
  private determineUrgency(
    aiPriority: number,
    severity: string
  ): "IMMEDIATE" | "HIGH" | "MEDIUM" | "LOW" {
    if (aiPriority >= 8 || severity === "CRITICAL") return "IMMEDIATE";
    if (aiPriority >= 6 || severity === "HIGH") return "HIGH";
    if (aiPriority >= 4 || severity === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  /**
   * Risk reduction tahmini
   */
  private estimateRiskReduction(
    patch: Patch,
    affectedImages: ImageRiskDocument[]
  ): number {
    const severityMap = { CRITICAL: 40, HIGH: 25, MEDIUM: 15, LOW: 5 };
    let reduction = severityMap[patch.severity];

    // Affected images sayısına göre artır
    reduction += Math.min(affectedImages.length * 2, 20);

    return Math.min(60, reduction);
  }

  /**
   * Effort tahmini
   */
  private estimateEffort(patch: Patch): "LOW" | "MEDIUM" | "HIGH" {
    if (patch.severity === "CRITICAL") return "HIGH";
    if (patch.severity === "HIGH") return "MEDIUM";
    return "LOW";
  }

  /**
   * Exploitability hesaplar
   */
  private calculateExploitability(patch: Patch): number {
    const severityMap = { CRITICAL: 90, HIGH: 70, MEDIUM: 50, LOW: 30 };
    return severityMap[patch.severity];
  }

  /**
   * Impact hesaplar
   */
  private calculateImpact(
    patch: Patch,
    affectedImages: ImageRiskDocument[]
  ): number {
    let impact = 50; // Base

    // Severity
    const severityMap = { CRITICAL: 30, HIGH: 20, MEDIUM: 10, LOW: 5 };
    impact += severityMap[patch.severity];

    // Affected images
    impact += Math.min(affectedImages.length * 3, 20);

    return Math.min(100, impact);
  }

  /**
   * Reasoning oluşturur
   */
  private generateReasoning(
    patch: Patch,
    aiPriority: number,
    affectedImages: ImageRiskDocument[]
  ): string {
    const reasons: string[] = [];

    if (aiPriority >= 8) {
      reasons.push("Yüksek AI öncelik skoru");
    }

    if (patch.severity === "CRITICAL") {
      reasons.push("Kritik severity");
    }

    if (affectedImages.length > 10) {
      reasons.push(`${affectedImages.length} image etkileniyor`);
    }

    const prodImages = affectedImages.filter(img => {
      const prodPods = img.pods.filter(p => {
        const ns = p.namespace.toLowerCase();
        return ns === "prod" || ns.startsWith("prod-");
      });
      return prodPods.length > 0;
    });

    if (prodImages.length > 0) {
      reasons.push(`${prodImages.length} production image etkileniyor`);
    }

    return reasons.length > 0
      ? `AI önceliklendirme: ${reasons.join(", ")}`
      : "Normal öncelik";
  }

  /**
   * Recommended schedule hesaplar
   */
  private calculateRecommendedSchedule(
    urgency: string,
    severity: string
  ): Date {
    const now = new Date();

    if (urgency === "IMMEDIATE" || severity === "CRITICAL") {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 gün sonra
    }

    if (urgency === "HIGH" || severity === "HIGH") {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 gün sonra
    }

    if (urgency === "MEDIUM" || severity === "MEDIUM") {
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 gün sonra
    }

    return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 gün sonra
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.priorityModel !== null;
  }
}

