import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { RemediationScript } from "../services/remediationScriptService";
import { RemediationSuccessPredictionService, SuccessPrediction } from "./remediationSuccessPredictionService";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface RemediationDecision {
  shouldRemediate: boolean;
  confidence: number;
  recommendedScript: RemediationScript | null;
  priority: "IMMEDIATE" | "HIGH" | "MEDIUM" | "LOW" | "DEFER";
  reasoning: string;
  estimatedRiskReduction: number;
  estimatedDowntime: number; // Dakika cinsinden
  rollbackPlan: string;
  factors: {
    name: string;
    impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    weight: number;
  }[];
}

export class AutoRemediationDecisionService {
  private decisionModel: tf.Sequential | null = null;
  private successPredictionService: RemediationSuccessPredictionService;
  private isModelTrained: boolean = false;

  constructor() {
    this.successPredictionService = new RemediationSuccessPredictionService();
  }

  /**
   * Decision modelini eğitir
   */
  async trainModel(): Promise<void> {
    try {
      logger.info("Auto-remediation decision modeli eğitiliyor...");

      const trainingData = this.generateTrainingData();

      this.decisionModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [15], // Feature vector size
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
            activation: "sigmoid", // Should remediate (0-1)
          }),
        ],
      });

      this.decisionModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
      });

      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1]);

      await this.decisionModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Auto-remediation decision modeli eğitimi tamamlandı");
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
      const successProb = Math.random();
      const prodPods = Math.random() > 0.5 ? 1 : 0;
      const podCount = Math.random() * 20;
      const riskFactorCount = Math.floor(Math.random() * 8);
      const isCritical = riskScore > 75 ? 1 : 0;
      const effort = Math.random();
      const businessHours = Math.random() > 0.5 ? 1 : 0;
      const hasBackup = Math.random() > 0.7 ? 1 : 0;
      const recentIncidents = Math.random() * 5;
      const complianceRisk = Math.random();
      const costImpact = Math.random();
      const userImpact = Math.random();
      const dataSensitivity = Math.random();
      const availability = Math.random();

      features.push([
        riskScore / 100,
        successProb,
        prodPods,
        Math.min(podCount / 20, 1),
        riskFactorCount / 8,
        isCritical,
        effort,
        businessHours,
        hasBackup,
        Math.min(recentIncidents / 5, 1),
        complianceRisk,
        costImpact,
        userImpact,
        dataSensitivity,
        availability,
      ]);

      // Label: should remediate?
      let shouldRemediate = 0;
      if (riskScore > 70 && successProb > 0.7) shouldRemediate = 1;
      else if (riskScore > 50 && successProb > 0.8 && hasBackup) shouldRemediate = 1;
      else if (isCritical && successProb > 0.6) shouldRemediate = 1;

      labels.push(shouldRemediate);
    }

    return { features, labels };
  }

  /**
   * Remediation kararı verir
   */
  async makeDecision(
    image: ImageRiskDocument,
    availableScripts: RemediationScript[]
  ): Promise<RemediationDecision> {
    if (availableScripts.length === 0) {
      return {
        shouldRemediate: false,
        confidence: 0,
        recommendedScript: null,
        priority: "DEFER",
        reasoning: "Remediation script'i mevcut değil",
        estimatedRiskReduction: 0,
        estimatedDowntime: 0,
        rollbackPlan: "N/A",
        factors: [],
      };
    }

    // Her script için success prediction yap
    const scriptEvaluations: Array<{
      script: RemediationScript;
      prediction: SuccessPrediction;
    }> = [];

    for (const script of availableScripts) {
      try {
        const prediction = await this.successPredictionService.predictSuccess(image, {
          type: script.scriptType.toUpperCase() as "BASH" | "KUBECTL" | "GITHUB_ACTIONS" | "GITLAB_CI",
          riskFactor: script.riskFactor,
          script: script.script,
        });
        scriptEvaluations.push({ script, prediction });
      } catch (error) {
        logger.error(`Script evaluation hatası:`, error);
      }
    }

    // En iyi script'i seç
    const bestScript = scriptEvaluations
      .sort((a, b) => b.prediction.successProbability - a.prediction.successProbability)[0];

    if (!bestScript) {
      return {
        shouldRemediate: false,
        confidence: 0,
        recommendedScript: null,
        priority: "DEFER",
        reasoning: "Script değerlendirmesi başarısız",
        estimatedRiskReduction: 0,
        estimatedDowntime: 0,
        rollbackPlan: "N/A",
        factors: [],
      };
    }

    // AI decision
    const shouldRemediate = await this.calculateShouldRemediate(
      image,
      bestScript.prediction
    );

    // Priority
    const priority = this.determinePriority(
      image,
      bestScript.prediction,
      shouldRemediate
    );

    // Reasoning
    const reasoning = this.generateReasoning(
      image,
      bestScript.prediction,
      shouldRemediate,
      priority
    );

    // Factors
    const factors = this.analyzeFactors(image, bestScript.prediction);

    // Estimated downtime
    const estimatedDowntime = this.estimateDowntime(image, bestScript.script);

    // Rollback plan
    const rollbackPlan = this.generateRollbackPlan(bestScript.script);

    return {
      shouldRemediate,
      confidence: bestScript.prediction.confidence,
      recommendedScript: bestScript.script,
      priority,
      reasoning,
      estimatedRiskReduction: bestScript.prediction.estimatedRiskReduction,
      estimatedDowntime,
      rollbackPlan,
      factors,
    };
  }

  /**
   * Should remediate hesaplar
   */
  private async calculateShouldRemediate(
    image: ImageRiskDocument,
    prediction: SuccessPrediction
  ): Promise<boolean> {
    if (!this.isModelTrained || !this.decisionModel) {
      return this.ruleBasedDecision(image, prediction);
    }

    try {
      const features = this.extractDecisionFeatures(image, prediction);
      const featuresTensor = tf.tensor2d([features]);

      const decision = this.decisionModel.predict(featuresTensor) as tf.Tensor;
      const shouldRemediate = (await decision.data())[0] > 0.5;
      decision.dispose();
      featuresTensor.dispose();

      return shouldRemediate;
    } catch (error) {
      logger.error("Decision hesaplama hatası:", error);
      return this.ruleBasedDecision(image, prediction);
    }
  }

  /**
   * Feature vector çıkarır
   */
  private extractDecisionFeatures(
    image: ImageRiskDocument,
    prediction: SuccessPrediction
  ): number[] {
    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    return [
      image.riskScore / 100,
      prediction.successProbability,
      prediction.confidence,
      prodPods > 0 ? 1 : 0,
      Math.min(image.pods.length / 20, 1),
      Math.min(image.riskFactors.length / 8, 1),
      image.riskLevel === "CRITICAL" ? 1 : 0,
      image.riskLevel === "HIGH" ? 1 : 0,
      prediction.estimatedRiskReduction / 50,
      prediction.factors.filter(f => f.impact === "POSITIVE").length / prediction.factors.length,
      prediction.warnings.length > 0 ? 1 : 0,
      prediction.recommendations.length > 0 ? 1 : 0,
      Math.min(image.pods.length * 0.1, 1), // User impact
      Math.random(), // Business hours (simplified)
      Math.random(), // Has backup (simplified)
    ];
  }

  /**
   * Rule-based decision (fallback)
   */
  private ruleBasedDecision(
    image: ImageRiskDocument,
    prediction: SuccessPrediction
  ): boolean {
    // Critical risk + high success = remediate
    if (image.riskLevel === "CRITICAL" && prediction.successProbability > 0.7) {
      return true;
    }

    // High risk + very high success = remediate
    if (image.riskLevel === "HIGH" && prediction.successProbability > 0.85) {
      return true;
    }

    // Medium risk + high success + low warnings = remediate
    if (
      image.riskLevel === "MEDIUM" &&
      prediction.successProbability > 0.8 &&
      prediction.warnings.length === 0
    ) {
      return true;
    }

    return false;
  }

  /**
   * Priority belirler
   */
  private determinePriority(
    image: ImageRiskDocument,
    prediction: SuccessPrediction,
    shouldRemediate: boolean
  ): "IMMEDIATE" | "HIGH" | "MEDIUM" | "LOW" | "DEFER" {
    if (!shouldRemediate) return "DEFER";

    if (image.riskLevel === "CRITICAL" && prediction.successProbability > 0.7) {
      return "IMMEDIATE";
    }

    if (image.riskLevel === "HIGH" && prediction.successProbability > 0.8) {
      return "HIGH";
    }

    if (image.riskLevel === "MEDIUM" && prediction.successProbability > 0.85) {
      return "MEDIUM";
    }

    return "LOW";
  }

  /**
   * Reasoning oluşturur
   */
  private generateReasoning(
    image: ImageRiskDocument,
    prediction: SuccessPrediction,
    shouldRemediate: boolean,
    priority: string
  ): string {
    if (!shouldRemediate) {
      return "Remediation önerilmiyor: Düşük başarı şansı veya yüksek risk";
    }

    const reasons: string[] = [];

    if (image.riskLevel === "CRITICAL") {
      reasons.push("Kritik risk seviyesi");
    }

    if (prediction.successProbability > 0.8) {
      reasons.push(`Yüksek başarı şansı (${(prediction.successProbability * 100).toFixed(0)}%)`);
    }

    if (prediction.estimatedRiskReduction > 30) {
      reasons.push(`Yüksek risk azalması (${prediction.estimatedRiskReduction} puan)`);
    }

    if (priority === "IMMEDIATE") {
      reasons.push("Acil müdahale gerekli");
    }

    return `AI kararı: ${reasons.join(", ")}`;
  }

  /**
   * Factors analizi
   */
  private analyzeFactors(
    image: ImageRiskDocument,
    prediction: SuccessPrediction
  ): Array<{ name: string; impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL"; weight: number }> {
    const factors: Array<{ name: string; impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL"; weight: number }> = [];

    // Positive factors
    if (prediction.successProbability > 0.8) {
      factors.push({
        name: "Yüksek Başarı Şansı",
        impact: "POSITIVE",
        weight: 0.3,
      });
    }

    if (prediction.estimatedRiskReduction > 30) {
      factors.push({
        name: "Yüksek Risk Azalması",
        impact: "POSITIVE",
        weight: 0.25,
      });
    }

    // Negative factors
    if (prediction.warnings.length > 2) {
      factors.push({
        name: "Çok Sayıda Uyarı",
        impact: "NEGATIVE",
        weight: 0.2,
      });
    }

    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    if (prodPods > 0) {
      factors.push({
        name: "Production Ortamı",
        impact: "NEGATIVE",
        weight: 0.15,
      });
    }

    return factors;
  }

  /**
   * Downtime tahmini
   */
  private estimateDowntime(
    image: ImageRiskDocument,
    script: RemediationScript
  ): number {
    // Basit tahmin (gerçek kullanımda daha detaylı)
    let downtime = 5; // Base minutes

    if (script.scriptType === "bash" || script.scriptType === "kubectl") {
      downtime += 2;
    }

    if (image.pods.length > 10) {
      downtime += image.pods.length * 0.5;
    }

    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    if (prodPods > 0) {
      downtime += 10; // Prod için ekstra süre
    }

    return Math.round(downtime);
  }

  /**
   * Rollback plan oluşturur
   */
  private generateRollbackPlan(script: RemediationScript): string {
    if (script.scriptType === "kubectl") {
      return `kubectl rollout undo deployment <deployment-name> -n <namespace>`;
    }

    if (script.scriptType === "bash") {
      return "Önceki image tag'ine geri dön: kubectl set image deployment/<name> <container>=<previous-image>";
    }

    return "Manuel rollback gerekli - önceki image versiyonuna geri dön";
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.decisionModel !== null;
  }
}

