import { ImageRiskResult } from "../risk/riskEngine";

export interface RemediationRecommendation {
  riskFactor: string;
  severity: "critical" | "high" | "medium" | "low";
  recommendation: string;
  steps: string[];
  resources?: string[];
}

export class RemediationService {
  /**
   * Image için risk azaltma önerileri oluşturur
   */
  getRecommendations(image: ImageRiskResult): RemediationRecommendation[] {
    const recommendations: RemediationRecommendation[] = [];

    for (const factor of image.riskFactors) {
      const rec = this.getRecommendationForFactor(factor, image);
      if (rec) {
        recommendations.push(rec);
      }
    }

    // Risk seviyesine göre sırala
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return recommendations;
  }

  private getRecommendationForFactor(
    factor: string,
    image: ImageRiskResult
  ): RemediationRecommendation | null {
    if (factor.includes("latest tag")) {
      return {
        riskFactor: factor,
        severity: "critical",
        recommendation:
          "Image'ınız 'latest' tag'ini kullanıyor. Bu, beklenmedik değişikliklere ve güvenlik açıklarına yol açabilir.",
        steps: [
          "Image'ınız için belirli bir versiyon tag'i kullanın (örn: v1.2.3)",
          "Semantic versioning kullanarak versiyonları yönetin",
          "CI/CD pipeline'ınızda otomatik tag atama yapın",
          "Production ortamında sadece test edilmiş versiyonları kullanın",
        ],
        resources: [
          "https://docs.docker.com/develop/dev-best-practices/",
          "https://semver.org/",
        ],
      };
    }

    if (factor.includes("non-production tag")) {
      return {
        riskFactor: factor,
        severity: "high",
        recommendation:
          "Image'ınız dev/debug/snapshot gibi non-production tag'leri içeriyor.",
        steps: [
          "Production ortamında sadece production-ready tag'ler kullanın",
          "Dev/test image'larını production namespace'lerinden kaldırın",
          "Image naming convention'ı oluşturun ve takip edin",
        ],
      };
    }

    if (factor.includes("Test image")) {
      return {
        riskFactor: factor,
        severity: "critical",
        recommendation:
          "Test image'ı production iş yükünde kullanılıyor. Bu ciddi bir güvenlik riskidir.",
        steps: [
          "Test image'ını hemen production'dan kaldırın",
          "Production için uygun image'ı deploy edin",
          "Test ve production image'larını ayrı registry'lerde tutun",
        ],
      };
    }

    if (factor.includes("production namespace")) {
      return {
        riskFactor: factor,
        severity: "high",
        recommendation:
          "Yüksek riskli image production namespace'inde çalışıyor.",
        steps: [
          "Image'ın risk faktörlerini gözden geçirin",
          "Gerekli güvenlik güncellemelerini yapın",
          "Production'a deploy etmeden önce staging'de test edin",
        ],
      };
    }

    if (factor.includes("Legacy image")) {
      return {
        riskFactor: factor,
        severity: "medium",
        recommendation:
          "Legacy image kullanımı güvenlik güncellemelerinin eksik olabileceğini gösterir.",
        steps: [
          "Image'ı güncel bir versiyona güncelleyin",
          "Güvenlik yamalarını kontrol edin ve uygulayın",
          "Legacy image'ları kademeli olarak kaldırın",
        ],
      };
    }

    if (factor.includes("older than 180 days")) {
      return {
        riskFactor: factor,
        severity: "medium",
        recommendation:
          "Image 180 günden daha eski. Bilinen güvenlik açıklarına karşı savunmasız olabilir.",
        steps: [
          "Image'ı güncel bir base image ile yeniden build edin",
          "Güvenlik açıklarını tarayın (örn: Trivy, Snyk)",
          "Düzenli olarak image'ları güncelleyin",
        ],
        resources: [
          "https://github.com/aquasecurity/trivy",
          "https://snyk.io/",
        ],
      };
    }

    if (factor.includes("root user")) {
      return {
        riskFactor: factor,
        severity: "critical",
        recommendation:
          "Image root kullanıcısı ile çalışıyor. Bu, bir güvenlik açığı durumunda sistem üzerinde tam kontrol riski taşır.",
        steps: [
          "Non-root kullanıcı oluşturun ve kullanın",
          "Dockerfile'da USER directive ekleyin",
          "Gerekli minimum izinleri verin",
          "Security context'leri kullanın (Kubernetes)",
        ],
        resources: [
          "https://docs.docker.com/develop/security-best-practices/",
          "https://kubernetes.io/docs/tasks/configure-pod-container/security-context/",
        ],
      };
    }

    if (factor.includes("unknown base image")) {
      return {
        riskFactor: factor,
        severity: "medium",
        recommendation:
          "Image bilinen bir base image kullanmıyor. İçeriğinin doğrulanması zorlaşır.",
        steps: [
          "Bilinen ve güvenilir base image'lar kullanın (örn: alpine, ubuntu, debian)",
          "Base image'ları düzenli olarak güncelleyin",
          "Image içeriğini düzenli olarak tarayın",
        ],
      };
    }

    return null;
  }

  /**
   * Tüm image'lar için genel öneriler
   */
  getGeneralRecommendations(images: ImageRiskResult[]): RemediationRecommendation[] {
    const recommendations: RemediationRecommendation[] = [];

    const latestTagCount = images.filter((img) =>
      img.riskFactors.some((f) => f.includes("latest tag"))
    ).length;

    if (latestTagCount > 0) {
      recommendations.push({
        riskFactor: "Multiple images use latest tag",
        severity: "high",
        recommendation: `${latestTagCount} image 'latest' tag kullanıyor. Bu genel bir güvenlik riskidir.`,
        steps: [
          "Tüm image'lar için versiyonlama stratejisi oluşturun",
          "CI/CD pipeline'larınızı güncelleyin",
          "Image registry'lerinizde versiyon yönetimi yapın",
        ],
      });
    }

    const rootUserCount = images.filter((img) =>
      img.riskFactors.some((f) => f.includes("root user"))
    ).length;

    if (rootUserCount > 0) {
      recommendations.push({
        riskFactor: "Multiple images use root user",
        severity: "critical",
        recommendation: `${rootUserCount} image root kullanıcısı ile çalışıyor.`,
        steps: [
          "Tüm image'ları non-root kullanıcıya geçirin",
          "Security policy'ler oluşturun",
          "Image build süreçlerinizi gözden geçirin",
        ],
      });
    }

    return recommendations;
  }
}

