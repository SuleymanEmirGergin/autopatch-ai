import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { Recommendation, RecommendationService } from "./recommendationService";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface IntelligentRecommendation extends Recommendation {
  aiScore: number; // ML-based priority score (0-10)
  mlConfidence: number; // ML model güven skoru
  predictedImpact: number; // Tahmini etki (risk azalması)
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasoning: string; // AI'ın neden bu öneriyi yaptığı
}

export class IntelligentRecommendationService {
  private recommendationService: RecommendationService;
  private priorityModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  constructor() {
    this.recommendationService = new RecommendationService();
  }

  /**
   * Priority prediction modelini eğitir
   */
  async trainPriorityModel(): Promise<void> {
    try {
      logger.info("Intelligent Recommendation priority modeli eğitiliyor...");

      // Historical data'dan öneri başarı oranlarını öğren
      // (Şimdilik basit bir model, gerçek data ile eğitilebilir)
      
      this.priorityModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [8], // Feature vector boyutu
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
            activation: "sigmoid", // 0-1 arası priority score
          }),
        ],
      });

      this.priorityModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
      });

      // Synthetic training data (gerçek kullanımda historical data kullanılır)
      const syntheticData = this.generateSyntheticTrainingData();
      const xs = tf.tensor2d(syntheticData.features);
      const ys = tf.tensor2d(syntheticData.labels, [syntheticData.labels.length, 1]);

      await this.priorityModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
        shuffle: true,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Intelligent Recommendation priority modeli eğitimi tamamlandı");
    } catch (error) {
      logger.error("Priority model eğitimi sırasında hata:", error);
      this.isModelTrained = false;
    }
  }

  /**
   * Synthetic training data oluşturur (demo için)
   */
  private generateSyntheticTrainingData(): { features: number[][]; labels: number[] } {
    const features: number[][] = [];
    const labels: number[] = [];

    // Synthetic data: yüksek risk = yüksek priority
    for (let i = 0; i < 100; i++) {
      const riskScore = Math.random() * 100;
      const riskFactorCount = Math.floor(Math.random() * 8);
      const isCritical = riskScore > 70 ? 1 : 0;
      const isHigh = riskScore > 50 ? 1 : 0;
      const usesLatest = Math.random() > 0.5 ? 1 : 0;
      const usesRoot = Math.random() > 0.5 ? 1 : 0;
      const inProd = Math.random() > 0.5 ? 1 : 0;
      const podCount = Math.random() * 20;
      const daysOld = Math.random() * 365;

      features.push([
        riskScore / 100,
        riskFactorCount / 8,
        isCritical,
        isHigh,
        usesLatest,
        usesRoot,
        inProd,
        Math.min(podCount / 20, 1),
      ]);

      // Priority label: risk skoruna ve faktörlere göre
      let priority = riskScore / 100;
      if (usesLatest) priority += 0.1;
      if (usesRoot) priority += 0.1;
      if (inProd && riskScore > 50) priority += 0.2;
      priority = Math.min(1.0, priority);

      labels.push(priority);
    }

    return { features, labels };
  }

  /**
   * AI-powered öneriler üretir
   */
  async generateIntelligentRecommendations(
    image: ImageRiskDocument
  ): Promise<IntelligentRecommendation[]> {
    // Önce normal önerileri al
    const baseRecommendations = this.recommendationService.generateRecommendations(image);

    // Her öneri için AI scoring yap
    const intelligentRecommendations: IntelligentRecommendation[] = [];

    for (const recommendation of baseRecommendations) {
      const aiScore = await this.calculateAIScore(recommendation, image);
      const mlConfidence = this.calculateMLConfidence(recommendation, image);
      const predictedImpact = this.predictImpact(recommendation, image);
      const urgency = this.determineUrgency(aiScore, image.riskScore);
      const reasoning = this.generateReasoning(recommendation, image, aiScore);

      intelligentRecommendations.push({
        ...recommendation,
        aiScore,
        mlConfidence,
        predictedImpact,
        urgency,
        reasoning,
      });
    }

    // AI score'a göre sırala
    return intelligentRecommendations.sort((a, b) => b.aiScore - a.aiScore);
  }

  /**
   * ML modeli ile priority score hesaplar
   */
  private async calculateAIScore(
    recommendation: Recommendation,
    image: ImageRiskDocument
  ): Promise<number> {
    // Model eğitilmemişse, rule-based scoring yap
    if (!this.isModelTrained || !this.priorityModel) {
      return this.ruleBasedAIScore(recommendation, image);
    }

    try {
      // Feature vector oluştur
      const featureVector = this.extractRecommendationFeatures(recommendation, image);
      const featuresTensor = tf.tensor2d([featureVector]);

      // Model ile tahmin yap
      const prediction = this.priorityModel.predict(featuresTensor) as tf.Tensor;
      const score = (await prediction.data())[0];
      prediction.dispose();
      featuresTensor.dispose();

      // 0-1'den 0-10'a scale et
      return score * 10;
    } catch (error) {
      logger.error("AI score hesaplama sırasında hata:", error);
      return this.ruleBasedAIScore(recommendation, image);
    }
  }

  /**
   * Model eğitilmemişse rule-based scoring yap
   */
  private ruleBasedAIScore(
    recommendation: Recommendation,
    image: ImageRiskDocument
  ): number {
    let score = recommendation.priority; // Base priority

    // Risk seviyesine göre artır
    if (image.riskLevel === "CRITICAL") score += 2;
    else if (image.riskLevel === "HIGH") score += 1;

    // Risk faktörüne göre artır
    if (recommendation.riskFactor === "Uses latest tag") score += 1.5;
    if (recommendation.riskFactor === "Uses root user") score += 1.5;

    // Estimated risk reduction'a göre artır
    score += recommendation.estimatedRiskReduction / 10;

    // Effort'a göre azalt (kolay uygulanabilir öneriler öncelikli)
    if (recommendation.effort === "LOW") score += 1;
    else if (recommendation.effort === "HIGH") score -= 0.5;

    return Math.min(10, Math.max(0, score));
  }

  /**
   * Recommendation için feature vector çıkarır
   */
  private extractRecommendationFeatures(
    recommendation: Recommendation,
    image: ImageRiskDocument
  ): number[] {
    return [
      image.riskScore / 100, // Normalize edilmiş risk skoru
      image.riskFactors.length / 8, // Risk faktör sayısı
      image.riskLevel === "CRITICAL" ? 1 : 0,
      image.riskLevel === "HIGH" ? 1 : 0,
      recommendation.type === "CRITICAL" ? 1 : 0,
      recommendation.type === "HIGH" ? 1 : 0,
      recommendation.estimatedRiskReduction / 50, // Normalize edilmiş risk azalması
      recommendation.effort === "LOW" ? 1 : recommendation.effort === "MEDIUM" ? 0.5 : 0,
    ];
  }

  /**
   * ML confidence hesaplar
   */
  private calculateMLConfidence(
    recommendation: Recommendation,
    image: ImageRiskDocument
  ): number {
    // Basit confidence hesaplama
    let confidence = 0.7; // Base confidence

    // Historical data varsa confidence artar
    if (image.pods.length > 0) confidence += 0.1;

    // Risk faktörü netse confidence artar
    if (recommendation.riskFactor && image.riskFactors.includes(recommendation.riskFactor)) {
      confidence += 0.1;
    }

    // Estimated impact yüksekse confidence artar
    if (recommendation.estimatedRiskReduction > 20) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Tahmini etkiyi hesaplar
   */
  private predictImpact(
    recommendation: Recommendation,
    image: ImageRiskDocument
  ): number {
    // Base impact
    let impact = recommendation.estimatedRiskReduction;

    // Risk seviyesine göre artır
    if (image.riskLevel === "CRITICAL") impact *= 1.2;
    else if (image.riskLevel === "HIGH") impact *= 1.1;

    // Pod sayısına göre artır (daha fazla pod = daha fazla etki)
    impact *= (1 + Math.min(image.pods.length / 10, 0.5));

    return Math.round(impact);
  }

  /**
   * Urgency belirler
   */
  private determineUrgency(
    aiScore: number,
    currentRiskScore: number
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (aiScore >= 8 || currentRiskScore >= 75) return "CRITICAL";
    if (aiScore >= 6 || currentRiskScore >= 50) return "HIGH";
    if (aiScore >= 4 || currentRiskScore >= 25) return "MEDIUM";
    return "LOW";
  }

  /**
   * AI reasoning oluşturur
   */
  private generateReasoning(
    recommendation: Recommendation,
    image: ImageRiskDocument,
    aiScore: number
  ): string {
    const reasons: string[] = [];

    if (aiScore >= 8) {
      reasons.push("Yüksek öncelikli öneri");
    }

    if (image.riskLevel === "CRITICAL") {
      reasons.push("Kritik risk seviyesi");
    }

    if (recommendation.estimatedRiskReduction > 30) {
      reasons.push(`Yüksek etki potansiyeli (${recommendation.estimatedRiskReduction} puan risk azalması)`);
    }

    if (image.pods.length > 5) {
      reasons.push("Yaygın kullanım nedeniyle öncelikli");
    }

    if (recommendation.effort === "LOW") {
      reasons.push("Düşük uygulama zorluğu");
    }

    return reasons.length > 0
      ? `AI önerisi: ${reasons.join(", ")}`
      : "AI tarafından önerildi";
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.priorityModel !== null;
  }
}

