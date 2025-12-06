import { ImageRiskDocument } from "../persistence/imageRisk.model";

export interface Recommendation {
  id: string;
  type: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  priority: number; // 1-10, 10 en yüksek öncelik
  title: string;
  description: string;
  riskFactor: string; // Hangi risk faktörüne karşı
  action: string; // Ne yapılmalı
  impact: string; // Etkisi ne olacak
  effort: "LOW" | "MEDIUM" | "HIGH"; // Uygulama zorluğu
  estimatedRiskReduction: number; // Tahmini risk skoru azalması
  relatedImages?: string[]; // İlgili image'ler
}

export class RecommendationService {
  /**
   * Image için otomatik öneriler üretir
   */
  generateRecommendations(image: ImageRiskDocument): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Her risk faktörü için öneri üret
    image.riskFactors.forEach((factor) => {
      const factorRecommendations = this.getRecommendationsForFactor(image, factor);
      recommendations.push(...factorRecommendations);
    });

    // Genel öneriler (risk skoruna göre)
    const generalRecommendations = this.getGeneralRecommendations(image);
    recommendations.push(...generalRecommendations);

    // Önceliğe göre sırala
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Belirli bir risk faktörü için öneriler üretir
   */
  private getRecommendationsForFactor(
    image: ImageRiskDocument,
    factor: string
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (factor === "Uses latest tag") {
      recommendations.push({
        id: `latest-tag-${image.imageName}`,
        type: "CRITICAL",
        priority: 10,
        title: "Latest Tag Kullanımını Kaldır",
        description: "Bu image 'latest' tag'i kullanıyor. Bu tag değişken olduğu için production ortamında risklidir.",
        riskFactor: factor,
        action: `Image'i belirli bir versiyon tag'i ile kullanın (örn: ${this.suggestVersionTag(image.imageName)})`,
        impact: "Risk skoru ~40 puan azalır. Image versiyonları takip edilebilir hale gelir.",
        effort: "LOW",
        estimatedRiskReduction: 40,
      });
    }

    if (factor === "Uses root user") {
      recommendations.push({
        id: `root-user-${image.imageName}`,
        type: "CRITICAL",
        priority: 9,
        title: "Root User Kullanımını Kaldır",
        description: "Bu image root user olarak çalışıyor. Bu güvenlik açığı oluşturur.",
        riskFactor: factor,
        action: "Image'i non-root user ile çalışacak şekilde yeniden build edin veya Dockerfile'da USER direktifi ekleyin.",
        impact: "Risk skoru ~30 puan azalır. Güvenlik açığı kapatılır.",
        effort: "MEDIUM",
        estimatedRiskReduction: 30,
      });
    }

    if (factor === "Uses non-production tag") {
      recommendations.push({
        id: `non-prod-tag-${image.imageName}`,
        type: "HIGH",
        priority: 7,
        title: "Production Tag Kullan",
        description: "Bu image non-production tag (dev, debug, snapshot vb.) kullanıyor.",
        riskFactor: factor,
        action: `Image'i production-ready bir tag ile değiştirin (örn: ${this.suggestProductionTag(image.imageName)})`,
        impact: "Risk skoru ~15 puan azalır. Production ortamı için uygun hale gelir.",
        effort: "LOW",
        estimatedRiskReduction: 15,
      });
    }

    if (factor === "Legacy image tag") {
      recommendations.push({
        id: `legacy-tag-${image.imageName}`,
        type: "HIGH",
        priority: 8,
        title: "Legacy Tag'i Güncelle",
        description: "Bu image legacy veya canary tag kullanıyor. Güncel bir versiyona geçilmelidir.",
        riskFactor: factor,
        action: "Image'i güncel ve stabil bir versiyona güncelleyin.",
        impact: "Risk skoru ~20 puan azalır. Güncel ve güvenli versiyon kullanılır.",
        effort: "MEDIUM",
        estimatedRiskReduction: 20,
      });
    }

    if (factor.includes("older than")) {
      recommendations.push({
        id: `old-image-${image.imageName}`,
        type: "MEDIUM",
        priority: 6,
        title: "Eski Image'i Güncelle",
        description: "Bu image 180 günden eski. Güvenlik yamaları ve güncellemeler eksik olabilir.",
        riskFactor: factor,
        action: "Image'i en son versiyona güncelleyin ve güvenlik yamalarını kontrol edin.",
        impact: "Risk skoru azalır. Güvenlik açıkları kapatılır.",
        effort: "MEDIUM",
        estimatedRiskReduction: 15,
      });
    }

    if (factor === "Uses unknown base image") {
      recommendations.push({
        id: `unknown-base-${image.imageName}`,
        type: "MEDIUM",
        priority: 5,
        title: "Bilinmeyen Base Image'i Değiştir",
        description: "Bu image bilinmeyen bir base image kullanıyor. Güvenilir bir base image kullanılmalıdır.",
        riskFactor: factor,
        action: "Bilinmeyen base image'i güvenilir bir base image ile değiştirin (örn: alpine, ubuntu, debian).",
        impact: "Risk skoru ~10 puan azalır. Güvenilirlik artar.",
        effort: "HIGH",
        estimatedRiskReduction: 10,
      });
    }

    if (factor === "Test image used in workload") {
      recommendations.push({
        id: `test-image-${image.imageName}`,
        type: "HIGH",
        priority: 7,
        title: "Test Image'i Production'dan Kaldır",
        description: "Bu image test amaçlı ve production ortamında kullanılmamalıdır.",
        riskFactor: factor,
        action: "Test image'ini production ortamından kaldırın ve uygun production image'i kullanın.",
        impact: "Risk skoru ~10 puan azalır. Production ortamı güvenli hale gelir.",
        effort: "LOW",
        estimatedRiskReduction: 10,
      });
    }

    if (factor === "Running in production namespace") {
      recommendations.push({
        id: `prod-namespace-${image.imageName}`,
        type: "MEDIUM",
        priority: 4,
        title: "Production Namespace Riskini Değerlendir",
        description: "Bu image production namespace'inde çalışıyor. Risk faktörlerini minimize edin.",
        riskFactor: factor,
        action: "Production ortamında çalışan image'ler için tüm risk faktörlerini ele alın.",
        impact: "Production ortamı güvenliği artar.",
        effort: "MEDIUM",
        estimatedRiskReduction: 0, // Bu faktör kaldırılamaz ama diğer faktörler azaltılabilir
      });
    }

    return recommendations;
  }

  /**
   * Genel öneriler üretir (risk skoruna göre)
   */
  private getGeneralRecommendations(image: ImageRiskDocument): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (image.riskScore >= 80) {
      recommendations.push({
        id: `critical-risk-${image.imageName}`,
        type: "CRITICAL",
        priority: 10,
        title: "Kritik Risk - Acil Aksiyon Gerekli",
        description: `Bu image'in risk skoru ${image.riskScore} ve kritik seviyede. Acil olarak risk faktörlerini azaltın.`,
        riskFactor: "High Risk Score",
        action: "Tüm kritik risk faktörlerini ele alın ve image'i güvenli hale getirin.",
        impact: "Risk skoru önemli ölçüde azalır.",
        effort: "HIGH",
        estimatedRiskReduction: 30,
      });
    }

    if (image.riskLevel === "CRITICAL" || image.riskLevel === "HIGH") {
      const prodPods = image.pods.filter((p) => {
        const ns = p.namespace.toLowerCase();
        return ns === "prod" || ns.startsWith("prod-");
      });

      if (prodPods.length > 0) {
        recommendations.push({
          id: `prod-critical-${image.imageName}`,
          type: "CRITICAL",
          priority: 10,
          title: "Production Ortamında Kritik Riskli Image",
          description: `Bu image production ortamında ${prodPods.length} pod'da çalışıyor ve kritik/yüksek riskli.`,
          riskFactor: "Production Risk",
          action: "Production ortamındaki risk faktörlerini acilen azaltın veya image'i değiştirin.",
          impact: "Production ortamı güvenliği artar.",
          effort: "HIGH",
          estimatedRiskReduction: 0,
          relatedImages: [image.imageName],
        });
      }
    }

    // Çok fazla pod'da çalışıyorsa
    if (image.pods.length > 10) {
      recommendations.push({
        id: `wide-impact-${image.imageName}`,
        type: "MEDIUM",
        priority: 6,
        title: "Geniş Etki Alanı",
        description: `Bu image ${image.pods.length} pod'da çalışıyor. Risk faktörlerini azaltmak geniş bir etki yaratır.`,
        riskFactor: "Wide Impact",
        action: "Bu image'i güvenli hale getirmek birçok pod'u etkileyecektir.",
        impact: "Geniş bir alanda güvenlik artar.",
        effort: "MEDIUM",
        estimatedRiskReduction: 0,
      });
    }

    return recommendations;
  }

  /**
   * Versiyon tag önerisi üretir
   */
  private suggestVersionTag(imageName: string): string {
    const parts = imageName.split(":");
    if (parts.length === 2) {
      const [repo, tag] = parts;
      // Eğer latest ise, v1.0.0 gibi bir versiyon öner
      if (tag === "latest") {
        return `${repo}:v1.0.0`;
      }
    }
    return `${imageName.split(":")[0]}:v1.0.0`;
  }

  /**
   * Production tag önerisi üretir
   */
  private suggestProductionTag(imageName: string): string {
    const parts = imageName.split(":");
    if (parts.length === 2) {
      const [repo, tag] = parts;
      // Dev, debug, snapshot gibi tag'leri production tag'e çevir
      if (tag.includes("dev") || tag.includes("debug") || tag.includes("snapshot")) {
        return `${repo}:stable`;
      }
    }
    return `${imageName.split(":")[0]}:stable`;
  }

  /**
   * Birden fazla image için toplu öneriler üretir
   */
  generateBulkRecommendations(images: ImageRiskDocument[]): {
    recommendations: Recommendation[];
    summary: {
      totalImages: number;
      criticalCount: number;
      highCount: number;
      totalRiskReduction: number;
      topRecommendations: Recommendation[];
    };
  } {
    const allRecommendations: Recommendation[] = [];
    let criticalCount = 0;
    let highCount = 0;
    let totalRiskReduction = 0;

    images.forEach((image) => {
      const imageRecommendations = this.generateRecommendations(image);
      allRecommendations.push(...imageRecommendations);

      if (image.riskLevel === "CRITICAL") criticalCount++;
      if (image.riskLevel === "HIGH") highCount++;

      imageRecommendations.forEach((rec) => {
        totalRiskReduction += rec.estimatedRiskReduction;
      });
    });

    // En yüksek öncelikli önerileri al
    const topRecommendations = allRecommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);

    return {
      recommendations: allRecommendations,
      summary: {
        totalImages: images.length,
        criticalCount,
        highCount,
        totalRiskReduction,
        topRecommendations,
      },
    };
  }
}

