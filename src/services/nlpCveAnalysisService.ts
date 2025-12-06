import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { SBOMModel } from "../persistence/sbom.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface CVEAnalysis {
  cveId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  extractedRiskFactors: string[];
  sentiment: "NEGATIVE" | "NEUTRAL" | "POSITIVE";
  riskScore: number;
  keywords: string[];
  recommendedAction: string;
}

export interface NLPImageAnalysis {
  imageName: string;
  overallSentiment: "NEGATIVE" | "NEUTRAL" | "POSITIVE";
  riskKeywords: string[];
  extractedConcerns: string[];
  confidence: number;
  cveAnalyses: CVEAnalysis[];
  summary: string;
}

export class NLPCVEAnalysisService {
  private textModel: tf.Sequential | null = null;
  private isModelTrained: boolean = false;

  /**
   * Text analysis modelini eğitir
   */
  async trainTextModel(): Promise<void> {
    try {
      logger.info("NLP text analysis modeli eğitiliyor...");

      // Synthetic training data (gerçek kullanımda CVE description'larından eğitilir)
      const trainingData = this.generateTextTrainingData();

      this.textModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [100], // Text embedding size
            units: 64,
            activation: "relu",
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 32,
            activation: "relu",
          }),
          tf.layers.dense({
            units: 3, // NEGATIVE, NEUTRAL, POSITIVE
            activation: "softmax",
          }),
        ],
      });

      this.textModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "categoricalCrossentropy",
        metrics: ["accuracy"],
      });

      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels);

      await this.textModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("NLP text analysis modeli eğitimi tamamlandı");
    } catch (error) {
      logger.error("NLP model eğitimi sırasında hata:", error);
      this.isModelTrained = false;
    }
  }

  /**
   * Synthetic text training data oluşturur
   */
  private generateTextTrainingData(): { features: number[][]; labels: number[][] } {
    const features: number[][] = [];
    const labels: number[][] = [];

    // Risk keywords
    const riskKeywords = [
      "vulnerability", "exploit", "security", "breach", "attack", "malware",
      "patch", "update", "critical", "high", "medium", "low", "cve",
      "remote", "code", "execution", "privilege", "escalation", "denial",
      "service", "information", "disclosure", "bypass", "authentication"
    ];

    for (let i = 0; i < 200; i++) {
      // Random text embedding (gerçek kullanımda word2vec/bert kullanılır)
      const embedding = Array(100).fill(0).map(() => Math.random());
      features.push(embedding);

      // Label: NEGATIVE (0), NEUTRAL (1), POSITIVE (2)
      const hasRiskKeywords = riskKeywords.some(kw => 
        embedding.some((v, idx) => idx < riskKeywords.length && v > 0.5)
      );
      
      if (hasRiskKeywords) {
        labels.push([1, 0, 0]); // NEGATIVE
      } else if (Math.random() > 0.7) {
        labels.push([0, 0, 1]); // POSITIVE
      } else {
        labels.push([0, 1, 0]); // NEUTRAL
      }
    }

    return { features, labels };
  }

  /**
   * CVE description'ından risk analizi yapar
   */
  async analyzeCVE(cveId: string, description: string): Promise<CVEAnalysis> {
    // Risk keywords extraction
    const riskKeywords = this.extractRiskKeywords(description);
    const extractedRiskFactors = this.extractRiskFactors(description);
    
    // Sentiment analysis (basit keyword-based, gerçek kullanımda ML model kullanılır)
    const sentiment = this.analyzeSentiment(description);
    
    // Severity extraction
    const severity = this.extractSeverity(description, cveId);
    
    // Risk score calculation
    const riskScore = this.calculateCVERiskScore(severity, riskKeywords, sentiment);
    
    // Recommended action
    const recommendedAction = this.generateRecommendedAction(severity, extractedRiskFactors);

    return {
      cveId,
      severity,
      description,
      extractedRiskFactors,
      sentiment,
      riskScore,
      keywords: riskKeywords,
      recommendedAction,
    };
  }

  /**
   * Image için NLP-based analiz yapar
   */
  async analyzeImage(image: ImageRiskDocument): Promise<NLPImageAnalysis> {
    // SBOM verilerini al
    const sbomData = await SBOMModel.findOne({
      imageName: image.imageName,
    })
      .sort({ scannedAt: -1 })
      .exec();

    const cveAnalyses: CVEAnalysis[] = [];

    // CVE'leri analiz et
    if (sbomData?.vulnerabilities) {
      for (const vuln of sbomData.vulnerabilities.slice(0, 10)) {
        // İlk 10 CVE'yi analiz et
        try {
          const analysis = await this.analyzeCVE(
            vuln.cveId || "UNKNOWN",
            vuln.description || vuln.summary || ""
          );
          cveAnalyses.push(analysis);
        } catch (error) {
          logger.error(`CVE analizi hatası (${vuln.cveId}):`, error);
        }
      }
    }

    // Overall sentiment
    const sentiments = cveAnalyses.map(a => a.sentiment);
    const overallSentiment = this.calculateOverallSentiment(sentiments);

    // Risk keywords
    const allKeywords = cveAnalyses.flatMap(a => a.keywords);
    const uniqueKeywords = Array.from(new Set(allKeywords));

    // Extracted concerns
    const allConcerns = cveAnalyses.flatMap(a => a.extractedRiskFactors);
    const uniqueConcerns = Array.from(new Set(allConcerns));

    // Confidence
    const confidence = this.calculateConfidence(cveAnalyses.length, image.riskFactors.length);

    // Summary
    const summary = this.generateSummary(image, cveAnalyses, overallSentiment);

    return {
      imageName: image.imageName,
      overallSentiment,
      riskKeywords: uniqueKeywords,
      extractedConcerns: uniqueConcerns,
      confidence,
      cveAnalyses,
      summary,
    };
  }

  /**
   * Risk keywords çıkarır
   */
  private extractRiskKeywords(text: string): string[] {
    const keywords: string[] = [];
    const lowerText = text.toLowerCase();

    const riskPatterns = [
      { pattern: /remote.*code.*execution/i, keyword: "RCE" },
      { pattern: /privilege.*escalation/i, keyword: "Privilege Escalation" },
      { pattern: /denial.*of.*service/i, keyword: "DoS" },
      { pattern: /information.*disclosure/i, keyword: "Information Disclosure" },
      { pattern: /authentication.*bypass/i, keyword: "Auth Bypass" },
      { pattern: /sql.*injection/i, keyword: "SQL Injection" },
      { pattern: /cross.*site.*scripting/i, keyword: "XSS" },
      { pattern: /buffer.*overflow/i, keyword: "Buffer Overflow" },
      { pattern: /path.*traversal/i, keyword: "Path Traversal" },
      { pattern: /command.*injection/i, keyword: "Command Injection" },
    ];

    riskPatterns.forEach(({ pattern, keyword }) => {
      if (pattern.test(lowerText)) {
        keywords.push(keyword);
      }
    });

    return keywords;
  }

  /**
   * Risk faktörleri çıkarır
   */
  private extractRiskFactors(text: string): string[] {
    const factors: string[] = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes("root") || lowerText.includes("administrator")) {
      factors.push("Root/Admin Access");
    }
    if (lowerText.includes("network") || lowerText.includes("remote")) {
      factors.push("Network Exposure");
    }
    if (lowerText.includes("file") || lowerText.includes("directory")) {
      factors.push("File System Access");
    }
    if (lowerText.includes("database") || lowerText.includes("db")) {
      factors.push("Database Access");
    }
    if (lowerText.includes("api") || lowerText.includes("endpoint")) {
      factors.push("API Exposure");
    }

    return factors;
  }

  /**
   * Sentiment analizi yapar
   */
  private analyzeSentiment(text: string): "NEGATIVE" | "NEUTRAL" | "POSITIVE" {
    const lowerText = text.toLowerCase();
    
    const negativeKeywords = [
      "vulnerability", "exploit", "attack", "breach", "malware", "critical",
      "dangerous", "unsafe", "risk", "threat", "compromise"
    ];
    
    const positiveKeywords = [
      "patched", "fixed", "resolved", "secure", "safe", "updated"
    ];

    const negativeCount = negativeKeywords.filter(kw => lowerText.includes(kw)).length;
    const positiveCount = positiveKeywords.filter(kw => lowerText.includes(kw)).length;

    if (negativeCount > positiveCount + 2) {
      return "NEGATIVE";
    } else if (positiveCount > negativeCount) {
      return "POSITIVE";
    }
    return "NEUTRAL";
  }

  /**
   * Severity çıkarır
   */
  private extractSeverity(description: string, cveId: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
    const lowerText = description.toLowerCase();
    const lowerCve = cveId.toLowerCase();

    if (lowerText.includes("critical") || lowerCve.includes("critical")) {
      return "CRITICAL";
    }
    if (lowerText.includes("high") || lowerCve.includes("high")) {
      return "HIGH";
    }
    if (lowerText.includes("medium") || lowerCve.includes("medium")) {
      return "MEDIUM";
    }
    return "LOW";
  }

  /**
   * CVE risk skoru hesaplar
   */
  private calculateCVERiskScore(
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    keywords: string[],
    sentiment: "NEGATIVE" | "NEUTRAL" | "POSITIVE"
  ): number {
    let score = 0;

    // Severity base score
    const severityScores = { CRITICAL: 40, HIGH: 25, MEDIUM: 15, LOW: 5 };
    score += severityScores[severity];

    // Keywords impact
    score += keywords.length * 5;

    // Sentiment impact
    if (sentiment === "NEGATIVE") score += 10;
    else if (sentiment === "POSITIVE") score -= 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Önerilen aksiyon oluşturur
   */
  private generateRecommendedAction(
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    riskFactors: string[]
  ): string {
    if (severity === "CRITICAL") {
      return "Acil patch uygulanmalı. Production ortamından kaldırılmalı veya güncellenmeli.";
    }
    if (severity === "HIGH") {
      return "Yakın zamanda patch uygulanmalı. Risk değerlendirmesi yapılmalı.";
    }
    if (riskFactors.length > 3) {
      return "Birden fazla risk faktörü var. Kapsamlı güvenlik incelemesi önerilir.";
    }
    return "Düzenli güncelleme planına dahil edilmeli.";
  }

  /**
   * Overall sentiment hesaplar
   */
  private calculateOverallSentiment(
    sentiments: ("NEGATIVE" | "NEUTRAL" | "POSITIVE")[]
  ): "NEGATIVE" | "NEUTRAL" | "POSITIVE" {
    if (sentiments.length === 0) return "NEUTRAL";

    const negativeCount = sentiments.filter(s => s === "NEGATIVE").length;
    const positiveCount = sentiments.filter(s => s === "POSITIVE").length;

    if (negativeCount > positiveCount) return "NEGATIVE";
    if (positiveCount > negativeCount) return "POSITIVE";
    return "NEUTRAL";
  }

  /**
   * Confidence hesaplar
   */
  private calculateConfidence(cveCount: number, riskFactorCount: number): number {
    let confidence = 0.5; // Base confidence

    if (cveCount > 0) confidence += 0.2;
    if (cveCount > 5) confidence += 0.1;
    if (riskFactorCount > 0) confidence += 0.1;
    if (riskFactorCount > 5) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Summary oluşturur
   */
  private generateSummary(
    image: ImageRiskDocument,
    cveAnalyses: CVEAnalysis[],
    sentiment: "NEGATIVE" | "NEUTRAL" | "POSITIVE"
  ): string {
    const criticalCVEs = cveAnalyses.filter(c => c.severity === "CRITICAL").length;
    const highCVEs = cveAnalyses.filter(c => c.severity === "HIGH").length;

    let summary = `Image analizi: ${sentiment} sentiment tespit edildi. `;

    if (criticalCVEs > 0) {
      summary += `${criticalCVEs} kritik CVE bulundu. `;
    }
    if (highCVEs > 0) {
      summary += `${highCVEs} yüksek öncelikli CVE bulundu. `;
    }

    summary += `Toplam ${cveAnalyses.length} güvenlik açığı analiz edildi. `;
    summary += `Mevcut risk skoru: ${image.riskScore}.`;

    return summary;
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.textModel !== null;
  }
}

