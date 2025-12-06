import { ImageRiskDocument } from "../persistence/imageRisk.model";

export interface SecurityScorecard {
  imageName: string;
  overallScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  categoryScores: {
    versioning: number;
    security: number;
    compliance: number;
    operations: number;
  };
}

export class SecurityScorecardService {
  /**
   * Image için güvenlik skor kartı oluşturur
   */
  generateScorecard(image: ImageRiskDocument): SecurityScorecard {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Versioning skoru
    const versioningScore = this.calculateVersioningScore(image);
    if (versioningScore >= 80) {
      strengths.push("İyi versiyonlama stratejisi");
    } else {
      weaknesses.push("Versiyonlama eksiklikleri");
      recommendations.push("Belirli versiyon tag'leri kullanın");
    }

    // Security skoru
    const securityScore = this.calculateSecurityScore(image);
    if (securityScore >= 80) {
      strengths.push("Güvenlik best practice'leri uygulanmış");
    } else {
      weaknesses.push("Güvenlik iyileştirmeleri gerekli");
      if (image.riskFactors.some((f) => f.includes("root user"))) {
        recommendations.push("Non-root kullanıcı kullanın");
      }
      if (image.riskFactors.some((f) => f.includes("unknown base"))) {
        recommendations.push("Bilinen base image kullanın");
      }
    }

    // Compliance skoru
    const complianceScore = this.calculateComplianceScore(image);
    if (complianceScore >= 80) {
      strengths.push("Compliance gereksinimleri karşılanmış");
    } else {
      weaknesses.push("Compliance iyileştirmeleri gerekli");
    }

    // Operations skoru
    const operationsScore = this.calculateOperationsScore(image);
    if (operationsScore >= 80) {
      strengths.push("Operasyonel best practice'ler uygulanmış");
    } else {
      weaknesses.push("Operasyonel iyileştirmeler gerekli");
      if (image.riskFactors.some((f) => f.includes("older than 180 days"))) {
        recommendations.push("Image'ı düzenli olarak güncelleyin");
      }
    }

    const overallScore = Math.round(
      (versioningScore + securityScore + complianceScore + operationsScore) / 4
    );

    return {
      imageName: image.imageName,
      overallScore,
      strengths,
      weaknesses,
      recommendations,
      categoryScores: {
        versioning: versioningScore,
        security: securityScore,
        compliance: complianceScore,
        operations: operationsScore,
      },
    };
  }

  private calculateVersioningScore(image: ImageRiskDocument): number {
    let score = 100;

    if (image.imageName.includes(":latest")) {
      score -= 40;
    }
    if (image.riskFactors.some((f) => f.includes("non-production tag"))) {
      score -= 20;
    }
    if (image.riskFactors.some((f) => f.includes("Legacy image"))) {
      score -= 15;
    }

    return Math.max(0, score);
  }

  private calculateSecurityScore(image: ImageRiskDocument): number {
    let score = 100;

    if (image.riskFactors.some((f) => f.includes("root user"))) {
      score -= 30;
    }
    if (image.riskFactors.some((f) => f.includes("unknown base image"))) {
      score -= 20;
    }
    if (image.riskLevel === "CRITICAL") {
      score -= 30;
    } else if (image.riskLevel === "HIGH") {
      score -= 20;
    } else if (image.riskLevel === "MEDIUM") {
      score -= 10;
    }

    return Math.max(0, score);
  }

  private calculateComplianceScore(image: ImageRiskDocument): number {
    let score = 100;

    const prodPods = image.pods.filter((p) => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    });

    if (prodPods.length > 0) {
      if (image.riskLevel === "CRITICAL" || image.riskLevel === "HIGH") {
        score -= 40;
      }
      if (image.riskFactors.some((f) => f.includes("test image"))) {
        score -= 50;
      }
    }

    return Math.max(0, score);
  }

  private calculateOperationsScore(image: ImageRiskDocument): number {
    let score = 100;

    if (image.riskFactors.some((f) => f.includes("older than 180 days"))) {
      score -= 25;
    }
    if (image.pods.length === 0) {
      score -= 10; // Kullanılmayan image
    }

    return Math.max(0, score);
  }
}

