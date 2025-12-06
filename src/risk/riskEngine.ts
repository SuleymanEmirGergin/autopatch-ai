import { ImageUsage } from "../types/cce";
import { CustomRuleMatch } from "../services/customRuleEvaluator";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ImageRiskResult {
  imageName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  lastScannedAt: Date;
  pods: { namespace: string; name: string }[];
  riskFactors: string[];
  clusterId?: string;
  projectId?: string;
}

export interface ImageMetadata {
  /**
   * Image oluşturulma tarihi (varsa). Gerçek registryle entegrasyonda
   * doldurulabilir, şu an için isim bazlı heuristik kullanıyoruz.
   */
  createdAt?: Date;
  usesRootUser?: boolean;
  baseImageKnown?: boolean;
}

export class RiskEngine {
  /**
   * ImageUsage ve opsiyonel metadata bilgisine göre deterministik risk skoru hesaplar.
   */
  calculateRisk(
    usage: ImageUsage,
    metadata: ImageMetadata = {},
    ignoredFactors: string[] = [],
    customRuleMatches: CustomRuleMatch[] = []
  ): ImageRiskResult {
    let score = 0;
    const riskFactors: string[] = [];

    // latest tag kullanımı
    if (this.isLatestTag(usage.imageName) && !ignoredFactors.includes("Uses latest tag")) {
      score += 40;
      riskFactors.push("Uses latest tag");
    }

    // non-prod tag kullanımı (dev, debug, snapshot vb.)
    if (this.isNonProdTag(usage.imageName) && !ignoredFactors.includes("Uses non-production tag")) {
      score += 15;
      riskFactors.push("Uses non-production tag");
    }

    // test imajı kullanımı
    if (this.isTestImage(usage.imageName) && !ignoredFactors.includes("Test image used in workload")) {
      score += 10;
      riskFactors.push("Test image used in workload");
    }

    // prod namespace'lerinde çalışma
    if (this.isRunningInProdNamespace(usage) && !ignoredFactors.includes("Running in production namespace")) {
      score += 15;
      riskFactors.push("Running in production namespace");
    }

    // legacy imaj (legacy/canary gibi riskli tagler)
    if (this.isLegacyImage(usage.imageName) && !ignoredFactors.includes("Legacy image tag")) {
      score += 20;
      riskFactors.push("Legacy image tag");
    }

    // image yaşı
    const ageResult = this.calculateAgeRisk(metadata, usage.imageName);
    score += ageResult.scoreDelta;
    riskFactors.push(
      ...ageResult.factors.filter(
        (f) => !ignoredFactors.includes("Image older than 180 days")
      )
    );

    // root user kullanımı
    if (metadata.usesRootUser && !ignoredFactors.includes("Uses root user")) {
      score += 30;
      riskFactors.push("Uses root user");
    }

    // bilinmeyen base image
    if (
      metadata.baseImageKnown === false &&
      !ignoredFactors.includes("Uses unknown base image")
    ) {
      score += 10;
      riskFactors.push("Uses unknown base image");
    }

    // Custom rule'ları uygula
    for (const match of customRuleMatches) {
      if (!ignoredFactors.includes(match.factor)) {
        score += match.score;
        riskFactors.push(match.factor);
      }
    }

    if (score > 100) {
      score = 100;
    }

    const riskLevel = this.toRiskLevel(score);

    return {
      imageName: usage.imageName,
      riskScore: score,
      riskLevel,
      lastScannedAt: new Date(),
      pods: usage.pods,
      riskFactors,
    };
  }

  private isLatestTag(imageName: string): boolean {
    // çok basit: son kısım "latest" ise
    const parts = imageName.split(":");
    const tag = parts[1] ?? "latest";
    return tag === "latest";
  }

  private isNonProdTag(imageName: string): boolean {
    const parts = imageName.split(":");
    const tag = parts[1] ?? "";
    const lower = tag.toLowerCase();
    return (
      lower.includes("dev") ||
      lower.includes("debug") ||
      lower.includes("snapshot")
    );
  }

  private isTestImage(imageName: string): boolean {
    // Sadece gerçekten test amaçlı imajları yakalamak için daha sıkı kural:
    // - İmaj adının tag'den önceki kısmının '-test' ile bitmesi
    //   Örn: registry.example.com/worker-test:1.0.0
    const [namePart] = imageName.split(":");
    const lower = namePart.toLowerCase();
    return lower.endsWith("-test");
  }

  private isRunningInProdNamespace(usage: ImageUsage): boolean {
    return usage.pods.some((p) => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    });
  }

  private isLegacyImage(imageName: string): boolean {
    const lower = imageName.toLowerCase();
    return lower.includes("legacy") || lower.includes("canary");
  }

  private calculateAgeRisk(
    metadata: ImageMetadata,
    imageName: string
  ): { scoreDelta: number; factors: string[] } {
    const factors: string[] = [];
    let scoreDelta = 0;

    let createdAt: Date | undefined = metadata.createdAt;

    if (!createdAt) {
      // İsimde YYYY-MM-DD formatı varsa onu tarihe çevirip kullan
      const match = imageName.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        const parsed = new Date(match[1]);
        if (!Number.isNaN(parsed.getTime())) {
          createdAt = parsed;
        }
      }
    }

    if (createdAt) {
      const now = new Date();
      const diffMs = now.getTime() - createdAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays > 180) {
        scoreDelta += 20;
        factors.push("Image older than 180 days");
      }
    }

    return { scoreDelta, factors };
  }

  private toRiskLevel(score: number): RiskLevel {
    if (score >= 90) return "CRITICAL";
    if (score >= 70) return "HIGH";
    if (score >= 40) return "MEDIUM";
    return "LOW";
  }
}


