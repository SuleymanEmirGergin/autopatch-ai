import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { logger } from "../utils/logger";
import * as tf from "@tensorflow/tfjs-node";

export interface ThreatIntelligence {
  source: string;
  threatType: "MALWARE" | "EXPLOIT" | "VULNERABILITY" | "ATTACK_PATTERN";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  affectedImages: string[];
  confidence: number;
  publishedDate: Date;
  mitigation: string;
}

export interface ThreatMatch {
  imageName: string;
  threat: ThreatIntelligence;
  matchScore: number; // 0-100
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  evidence: string[];
  recommendedActions: string[];
}

export class ThreatIntelligenceService {
  private threatModel: tf.Sequential | null = null;
  private threatDatabase: ThreatIntelligence[] = [];
  private isModelTrained: boolean = false;

  constructor() {
    // Initialize threat database (gerçek kullanımda external API'den çekilir)
    this.initializeThreatDatabase();
  }

  /**
   * Threat database'i başlatır (synthetic data)
   */
  private initializeThreatDatabase(): void {
    this.threatDatabase = [
      {
        source: "CVE Database",
        threatType: "VULNERABILITY",
        severity: "CRITICAL",
        description: "Remote Code Execution vulnerability in container images",
        affectedImages: ["*"], // All images potentially affected
        confidence: 0.9,
        publishedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        mitigation: "Update to latest patched version",
      },
      {
        source: "Security Advisory",
        threatType: "EXPLOIT",
        severity: "HIGH",
        description: "Privilege escalation exploit in root user containers",
        affectedImages: ["*root*", "*latest*"],
        confidence: 0.85,
        publishedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        mitigation: "Use non-root user and apply security patches",
      },
      {
        source: "Threat Intelligence Feed",
        threatType: "MALWARE",
        severity: "CRITICAL",
        description: "Malware campaign targeting container registries",
        affectedImages: ["*unknown*", "*legacy*"],
        confidence: 0.8,
        publishedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        mitigation: "Verify image integrity and use trusted sources",
      },
    ];
  }

  /**
   * Threat intelligence modelini eğitir
   */
  async trainModel(clusterId?: string): Promise<void> {
    try {
      logger.info("Threat intelligence modeli eğitiliyor...");

      const trainingData = this.generateTrainingData();

      this.threatModel = tf.sequential({
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
            activation: "sigmoid", // Threat match probability
          }),
        ],
      });

      this.threatModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
      });

      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1]);

      await this.threatModel.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
      });

      xs.dispose();
      ys.dispose();

      this.isModelTrained = true;
      logger.info("Threat intelligence modeli eğitimi tamamlandı");
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
      const hasThreatPattern = Math.random() > 0.7 ? 1 : 0;
      const riskScore = Math.random() * 100;
      const hasLatestTag = Math.random() > 0.5 ? 1 : 0;
      const hasRootUser = Math.random() > 0.5 ? 1 : 0;
      const hasUnknownBase = Math.random() > 0.8 ? 1 : 0;
      const prodPods = Math.random() > 0.5 ? 1 : 0;
      const recentUpdate = Math.random() > 0.7 ? 1 : 0;
      const highRisk = riskScore > 70 ? 1 : 0;
      const threatAge = Math.random(); // Days since threat published
      const threatSeverity = Math.random();

      features.push([
        hasThreatPattern,
        riskScore / 100,
        hasLatestTag,
        hasRootUser,
        hasUnknownBase,
        prodPods,
        recentUpdate,
        highRisk,
        threatAge,
        threatSeverity,
      ]);

      // Label: threat match?
      let match = 0;
      if (hasThreatPattern && (hasLatestTag || hasRootUser || hasUnknownBase)) {
        match = 1;
      } else if (highRisk && threatSeverity > 0.7) {
        match = 0.7;
      }

      labels.push(match);
    }

    return { features, labels };
  }

  /**
   * Image için threat intelligence kontrolü yapar
   */
  async checkThreats(
    image: ImageRiskDocument,
    clusterId?: string
  ): Promise<ThreatMatch[]> {
    const matches: ThreatMatch[] = [];

    for (const threat of this.threatDatabase) {
      // Pattern matching
      const matchScore = this.calculateThreatMatch(image, threat);

      if (matchScore > 30) {
        const riskLevel = this.determineThreatRiskLevel(matchScore, threat.severity);
        const evidence = this.collectEvidence(image, threat);
        const recommendedActions = this.generateThreatActions(threat, image);

        matches.push({
          imageName: image.imageName,
          threat,
          matchScore: Math.round(matchScore),
          riskLevel,
          evidence,
          recommendedActions,
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Threat match hesaplar
   */
  private calculateThreatMatch(
    image: ImageRiskDocument,
    threat: ThreatIntelligence
  ): number {
    let matchScore = 0;

    // Image name pattern matching
    if (threat.affectedImages.includes("*")) {
      matchScore += 30; // All images potentially affected
    } else {
      threat.affectedImages.forEach(pattern => {
        if (image.imageName.includes(pattern.replace("*", ""))) {
          matchScore += 40;
        }
      });
    }

    // Threat type matching
    if (threat.threatType === "VULNERABILITY") {
      if (image.riskScore > 60) matchScore += 20;
      if (image.riskFactors.includes("Uses latest tag")) matchScore += 15;
    }

    if (threat.threatType === "EXPLOIT") {
      if (image.riskFactors.includes("Uses root user")) matchScore += 25;
      if (image.riskLevel === "CRITICAL" || image.riskLevel === "HIGH") matchScore += 20;
    }

    if (threat.threatType === "MALWARE") {
      if (image.riskFactors.includes("Uses unknown base image")) matchScore += 30;
      if (image.riskFactors.includes("Legacy image tag")) matchScore += 15;
    }

    // Severity boost
    if (threat.severity === "CRITICAL") matchScore += 20;
    else if (threat.severity === "HIGH") matchScore += 10;

    // Confidence adjustment
    matchScore *= threat.confidence;

    return Math.min(100, matchScore);
  }

  /**
   * Threat risk level belirler
   */
  private determineThreatRiskLevel(
    matchScore: number,
    threatSeverity: string
  ): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
    if (matchScore > 70 || threatSeverity === "CRITICAL") return "CRITICAL";
    if (matchScore > 50 || threatSeverity === "HIGH") return "HIGH";
    if (matchScore > 30) return "MEDIUM";
    return "LOW";
  }

  /**
   * Evidence toplar
   */
  private collectEvidence(
    image: ImageRiskDocument,
    threat: ThreatIntelligence
  ): string[] {
    const evidence: string[] = [];

    evidence.push(`Threat: ${threat.description}`);
    evidence.push(`Source: ${threat.source}`);

    if (threat.threatType === "EXPLOIT" && image.riskFactors.includes("Uses root user")) {
      evidence.push("Root user kullanımı exploit'e açık");
    }

    if (threat.threatType === "VULNERABILITY" && image.riskScore > 60) {
      evidence.push(`Yüksek risk skoru (${image.riskScore})`);
    }

    if (threat.threatType === "MALWARE" && image.riskFactors.includes("Uses unknown base image")) {
      evidence.push("Bilinmeyen base image kullanımı");
    }

    return evidence;
  }

  /**
   * Threat actions oluşturur
   */
  private generateThreatActions(
    threat: ThreatIntelligence,
    image: ImageRiskDocument
  ): string[] {
    const actions: string[] = [];

    actions.push(threat.mitigation);

    if (threat.severity === "CRITICAL") {
      actions.push("Acil müdahale gerekli - Image'i production'dan kaldırın");
    }

    if (image.riskLevel === "CRITICAL" || image.riskLevel === "HIGH") {
      actions.push("Yüksek risk seviyesi, detaylı güvenlik incelemesi yapın");
    }

    actions.push("Threat intelligence feed'lerini düzenli kontrol edin");

    return actions;
  }

  /**
   * Toplu threat check
   */
  async checkBulkThreats(
    imageNames: string[],
    clusterId?: string
  ): Promise<Map<string, ThreatMatch[]>> {
    const results = new Map<string, ThreatMatch[]>();

    for (const imageName of imageNames) {
      const image = await ImageRiskModel.findOne({
        imageName,
        ...(clusterId && { clusterId }),
      }).exec();

      if (image) {
        try {
          const matches = await this.checkThreats(image, clusterId);
          results.set(imageName, matches);
        } catch (error) {
          logger.error(`Threat check hatası (${imageName}):`, error);
        }
      }
    }

    return results;
  }

  /**
   * Model durumunu kontrol eder
   */
  isModelReady(): boolean {
    return this.isModelTrained && this.threatModel !== null;
  }
}

