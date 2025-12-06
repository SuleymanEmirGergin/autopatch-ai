import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { AnomalyModel } from "../persistence/anomaly.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface Alert {
  id: string;
  type: "RISK_SPIKE" | "ANOMALY" | "CRITICAL_RISK" | "COMPLIANCE_VIOLATION";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  imageName: string;
  message: string;
  timestamp: Date;
  metadata?: any;
}

export interface PrioritizedAlert extends Alert {
  aiPriority: number; // 0-10, 10 = highest priority
  mlConfidence: number;
  urgency: "IMMEDIATE" | "HIGH" | "MEDIUM" | "LOW";
  estimatedImpact: number; // 0-100
  recommendedActions: string[];
  reasoning: string;
  similarAlerts: number; // Benzer alert sayısı
}

export class SmartAlertPrioritizationService {
  private priorityModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Alert prioritization modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Smart alert prioritization modeli eğitiliyor...");

      // Historical alerts ve outcomes'dan öğren
      const trainingData = this.generateTrainingData();

      this.priorityModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [12], // Feature vector size
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
      logger.info("Smart alert prioritization modeli eğitimi tamamlandı");
    } catch (error) {
      logger.error("Model eğitimi sırasında hata:", error);
      this.isModelTrained = false;
    }
  }

  /**
   * Synthetic training data oluşturur
   */
  private generateTrainingData(): { features: number[][]; labels: number[] } {
    const features: number[][] = [];
    const labels: number[] = [];

    for (let i = 0; i < 200; i++) {
      const riskScore = Math.random() * 100;
      const severity = Math.random();
      const alertType = Math.random();
      const hasProdPods = Math.random() > 0.5 ? 1 : 0;
      const podCount = Math.random() * 20;
      const riskFactorCount = Math.floor(Math.random() * 8);
      const isCritical = riskScore > 75 ? 1 : 0;
      const isHigh = riskScore > 50 ? 1 : 0;
      const daysSinceAlert = Math.random() * 7;
      const similarAlerts = Math.random() * 10;
      const hasAnomaly = Math.random() > 0.7 ? 1 : 0;
      const complianceRisk = Math.random();

      features.push([
        riskScore / 100,
        severity,
        alertType,
        hasProdPods,
        Math.min(podCount / 20, 1),
        riskFactorCount / 8,
        isCritical,
        isHigh,
        Math.min(daysSinceAlert / 7, 1),
        Math.min(similarAlerts / 10, 1),
        hasAnomaly,
        complianceRisk,
      ]);

      // Priority label: yüksek risk, prod, critical = yüksek priority
      let priority = riskScore / 100;
      if (hasProdPods) priority += 0.2;
      if (isCritical) priority += 0.2;
      if (hasAnomaly) priority += 0.1;
      priority = Math.min(1.0, priority);

      labels.push(priority);
    }

    return { features, labels };
  }

  /**
   * Alert'leri önceliklendirir
   */
  async prioritizeAlerts(
    alerts: Alert[],
    clusterId?: string
  ): Promise<PrioritizedAlert[]> {
    const prioritized: PrioritizedAlert[] = [];

    for (const alert of alerts) {
      // Image bilgisini al
      const image = await ImageRiskModel.findOne({
        imageName: alert.imageName,
        ...(clusterId && { clusterId }),
      }).exec();

      if (!image) {
        // Image yoksa basit prioritization
        prioritized.push({
          ...alert,
          aiPriority: this.ruleBasedPriority(alert, null),
          mlConfidence: 0.5,
          urgency: this.determineUrgency(alert.severity),
          estimatedImpact: 50,
          recommendedActions: [],
          reasoning: "Image bilgisi bulunamadı",
          similarAlerts: 0,
        });
        continue;
      }

      // AI priority hesapla
      const aiPriority = await this.calculateAIPriority(alert, image);
      const mlConfidence = this.calculateConfidence(alert, image);
      const urgency = this.determineUrgency(alert.severity, aiPriority);
      const estimatedImpact = this.estimateImpact(alert, image);
      const recommendedActions = this.generateRecommendedActions(alert, image);
      const reasoning = this.generateReasoning(alert, image, aiPriority);
      const similarAlerts = await this.countSimilarAlerts(alert, clusterId);

      prioritized.push({
        ...alert,
        aiPriority,
        mlConfidence,
        urgency,
        estimatedImpact,
        recommendedActions,
        reasoning,
        similarAlerts,
      });
    }

    // AI priority'ye göre sırala
    return prioritized.sort((a, b) => b.aiPriority - a.aiPriority);
  }

  /**
   * AI priority hesaplar
   */
  private async calculateAIPriority(
    alert: Alert,
    image: ImageRiskDocument
  ): Promise<number> {
    if (!this.isModelTrained || !this.priorityModel) {
      return this.ruleBasedPriority(alert, image);
    }

    try {
      const features = this.extractFeatures(alert, image);
      const featuresTensor = tf.tensor2d([features]);

      const prediction = this.priorityModel.predict(featuresTensor) as tf.Tensor;
      const priority = (await prediction.data())[0];
      prediction.dispose();
      featuresTensor.dispose();

      return priority * 10; // 0-1'den 0-10'a scale
    } catch (error) {
      logger.error("AI priority hesaplama hatası:", error);
      return this.ruleBasedPriority(alert, image);
    }
  }

  /**
   * Feature vector çıkarır
   */
  private extractFeatures(alert: Alert, image: ImageRiskDocument): number[] {
    const typeMap = {
      RISK_SPIKE: 0.25,
      ANOMALY: 0.5,
      CRITICAL_RISK: 0.75,
      COMPLIANCE_VIOLATION: 1.0,
    };

    const severityMap = {
      LOW: 0.25,
      MEDIUM: 0.5,
      HIGH: 0.75,
      CRITICAL: 1.0,
    };

    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    return [
      image.riskScore / 100,
      severityMap[alert.severity],
      typeMap[alert.type] || 0.5,
      prodPods > 0 ? 1 : 0,
      Math.min(image.pods.length / 20, 1),
      Math.min(image.riskFactors.length / 8, 1),
      image.riskLevel === "CRITICAL" ? 1 : 0,
      image.riskLevel === "HIGH" ? 1 : 0,
      Math.min((Date.now() - alert.timestamp.getTime()) / (1000 * 60 * 60 * 24 * 7), 1),
      0, // Similar alerts (calculated separately)
      image.riskFactors.includes("Uses root user") ? 1 : 0,
      image.riskFactors.includes("Uses latest tag") ? 1 : 0,
    ];
  }

  /**
   * Rule-based priority (fallback)
   */
  private ruleBasedPriority(alert: Alert, image: ImageRiskDocument | null): number {
    let priority = 5; // Base

    // Severity
    const severityMap = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
    priority += severityMap[alert.severity];

    // Type
    if (alert.type === "CRITICAL_RISK") priority += 2;
    if (alert.type === "ANOMALY") priority += 1;

    // Image risk
    if (image) {
      if (image.riskScore > 70) priority += 1;
      if (image.riskLevel === "CRITICAL") priority += 1;

      const prodPods = image.pods.filter(p => {
        const ns = p.namespace.toLowerCase();
        return ns === "prod" || ns.startsWith("prod-");
      }).length;

      if (prodPods > 0) priority += 1;
    }

    return Math.min(10, Math.max(0, priority));
  }

  /**
   * Confidence hesaplar
   */
  private calculateConfidence(alert: Alert, image: ImageRiskDocument): number {
    let confidence = 0.7;

    if (image.pods.length > 0) confidence += 0.1;
    if (image.riskFactors.length > 0) confidence += 0.1;
    if (alert.severity === "CRITICAL" || alert.severity === "HIGH") confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Urgency belirler
   */
  private determineUrgency(
    severity: string,
    aiPriority?: number
  ): "IMMEDIATE" | "HIGH" | "MEDIUM" | "LOW" {
    if (aiPriority !== undefined) {
      if (aiPriority >= 8) return "IMMEDIATE";
      if (aiPriority >= 6) return "HIGH";
      if (aiPriority >= 4) return "MEDIUM";
      return "LOW";
    }

    if (severity === "CRITICAL") return "IMMEDIATE";
    if (severity === "HIGH") return "HIGH";
    if (severity === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  /**
   * Impact tahmini
   */
  private estimateImpact(alert: Alert, image: ImageRiskDocument): number {
    let impact = 50; // Base

    // Risk score
    impact += image.riskScore * 0.3;

    // Pod count
    impact += Math.min(image.pods.length * 2, 20);

    // Prod pods
    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    if (prodPods > 0) impact += 20;

    return Math.min(100, Math.max(0, impact));
  }

  /**
   * Recommended actions
   */
  private generateRecommendedActions(
    alert: Alert,
    image: ImageRiskDocument
  ): string[] {
    const actions: string[] = [];

    if (alert.severity === "CRITICAL") {
      actions.push("Acil müdahale gerekli");
    }

    if (image.riskLevel === "CRITICAL") {
      actions.push("Image'i production'dan kaldır veya güncelle");
    }

    if (image.riskFactors.includes("Uses latest tag")) {
      actions.push("Versioned tag'e geç");
    }

    if (image.riskFactors.includes("Uses root user")) {
      actions.push("Non-root user kullan");
    }

    return actions;
  }

  /**
   * Reasoning oluşturur
   */
  private generateReasoning(
    alert: Alert,
    image: ImageRiskDocument,
    aiPriority: number
  ): string {
    const reasons: string[] = [];

    if (aiPriority >= 8) {
      reasons.push("Yüksek AI öncelik skoru");
    }

    if (image.riskScore > 70) {
      reasons.push(`Yüksek risk skoru (${image.riskScore})`);
    }

    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    if (prodPods > 0) {
      reasons.push(`${prodPods} production pod etkileniyor`);
    }

    if (alert.severity === "CRITICAL") {
      reasons.push("Kritik alert seviyesi");
    }

    return reasons.length > 0
      ? `AI önceliklendirme: ${reasons.join(", ")}`
      : "Normal öncelik";
  }

  /**
   * Benzer alert sayısı
   */
  private async countSimilarAlerts(
    alert: Alert,
    clusterId?: string
  ): Promise<number> {
    try {
      const similar = await AnomalyModel.countDocuments({
        imageName: alert.imageName,
        ...(clusterId && { clusterId }),
        detectedAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Son 24 saat
        },
      }).exec();

      return similar;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.priorityModel !== null;
  }
}

