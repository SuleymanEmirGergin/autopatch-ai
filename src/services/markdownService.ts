import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { ComplianceAssessmentDocument } from "../persistence/compliance.model";
import { ReportTemplateDocument } from "../persistence/reportTemplate.model";
import { ReportType, ReportOptions } from "./pdfService";

export class MarkdownService {
  /**
   * Markdown raporu oluşturur
   */
  generateReport(
    images: ImageRiskDocument[],
    options: ReportOptions = {}
  ): string {
    const reportType = options.type || "RISK_SUMMARY";

    switch (reportType) {
      case "COMPLIANCE":
        return this.generateComplianceReport(images as any, options);
      case "EXECUTIVE":
        // Executive report için stats gerekiyor, bu metod generateReport içinde kullanılmamalı
        throw new Error("Executive report için generateExecutiveReport metodunu kullanın");
      case "DETAILED":
        return this.generateDetailedReport(images, options);
      default:
        return this.generateRiskSummaryReport(images, options);
    }
  }

  /**
   * Risk özet Markdown raporu oluşturur
   */
  generateRiskSummaryReport(
    images: ImageRiskDocument[],
    options: ReportOptions
  ): string {
    const template = options.template;
    const contentOptions = template?.contentOptions || {};
    const showSummary = contentOptions.includeSummary !== false;
    const showTopRisky = contentOptions.includeTopRiskyImages !== false;
    const topRiskyCount = contentOptions.topRiskyCount || 10;

    const headerText = template?.headerText || "Risk Özet Raporu";
    const companyName = template?.companyName || "AutoPatch AI";
    const footerText = template?.footerText || "";

    let md = `# ${headerText}\n\n`;
    md += `**${companyName}**\n\n`;
    md += `*Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}*\n\n`;
    md += `---\n\n`;

    // Özet
    if (showSummary) {
      const highCritical = images.filter(
        (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
      ).length;
      const prodPods = images.reduce((sum, img) => {
        return (
          sum +
          img.pods.filter((p) => {
            const ns = p.namespace.toLowerCase();
            return ns === "prod" || ns.startsWith("prod-");
          }).length
        );
      }, 0);
      const avgRiskScore = images.reduce((sum, img) => sum + img.riskScore, 0) / images.length || 0;

      md += `## Özet\n\n`;
      md += `| Metrik | Değer |\n`;
      md += `|--------|-------|\n`;
      md += `| Toplam Image | **${images.length}** |\n`;
      md += `| HIGH/CRITICAL Risk | **${highCritical}** |\n`;
      md += `| Prod Pod Etkisi | **${prodPods}** |\n`;
      md += `| Ortalama Risk Skoru | **${avgRiskScore.toFixed(2)}** |\n\n`;
    }

    // Risk Dağılımı
    if (contentOptions.includeRiskDistribution) {
      const riskDistribution = {
        CRITICAL: images.filter((img) => img.riskLevel === "CRITICAL").length,
        HIGH: images.filter((img) => img.riskLevel === "HIGH").length,
        MEDIUM: images.filter((img) => img.riskLevel === "MEDIUM").length,
        LOW: images.filter((img) => img.riskLevel === "LOW").length,
      };

      md += `## Risk Dağılımı\n\n`;
      md += `| Risk Seviyesi | Sayı | Yüzde |\n`;
      md += `|---------------|------|-------|\n`;
      md += `| 🔴 CRITICAL | ${riskDistribution.CRITICAL} | ${((riskDistribution.CRITICAL / images.length) * 100).toFixed(1)}% |\n`;
      md += `| 🟠 HIGH | ${riskDistribution.HIGH} | ${((riskDistribution.HIGH / images.length) * 100).toFixed(1)}% |\n`;
      md += `| 🟡 MEDIUM | ${riskDistribution.MEDIUM} | ${((riskDistribution.MEDIUM / images.length) * 100).toFixed(1)}% |\n`;
      md += `| 🟢 LOW | ${riskDistribution.LOW} | ${((riskDistribution.LOW / images.length) * 100).toFixed(1)}% |\n\n`;
    }

    // En Riskli Image'ler
    if (showTopRisky) {
      const sortedImages = [...images]
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, topRiskyCount);

      md += `## En Riskli ${Math.min(topRiskyCount, images.length)} Image\n\n`;
      md += `| # | Image Name | Risk Score | Risk Level | Pod Count | Risk Factors |\n`;
      md += `|---|------------|------------|------------|-----------|--------------|\n`;

      sortedImages.forEach((img, idx) => {
        const riskEmoji =
          img.riskLevel === "CRITICAL"
            ? "🔴"
            : img.riskLevel === "HIGH"
            ? "🟠"
            : img.riskLevel === "MEDIUM"
            ? "🟡"
            : "🟢";

        md += `| ${idx + 1} | \`${this.escapeMarkdown(img.imageName)}\` | **${img.riskScore}** | ${riskEmoji} ${img.riskLevel} | ${img.pods.length} | ${img.riskFactors.length > 0 ? img.riskFactors.slice(0, 3).map(f => `\`${this.escapeMarkdown(f)}\``).join(", ") : "Yok"} |\n`;
      });

      md += `\n`;
    }

    // Risk Faktörü Analizi
    if (contentOptions.includeRiskFactorAnalysis) {
      const riskFactorCounts = new Map<string, number>();
      images.forEach((img) => {
        img.riskFactors.forEach((factor) => {
          riskFactorCounts.set(factor, (riskFactorCounts.get(factor) || 0) + 1);
        });
      });

      const sortedFactors = Array.from(riskFactorCounts.entries()).sort((a, b) => b[1] - a[1]);

      md += `## Risk Faktörü Analizi\n\n`;
      md += `| Risk Faktörü | Image Sayısı | Yüzde |\n`;
      md += `|--------------|--------------|-------|\n`;

      sortedFactors.slice(0, 10).forEach(([factor, count]) => {
        md += `| \`${this.escapeMarkdown(factor)}\` | ${count} | ${((count / images.length) * 100).toFixed(1)}% |\n`;
      });

      md += `\n`;
    }

    // Namespace Analizi
    if (contentOptions.includeNamespaceAnalysis) {
      const namespaceCounts = new Map<string, number>();
      images.forEach((img) => {
        img.pods.forEach((pod) => {
          namespaceCounts.set(pod.namespace, (namespaceCounts.get(pod.namespace) || 0) + 1);
        });
      });

      const sortedNamespaces = Array.from(namespaceCounts.entries()).sort((a, b) => b[1] - a[1]);

      md += `## Namespace Analizi\n\n`;
      md += `| Namespace | Pod Sayısı |\n`;
      md += `|-----------|------------|\n`;

      sortedNamespaces.slice(0, 10).forEach(([namespace, count]) => {
        md += `| \`${this.escapeMarkdown(namespace)}\` | ${count} |\n`;
      });

      md += `\n`;
    }

    // Öneriler
    if (contentOptions.includeRecommendations !== false) {
      md += `## Öneriler\n\n`;
      
      const criticalImages = images.filter((img) => img.riskLevel === "CRITICAL");
      if (criticalImages.length > 0) {
        md += `### 🔴 Kritik Riskli Image'ler\n\n`;
        md += `${criticalImages.length} adet kritik riskli image tespit edildi. Bu image'lerin acilen güncellenmesi veya değiştirilmesi önerilir:\n\n`;
        criticalImages.slice(0, 5).forEach((img) => {
          md += `- \`${this.escapeMarkdown(img.imageName)}\` (Risk Score: ${img.riskScore})\n`;
        });
        md += `\n`;
      }

      const prodImages = images.filter((img) =>
        img.pods.some((p) => {
          const ns = p.namespace.toLowerCase();
          return ns === "prod" || ns.startsWith("prod-");
        })
      );
      if (prodImages.length > 0) {
        md += `### ⚠️ Production Ortamında Riskli Image'ler\n\n`;
        md += `${prodImages.length} adet production ortamında kullanılan riskli image tespit edildi. Production ortamı için öncelikli olarak ele alınmalıdır.\n\n`;
      }

      md += `### 📋 Genel Öneriler\n\n`;
      md += `1. Düzenli olarak image'leri güncel tutun\n`;
      md += `2. Kritik güvenlik açıklarını (CVE) takip edin\n`;
      md += `3. Production ortamında kullanılan image'leri önceliklendirin\n`;
      md += `4. Risk skoru yüksek image'ler için alternatif çözümler değerlendirin\n`;
      md += `\n`;
    }

    if (footerText) {
      md += `---\n\n`;
      md += `*${footerText}*\n\n`;
    }

    md += `---\n\n`;
    md += `*Bu rapor AutoPatch AI tarafından otomatik olarak oluşturulmuştur.*\n`;

    return md;
  }

  /**
   * Executive summary Markdown raporu oluşturur
   */
  generateExecutiveReport(
    images: ImageRiskDocument[],
    stats: { totalImages: number; highOrCritical: number; prodImpactedPods: number; lastScanAt: Date | null },
    trends?: Array<{ startedAt: Date; finishedAt: Date; avgRiskScore: number; highOrCritical: number }>,
    options: ReportOptions = {}
  ): string {
    const template = options.template;
    const headerText = template?.headerText || "Executive Risk Summary";
    const companyName = template?.companyName || "AutoPatch AI";
    const footerText = template?.footerText || "";

    const avgRiskScore = images.reduce((sum, img) => sum + img.riskScore, 0) / images.length;
    const criticalImages = images.filter((img) => img.riskLevel === "CRITICAL").length;
    const highImages = images.filter((img) => img.riskLevel === "HIGH").length;

    let md = `# ${headerText}\n\n`;
    md += `**${companyName}**\n\n`;
    md += `*Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}*\n\n`;
    md += `---\n\n`;

    // Key Metrics
    md += `## Key Metrics\n\n`;
    md += `| Metrik | Değer |\n`;
    md += `|--------|-------|\n`;
    md += `| Toplam Image | **${stats.totalImages}** |\n`;
    md += `| Kritik Riskli | **${criticalImages}** |\n`;
    md += `| Yüksek Riskli | **${highImages}** |\n`;
    md += `| Ortalama Risk Skoru | **${avgRiskScore.toFixed(2)}** |\n`;
    md += `| Prod Pod Etkisi | **${stats.prodImpactedPods}** |\n\n`;

    // Risk Dağılımı
    const riskDistribution = {
      CRITICAL: images.filter((img) => img.riskLevel === "CRITICAL").length,
      HIGH: images.filter((img) => img.riskLevel === "HIGH").length,
      MEDIUM: images.filter((img) => img.riskLevel === "MEDIUM").length,
      LOW: images.filter((img) => img.riskLevel === "LOW").length,
    };

    md += `## Risk Dağılımı\n\n`;
    md += `| Risk Seviyesi | Sayı | Yüzde |\n`;
    md += `|---------------|------|-------|\n`;
    md += `| 🔴 CRITICAL | ${riskDistribution.CRITICAL} | ${((riskDistribution.CRITICAL / stats.totalImages) * 100).toFixed(1)}% |\n`;
    md += `| 🟠 HIGH | ${riskDistribution.HIGH} | ${((riskDistribution.HIGH / stats.totalImages) * 100).toFixed(1)}% |\n`;
    md += `| 🟡 MEDIUM | ${riskDistribution.MEDIUM} | ${((riskDistribution.MEDIUM / stats.totalImages) * 100).toFixed(1)}% |\n`;
    md += `| 🟢 LOW | ${riskDistribution.LOW} | ${((riskDistribution.LOW / stats.totalImages) * 100).toFixed(1)}% |\n\n`;

    // En Kritik 10 Image
    const topRisky = [...images]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    md += `## En Kritik 10 Image\n\n`;
    md += `| # | Image Name | Risk Score | Risk Level | Pod Count |\n`;
    md += `|---|------------|------------|------------|-----------|\n`;

    topRisky.forEach((img, idx) => {
      const riskEmoji =
        img.riskLevel === "CRITICAL"
          ? "🔴"
          : img.riskLevel === "HIGH"
          ? "🟠"
          : img.riskLevel === "MEDIUM"
          ? "🟡"
          : "🟢";

      md += `| ${idx + 1} | \`${this.escapeMarkdown(img.imageName)}\` | **${img.riskScore}** | ${riskEmoji} ${img.riskLevel} | ${img.pods.length} |\n`;
    });

    md += `\n`;

    // Executive Summary
    md += `## Executive Summary\n\n`;
    md += `Bu rapor, sistemdeki ${stats.totalImages} image'in risk analizini içermektedir. `;
    md += `${criticalImages + highImages} adet kritik veya yüksek riskli image tespit edilmiştir. `;
    md += `Production ortamında ${stats.prodImpactedPods} pod etkilenmektedir.\n\n`;
    md += `**Öncelikli Aksiyonlar:**\n\n`;
    md += `1. Kritik riskli image'lerin acilen güncellenmesi\n`;
    md += `2. Production ortamındaki riskli image'lerin önceliklendirilmesi\n`;
    md += `3. Düzenli güvenlik taramalarının sürdürülmesi\n\n`;

    if (footerText) {
      md += `---\n\n`;
      md += `*${footerText}*\n\n`;
    }

    md += `---\n\n`;
    md += `*Bu rapor AutoPatch AI tarafından otomatik olarak oluşturulmuştur.*\n`;

    return md;
  }

  /**
   * Compliance Markdown raporu oluşturur
   */
  generateComplianceReport(
    assessments: ComplianceAssessmentDocument[],
    options: ReportOptions
  ): string {
    const template = options.template;
    const headerText = template?.headerText || "Compliance Raporu";
    const companyName = template?.companyName || "AutoPatch AI";
    const footerText = template?.footerText || "";

    const overallScore =
      assessments.reduce((sum, a) => sum + a.complianceScore, 0) / assessments.length;
    const passCount = assessments.filter((a) => a.overallStatus === "PASS").length;
    const failCount = assessments.filter((a) => a.overallStatus === "FAIL").length;

    let md = `# ${headerText}\n\n`;
    md += `**${companyName}**\n\n`;
    md += `*Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}*\n\n`;
    md += `---\n\n`;

    // Executive Summary
    md += `## Executive Summary\n\n`;
    md += `| Metrik | Değer |\n`;
    md += `|--------|-------|\n`;
    md += `| Ortalama Compliance Skoru | **${overallScore.toFixed(1)}%** |\n`;
    md += `| ✅ Geçen Standartlar | **${passCount}** |\n`;
    md += `| ❌ Başarısız Standartlar | **${failCount}** |\n\n`;

    // Her bir assessment için detay
    assessments.forEach((assessment) => {
      const statusEmoji =
        assessment.overallStatus === "PASS"
          ? "✅"
          : assessment.overallStatus === "FAIL"
          ? "❌"
          : "⚠️";

      md += `## ${statusEmoji} ${assessment.standard} - ${assessment.version}\n\n`;
      md += `**Compliance Skoru:** ${assessment.complianceScore}%\n\n`;
      md += `| Durum | Sayı |\n`;
      md += `|-------|------|\n`;
      md += `| Toplam Gereksinim | ${assessment.totalRequirements} |\n`;
      md += `| ✅ Geçti | ${assessment.passedRequirements} |\n`;
      md += `| ❌ Başarısız | ${assessment.failedRequirements} |\n`;
      md += `| ⚠️ Uyarı | ${assessment.warningRequirements} |\n\n`;

      // Başarısız gereksinimler
      if (assessment.failedRequirements > 0 && assessment.requirements) {
        md += `### Başarısız Gereksinimler\n\n`;
        assessment.requirements
          .filter((r) => r.status === "FAIL")
          .slice(0, 10)
          .forEach((req) => {
            md += `- ❌ **${req.id}**: ${this.escapeMarkdown(req.description)}\n`;
          });
        md += `\n`;
      }
    });

    if (footerText) {
      md += `---\n\n`;
      md += `*${footerText}*\n\n`;
    }

    md += `---\n\n`;
    md += `*Bu rapor AutoPatch AI tarafından otomatik olarak oluşturulmuştur.*\n`;

    return md;
  }

  /**
   * Detaylı analiz Markdown raporu oluşturur
   */
  generateDetailedReport(
    images: ImageRiskDocument[],
    options: ReportOptions
  ): string {
    const template = options.template;
    const headerText = template?.headerText || "Detaylı Risk Analiz Raporu";
    const companyName = template?.companyName || "AutoPatch AI";
    const footerText = template?.footerText || "";

    const stats = {
      total: images.length,
      critical: images.filter((img) => img.riskLevel === "CRITICAL").length,
      high: images.filter((img) => img.riskLevel === "HIGH").length,
      medium: images.filter((img) => img.riskLevel === "MEDIUM").length,
      low: images.filter((img) => img.riskLevel === "LOW").length,
      avgRiskScore: images.reduce((sum, img) => sum + img.riskScore, 0) / images.length,
      totalPods: images.reduce((sum, img) => sum + img.pods.length, 0),
      prodPods: images.reduce((sum, img) => {
        return (
          sum +
          img.pods.filter((p) => {
            const ns = p.namespace.toLowerCase();
            return ns === "prod" || ns.startsWith("prod-");
          }).length
        );
      }, 0),
    };

    let md = `# ${headerText}\n\n`;
    md += `**${companyName}**\n\n`;
    md += `*Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}*\n\n`;
    md += `---\n\n`;

    // Kapsamlı İstatistikler
    md += `## Kapsamlı İstatistikler\n\n`;
    md += `| Metrik | Değer |\n`;
    md += `|--------|-------|\n`;
    md += `| Toplam Image | **${stats.total}** |\n`;
    md += `| 🔴 Kritik Risk | **${stats.critical}** |\n`;
    md += `| 🟠 Yüksek Risk | **${stats.high}** |\n`;
    md += `| 🟡 Orta Risk | **${stats.medium}** |\n`;
    md += `| 🟢 Düşük Risk | **${stats.low}** |\n`;
    md += `| Ortalama Risk Skoru | **${stats.avgRiskScore.toFixed(2)}** |\n`;
    md += `| Toplam Pod | **${stats.totalPods}** |\n`;
    md += `| Prod Pod | **${stats.prodPods}** |\n\n`;

    // Risk faktörü analizi
    const riskFactorCounts = new Map<string, number>();
    images.forEach((img) => {
      img.riskFactors.forEach((factor) => {
        riskFactorCounts.set(factor, (riskFactorCounts.get(factor) || 0) + 1);
      });
    });

    const sortedFactors = Array.from(riskFactorCounts.entries()).sort((a, b) => b[1] - a[1]);

    md += `## Risk Faktörü Analizi\n\n`;
    md += `| Risk Faktörü | Image Sayısı | Yüzde |\n`;
    md += `|--------------|--------------|-------|\n`;

    sortedFactors.slice(0, 20).forEach(([factor, count]) => {
      md += `| \`${this.escapeMarkdown(factor)}\` | ${count} | ${((count / stats.total) * 100).toFixed(1)}% |\n`;
    });

    md += `\n`;

    // Namespace analizi
    const namespaceCounts = new Map<string, number>();
    images.forEach((img) => {
      img.pods.forEach((pod) => {
        namespaceCounts.set(pod.namespace, (namespaceCounts.get(pod.namespace) || 0) + 1);
      });
    });

    const sortedNamespaces = Array.from(namespaceCounts.entries()).sort((a, b) => b[1] - a[1]);

    md += `## Namespace Analizi\n\n`;
    md += `| Namespace | Pod Sayısı |\n`;
    md += `|-----------|------------|\n`;

    sortedNamespaces.forEach(([namespace, count]) => {
      md += `| \`${this.escapeMarkdown(namespace)}\` | ${count} |\n`;
    });

    md += `\n`;

    // Tüm Image'lerin listesi
    md += `## Tüm Image'ler\n\n`;
    md += `| # | Image Name | Risk Score | Risk Level | Pod Count | Risk Factors |\n`;
    md += `|---|------------|------------|------------|-----------|--------------|\n`;

    const sortedImages = [...images].sort((a, b) => b.riskScore - a.riskScore);
    sortedImages.forEach((img, idx) => {
      const riskEmoji =
        img.riskLevel === "CRITICAL"
          ? "🔴"
          : img.riskLevel === "HIGH"
          ? "🟠"
          : img.riskLevel === "MEDIUM"
          ? "🟡"
          : "🟢";

      md += `| ${idx + 1} | \`${this.escapeMarkdown(img.imageName)}\` | **${img.riskScore}** | ${riskEmoji} ${img.riskLevel} | ${img.pods.length} | ${img.riskFactors.length > 0 ? img.riskFactors.slice(0, 2).map(f => `\`${this.escapeMarkdown(f)}\``).join(", ") : "Yok"} |\n`;
    });

    md += `\n`;

    if (footerText) {
      md += `---\n\n`;
      md += `*${footerText}*\n\n`;
    }

    md += `---\n\n`;
    md += `*Bu rapor AutoPatch AI tarafından otomatik olarak oluşturulmuştur.*\n`;

    return md;
  }

  /**
   * Markdown escape helper
   */
  private escapeMarkdown(text: string): string {
    return text
      .replace(/\|/g, "\\|")
      .replace(/\`/g, "\\`")
      .replace(/\*/g, "\\*")
      .replace(/\_/g, "\\_")
      .replace(/\#/g, "\\#")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]");
  }
}

