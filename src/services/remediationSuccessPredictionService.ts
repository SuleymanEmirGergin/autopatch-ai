import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface RemediationScript {
  type: "BASH" | "KUBECTL" | "GITHUB_ACTIONS" | "GITLAB_CI";
  riskFactor: string;
  script: string;
}

export interface SuccessPrediction {
  script: RemediationScript;
  successProbability: number; // 0-1 arası
  confidence: number;
  estimatedRiskReduction: number;
  factors: {
    name: string;
    impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    explanation: string;
  }[];
  recommendations: string[];
  warnings: string[];
}

export class RemediationSuccessPredictionService {
  private successModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Success prediction modelini eğitir
   */
  async trainModel(): Promise<void> {
    try {
      logger.info("Remediation success prediction modeli eğitiliyor...");

      // Synthetic training data (gerçek kullanımda historical remediation data kullanılır)
      const trainingData = this.generateTrainingData();

      this.successModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [10], // Feature vector size
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
            activation: "sigmoid", // Success probability (0-1)
          }),
        ],
      });

      this.successModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
      });

      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1]);

      await this.successModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Remediation success prediction modeli eğitimi tamamlandı");
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
      const riskFactorCount = Math.floor(Math.random() * 8);
      const scriptType = Math.random();
      const effort = Math.random();
      const hasProdPods = Math.random() > 0.5 ? 1 : 0;
      const podCount = Math.random() * 20;
      const daysOld = Math.random() * 365;
      const hasLatestTag = Math.random() > 0.5 ? 1 : 0;
      const hasRootUser = Math.random() > 0.5 ? 1 : 0;
      const isCritical = riskScore > 70 ? 1 : 0;

      features.push([
        riskScore / 100,
        riskFactorCount / 8,
        scriptType,
        effort,
        hasProdPods,
        Math.min(podCount / 20, 1),
        Math.min(daysOld / 365, 1),
        hasLatestTag,
        hasRootUser,
        isCritical,
      ]);

      // Success probability: düşük effort, az risk faktörü, kritik değil = yüksek başarı
      let successProb = 0.7; // Base
      if (effort < 0.3) successProb += 0.2; // Low effort
      if (riskFactorCount < 3) successProb += 0.1; // Few risk factors
      if (isCritical) successProb -= 0.2; // Critical = harder
      if (hasProdPods) successProb -= 0.1; // Prod = riskier

      labels.push(Math.max(0, Math.min(1, successProb)));
    }

    return { features, labels };
  }

  /**
   * Remediation script'inin başarı şansını tahmin eder
   */
  async predictSuccess(
    image: ImageRiskDocument,
    script: RemediationScript
  ): Promise<SuccessPrediction> {
    // Feature vector oluştur
    const features = this.extractFeatures(image, script);

    // Model ile tahmin (eğitilmemişse rule-based)
    let successProbability = 0.7; // Default
    let confidence = 0.6;

    if (this.isModelTrained && this.successModel) {
      try {
        const featuresTensor = tf.tensor2d([features]);
        const prediction = this.successModel.predict(featuresTensor) as tf.Tensor;
        successProbability = (await prediction.data())[0];
        prediction.dispose();
        featuresTensor.dispose();
        confidence = 0.8;
      } catch (error) {
        logger.error("Success prediction hatası:", error);
        successProbability = this.ruleBasedSuccessPrediction(image, script);
      }
    } else {
      successProbability = this.ruleBasedSuccessPrediction(image, script);
    }

    // Factors analizi
    const factors = this.analyzeFactors(image, script);

    // Estimated risk reduction
    const estimatedRiskReduction = this.estimateRiskReduction(image, script);

    // Recommendations
    const recommendations = this.generateRecommendations(
      image,
      script,
      successProbability
    );

    // Warnings
    const warnings = this.generateWarnings(image, script, successProbability);

    return {
      script,
      successProbability,
      confidence,
      estimatedRiskReduction,
      factors,
      recommendations,
      warnings,
    };
  }

  /**
   * Feature vector çıkarır
   */
  private extractFeatures(
    image: ImageRiskDocument,
    script: RemediationScript
  ): number[] {
    const scriptTypeMap = {
      BASH: 0.25,
      KUBECTL: 0.5,
      GITHUB_ACTIONS: 0.75,
      GITLAB_CI: 1.0,
    };

    const effortMap: { [key: string]: number } = {
      "Uses latest tag": 0.2, // Low effort
      "Uses non-production tag": 0.3,
      "Test image used in workload": 0.2,
      "Uses root user": 0.6, // Medium effort
      "Legacy image tag": 0.5,
      "Image older than 180 days": 0.7, // High effort
      "Uses unknown base image": 0.8, // High effort
    };

    const effort = effortMap[script.riskFactor] || 0.5;

    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    return [
      image.riskScore / 100,
      image.riskFactors.length / 8,
      scriptTypeMap[script.type] || 0.5,
      effort,
      prodPods > 0 ? 1 : 0,
      Math.min(image.pods.length / 20, 1),
      Math.min(image.riskFactors.filter(f => f === script.riskFactor).length, 1),
      image.riskLevel === "CRITICAL" ? 1 : 0,
      image.riskLevel === "HIGH" ? 1 : 0,
      script.script.length > 1000 ? 1 : 0, // Complex script
    ];
  }

  /**
   * Rule-based success prediction (fallback)
   */
  private ruleBasedSuccessPrediction(
    image: ImageRiskDocument,
    script: RemediationScript
  ): number {
    let probability = 0.7; // Base

    // Script type
    if (script.type === "BASH" || script.type === "KUBECTL") {
      probability += 0.1; // Direct execution = higher success
    }

    // Risk factor
    const effortMap: { [key: string]: number } = {
      "Uses latest tag": 0.9, // Easy to fix
      "Uses non-production tag": 0.85,
      "Test image used in workload": 0.9,
      "Uses root user": 0.7, // Medium difficulty
      "Legacy image tag": 0.75,
      "Image older than 180 days": 0.6, // Harder
      "Uses unknown base image": 0.5, // Hard
    };

    const factorProb = effortMap[script.riskFactor] || 0.7;
    probability = (probability + factorProb) / 2;

    // Risk level
    if (image.riskLevel === "CRITICAL") {
      probability -= 0.1; // Critical = riskier
    }

    // Prod pods
    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    if (prodPods > 0) {
      probability -= 0.1; // Prod = riskier
    }

    return Math.max(0.3, Math.min(0.95, probability));
  }

  /**
   * Factors analizi
   */
  private analyzeFactors(
    image: ImageRiskDocument,
    script: RemediationScript
  ): Array<{
    name: string;
    impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    explanation: string;
  }> {
    const factors: Array<{
      name: string;
      impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
      explanation: string;
    }> = [];

    // Script type
    if (script.type === "BASH" || script.type === "KUBECTL") {
      factors.push({
        name: "Direct Execution Script",
        impact: "POSITIVE",
        explanation: "Doğrudan çalıştırılabilir script, yüksek başarı şansı",
      });
    }

    // Risk factor difficulty
    const easyFactors = ["Uses latest tag", "Uses non-production tag"];
    if (easyFactors.includes(script.riskFactor)) {
      factors.push({
        name: "Low Complexity Fix",
        impact: "POSITIVE",
        explanation: "Düşük karmaşıklıklı düzeltme, kolay uygulanabilir",
      });
    }

    // Prod pods
    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    if (prodPods > 0) {
      factors.push({
        name: "Production Environment",
        impact: "NEGATIVE",
        explanation: "Production ortamında uygulama riski yüksek",
      });
    }

    // Risk level
    if (image.riskLevel === "CRITICAL") {
      factors.push({
        name: "Critical Risk Level",
        impact: "NEGATIVE",
        explanation: "Kritik risk seviyesi, dikkatli uygulama gerekli",
      });
    }

    return factors;
  }

  /**
   * Risk azalması tahmini
   */
  private estimateRiskReduction(
    image: ImageRiskDocument,
    script: RemediationScript
  ): number {
    const reductionMap: { [key: string]: number } = {
      "Uses latest tag": 40,
      "Uses root user": 30,
      "Uses non-production tag": 15,
      "Legacy image tag": 20,
      "Image older than 180 days": 15,
      "Test image used in workload": 10,
      "Uses unknown base image": 10,
    };

    return reductionMap[script.riskFactor] || 10;
  }

  /**
   * Recommendations oluşturur
   */
  private generateRecommendations(
    image: ImageRiskDocument,
    script: RemediationScript,
    successProbability: number
  ): string[] {
    const recommendations: string[] = [];

    if (successProbability < 0.6) {
      recommendations.push("Düşük başarı şansı, önce test ortamında deneyin");
    }

    if (image.riskLevel === "CRITICAL") {
      recommendations.push("Kritik risk, dry-run modunda test edin");
    }

    const prodPods = image.pods.filter(p => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    }).length;

    if (prodPods > 0) {
      recommendations.push("Production ortamında uygulamadan önce backup alın");
    }

    if (script.type === "GITHUB_ACTIONS" || script.type === "GITLAB_CI") {
      recommendations.push("CI/CD pipeline'ında test edin");
    }

    return recommendations;
  }

  /**
   * Warnings oluşturur
   */
  private generateWarnings(
    image: ImageRiskDocument,
    script: RemediationScript,
    successProbability: number
  ): string[] {
    const warnings: string[] = [];

    if (successProbability < 0.5) {
      warnings.push("Düşük başarı şansı, alternatif yöntemler düşünün");
    }

    if (image.pods.length > 10) {
      warnings.push("Çok sayıda pod etkilenecek, dikkatli uygulayın");
    }

    if (script.script.length > 2000) {
      warnings.push("Karmaşık script, adım adım uygulayın");
    }

    return warnings;
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.successModel !== null;
  }
}

