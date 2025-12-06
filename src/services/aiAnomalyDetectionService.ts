import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { ScanRunModel } from "../persistence/scanRun.model";
import { AnomalyModel, AnomalyDocument, AnomalyType, AnomalySeverity } from "../persistence/anomaly.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface AIAnomalyResult {
  isAnomaly: boolean;
  anomalyScore: number; // 0-1 arası, 1 = kesin anomali
  anomalyType: AnomalyType | "AI_DETECTED_PATTERN";
  severity: AnomalySeverity;
  explanation: string;
  confidence: number;
  suggestedActions: string[];
}

export class AIAnomalyDetectionService {
  private autoencoder: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Autoencoder modelini eğitir (unsupervised learning)
   */
  async trainAutoencoder(clusterId?: string): Promise<void> {
    try {
      logger.info("AI Anomaly Detection modeli eğitiliyor...");

      // Historical data'dan normal pattern'leri öğren
      const trainingData = await this.prepareAnomalyTrainingData(clusterId);

      if (trainingData.length < 20) {
        logger.warn("Anomali tespiti için yeterli veri yok (minimum 20 örnek gerekli)");
        this.isModelTrained = false;
        return;
      }

      // Autoencoder modeli oluştur
      this.autoencoder = tf.sequential({
        layers: [
          // Encoder
          tf.layers.dense({
            inputShape: [trainingData[0].length],
            units: 32,
            activation: "relu",
          }),
          tf.layers.dense({
            units: 16,
            activation: "relu",
          }),
          // Bottleneck (latent space)
          tf.layers.dense({
            units: 8,
            activation: "relu",
          }),
          // Decoder
          tf.layers.dense({
            units: 16,
            activation: "relu",
          }),
          tf.layers.dense({
            units: 32,
            activation: "relu",
          }),
          tf.layers.dense({
            units: trainingData[0].length,
            activation: "linear",
          }),
        ],
      });

      this.autoencoder.compile({
        optimizer: tf.train.adam(0.001),
        loss: "meanSquaredError",
        metrics: ["meanAbsoluteError"],
      });

      const xs = tf.tensor2d(trainingData);
      const ys = tf.tensor2d(trainingData); // Autoencoder için input = output

      await this.autoencoder.fit(xs, ys, {
        epochs: 50,
        batchSize: Math.min(16, Math.floor(trainingData.length / 2)),
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              logger.info(
                `Anomaly Detection Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`
              );
            }
          },
        },
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("AI Anomaly Detection modeli eğitimi tamamlandı");
    } catch (error) {
      logger.error("Anomali tespiti modeli eğitimi sırasında hata:", error);
      this.isModelTrained = false;
    }
  }

  /**
   * Historical data'dan anomali tespiti için training data hazırlar
   */
  private async prepareAnomalyTrainingData(clusterId?: string): Promise<number[][]> {
    const data: number[][] = [];

    // Son 50 scan run'ı çek
    const scanRuns = await ScanRunModel.find({
      status: "COMPLETED",
      ...(clusterId && { "images.clusterId": clusterId }),
    })
      .sort({ startedAt: -1 })
      .limit(50)
      .exec();

    for (const scanRun of scanRuns) {
      for (const imageEntry of scanRun.images) {
        const image = await ImageRiskModel.findOne({
          imageName: imageEntry.imageName,
          ...(clusterId && { clusterId }),
        }).exec();

        if (image) {
          const featureVector = this.extractAnomalyFeatures(image);
          data.push(featureVector);
        }
      }
    }

    return data;
  }

  /**
   * Anomali tespiti için feature vector çıkarır
   */
  private extractAnomalyFeatures(image: ImageRiskDocument): number[] {
    const features: number[] = [];

    // Risk skoru (normalize edilmiş)
    features.push(image.riskScore / 100);

    // Risk level encoding
    const riskLevelMap = { LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, CRITICAL: 1.0 };
    features.push(riskLevelMap[image.riskLevel] || 0);

    // Risk faktör sayısı (normalize edilmiş)
    features.push(Math.min(image.riskFactors.length / 8, 1));

    // Pod sayısı (normalize edilmiş)
    features.push(Math.min(image.pods.length / 20, 1));

    // Namespace sayısı (normalize edilmiş)
    const uniqueNamespaces = new Set(image.pods.map((p) => p.namespace)).size;
    features.push(Math.min(uniqueNamespaces / 10, 1));

    // Image yaşı (gün cinsinden, normalize edilmiş)
    const daysSinceScan = Math.floor(
      (Date.now() - image.lastScannedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    features.push(Math.min(daysSinceScan / 365, 1));

    // Risk faktörleri (binary flags)
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

    riskFactorFlags.forEach((factor) => {
      features.push(image.riskFactors.includes(factor) ? 1 : 0);
    });

    return features;
  }

  /**
   * AI ile anomali tespiti yapar
   */
  async detectAIAnomaly(
    image: ImageRiskDocument,
    historicalData?: ImageRiskDocument[]
  ): Promise<AIAnomalyResult> {
    // Model eğitilmemişse, rule-based tespit yap
    if (!this.isModelTrained || !this.autoencoder) {
      return this.ruleBasedAnomalyDetection(image, historicalData);
    }

    try {
      // Feature vector çıkar
      const featureVector = this.extractAnomalyFeatures(image);
      const inputTensor = tf.tensor2d([featureVector]);

      // Autoencoder ile reconstruction yap
      const reconstructed = this.autoencoder.predict(inputTensor) as tf.Tensor;
      const reconstructedData = await reconstructed.data();
      const inputData = await inputTensor.data();

      // Reconstruction error hesapla
      let reconstructionError = 0;
      for (let i = 0; i < featureVector.length; i++) {
        const diff = inputData[i] - reconstructedData[i];
        reconstructionError += diff * diff;
      }
      reconstructionError = Math.sqrt(reconstructionError / featureVector.length);

      inputTensor.dispose();
      reconstructed.dispose();

      // Reconstruction error yüksekse anomali
      const anomalyThreshold = 0.15; // Tune edilebilir
      const isAnomaly = reconstructionError > anomalyThreshold;
      const anomalyScore = Math.min(1.0, reconstructionError / anomalyThreshold);

      // Severity belirle
      const severity = this.determineSeverity(anomalyScore, image.riskScore);

      // Explanation oluştur
      const explanation = this.generateExplanation(
        reconstructionError,
        anomalyScore,
        image
      );

      // Suggested actions
      const suggestedActions = this.generateSuggestedActions(image, anomalyScore);

      return {
        isAnomaly,
        anomalyScore,
        anomalyType: "AI_DETECTED_PATTERN",
        severity,
        explanation,
        confidence: Math.min(1.0, anomalyScore * 1.2),
        suggestedActions,
      };
    } catch (error) {
      logger.error("AI anomali tespiti sırasında hata:", error);
      return this.ruleBasedAnomalyDetection(image, historicalData);
    }
  }

  /**
   * Model eğitilmemişse rule-based tespit yapar
   */
  private ruleBasedAnomalyDetection(
    image: ImageRiskDocument,
    historicalData?: ImageRiskDocument[]
  ): AIAnomalyResult {
    // Basit rule-based anomali tespiti
    let anomalyScore = 0;
    const reasons: string[] = [];

    // Risk skoru çok yüksekse
    if (image.riskScore >= 80) {
      anomalyScore += 0.4;
      reasons.push("Çok yüksek risk skoru");
    }

    // Çok fazla risk faktörü varsa
    if (image.riskFactors.length >= 6) {
      anomalyScore += 0.3;
      reasons.push("Çok fazla risk faktörü");
    }

    // Historical data ile karşılaştır
    if (historicalData && historicalData.length > 0) {
      const avgHistoricalScore =
        historicalData.reduce((sum, img) => sum + img.riskScore, 0) /
        historicalData.length;

      if (image.riskScore > avgHistoricalScore + 20) {
        anomalyScore += 0.3;
        reasons.push("Tarihsel ortalamadan çok yüksek");
      }
    }

    const isAnomaly = anomalyScore > 0.5;
    const severity = this.determineSeverity(anomalyScore, image.riskScore);

    return {
      isAnomaly,
      anomalyScore: Math.min(1.0, anomalyScore),
      anomalyType: "RISK_SCORE_SPIKE",
      severity,
      explanation: reasons.length > 0
        ? `Anomali tespit edildi: ${reasons.join(", ")}`
        : "Normal pattern",
      confidence: 0.7,
      suggestedActions: this.generateSuggestedActions(image, anomalyScore),
    };
  }

  /**
   * Severity belirler
   */
  private determineSeverity(
    anomalyScore: number,
    riskScore: number
  ): AnomalySeverity {
    if (anomalyScore >= 0.8 || riskScore >= 80) {
      return "CRITICAL";
    } else if (anomalyScore >= 0.6 || riskScore >= 60) {
      return "HIGH";
    } else if (anomalyScore >= 0.4 || riskScore >= 40) {
      return "MEDIUM";
    }
    return "LOW";
  }

  /**
   * Explanation oluşturur
   */
  private generateExplanation(
    reconstructionError: number,
    anomalyScore: number,
    image: ImageRiskDocument
  ): string {
    if (anomalyScore < 0.3) {
      return "Normal pattern, anomali tespit edilmedi";
    }

    const factors = [];
    if (image.riskScore >= 70) {
      factors.push("yüksek risk skoru");
    }
    if (image.riskFactors.length >= 5) {
      factors.push("çok sayıda risk faktörü");
    }
    if (image.pods.length > 10) {
      factors.push("yaygın kullanım");
    }

    return `AI modeli anormal pattern tespit etti (reconstruction error: ${reconstructionError.toFixed(
      3
    )}). ${factors.length > 0 ? `Etkileyen faktörler: ${factors.join(", ")}.` : ""}`;
  }

  /**
   * Önerilen aksiyonlar oluşturur
   */
  private generateSuggestedActions(
    image: ImageRiskDocument,
    anomalyScore: number
  ): string[] {
    const actions: string[] = [];

    if (anomalyScore > 0.7) {
      actions.push("Acil inceleme yapılmalı");
      actions.push("Remediation script'leri uygulanmalı");
    }

    if (image.riskFactors.includes("Uses latest tag")) {
      actions.push("Versioned tag'e geçilmeli");
    }

    if (image.riskFactors.includes("Uses root user")) {
      actions.push("Non-root user kullanılmalı");
    }

    if (image.riskScore >= 60) {
      actions.push("Image güncellemesi önerilir");
    }

    return actions;
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.autoencoder !== null;
  }
}

