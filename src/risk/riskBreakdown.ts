import { ImageUsage } from "../types/cce";
import { ImageMetadata } from "./riskEngine";

export interface RiskBreakdownItem {
  factor: string;
  score: number;
  description: string;
}

/**
 * Risk skorunun detaylı breakdown'ını hesaplar.
 * Her risk faktörünün skora katkısını gösterir.
 */
export function calculateRiskBreakdown(
  usage: ImageUsage,
  metadata: ImageMetadata = {},
  ignoredFactors: string[] = []
): RiskBreakdownItem[] {
  const breakdown: RiskBreakdownItem[] = [];

  // latest tag
  if (!ignoredFactors.includes("Uses latest tag")) {
    const parts = usage.imageName.split(":");
    const tag = parts[1] ?? "latest";
    if (tag === "latest") {
      breakdown.push({
        factor: "Uses latest tag",
        score: 40,
        description: "latest tag kullanımı güvenlik riski oluşturur",
      });
    }
  }

  // non-prod tag
  if (!ignoredFactors.includes("Uses non-production tag")) {
    const parts = usage.imageName.split(":");
    const tag = (parts[1] ?? "").toLowerCase();
    if (tag.includes("dev") || tag.includes("debug") || tag.includes("snapshot")) {
      breakdown.push({
        factor: "Uses non-production tag",
        score: 15,
        description: "dev/debug/snapshot tag'leri production'da kullanılmamalı",
      });
    }
  }

  // test image
  if (!ignoredFactors.includes("Test image used in workload")) {
    const [namePart] = usage.imageName.split(":");
    if (namePart.toLowerCase().endsWith("-test")) {
      breakdown.push({
        factor: "Test image used in workload",
        score: 10,
        description: "Test amaçlı image production workload'unda kullanılıyor",
      });
    }
  }

  // prod namespace
  if (!ignoredFactors.includes("Running in production namespace")) {
    const hasProd = usage.pods.some((p) => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    });
    if (hasProd) {
      breakdown.push({
        factor: "Running in production namespace",
        score: 15,
        description: "Production ortamında çalışıyor",
      });
    }
  }

  // legacy image
  if (!ignoredFactors.includes("Legacy image tag")) {
    const lower = usage.imageName.toLowerCase();
    if (lower.includes("legacy") || lower.includes("canary")) {
      breakdown.push({
        factor: "Legacy image tag",
        score: 20,
        description: "Legacy veya canary tag kullanımı",
      });
    }
  }

  // age risk
  if (!ignoredFactors.includes("Image older than 180 days")) {
    let createdAt: Date | undefined = metadata.createdAt;
    if (!createdAt) {
      const match = usage.imageName.match(/(\d{4}-\d{2}-\d{2})/);
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
        breakdown.push({
          factor: "Image older than 180 days",
          score: 20,
          description: `Image ${Math.floor(diffDays)} gün önce oluşturulmuş`,
        });
      }
    }
  }

  // root user
  if (!ignoredFactors.includes("Uses root user")) {
    if (metadata.usesRootUser) {
      breakdown.push({
        factor: "Uses root user",
        score: 30,
        description: "Root kullanıcı ile çalışıyor",
      });
    }
  }

  // unknown base
  if (!ignoredFactors.includes("Uses unknown base image")) {
    if (metadata.baseImageKnown === false) {
      breakdown.push({
        factor: "Uses unknown base image",
        score: 10,
        description: "Bilinmeyen base image kullanıyor",
      });
    }
  }

  return breakdown;
}

