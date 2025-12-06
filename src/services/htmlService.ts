import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { ComplianceAssessmentDocument } from "../persistence/compliance.model";
import { ReportTemplateDocument } from "../persistence/reportTemplate.model";
import { ReportType, ReportOptions } from "./pdfService";

export class HtmlService {
  /**
   * HTML raporu oluşturur
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
        return this.generateExecutiveReport(images, options);
      case "DETAILED":
        return this.generateDetailedReport(images, options);
      default:
        return this.generateRiskSummaryReport(images, options);
    }
  }

  /**
   * Risk özet HTML raporu oluşturur
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

    const primaryColor = template?.primaryColor || "#4472C4";
    const secondaryColor = template?.secondaryColor || "#6B7280";
    const accentColor = template?.accentColor || "#10B981";

    let html = this.getHtmlHeader(template, "Risk Özet Raporu");

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

      html += `
        <div class="summary-section">
          <h2 style="color: ${primaryColor}">Özet</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${images.length}</div>
              <div class="stat-label">Toplam Image</div>
            </div>
            <div class="stat-card" style="border-left-color: #ef4444">
              <div class="stat-value" style="color: #ef4444">${highCritical}</div>
              <div class="stat-label">HIGH/CRITICAL Risk</div>
            </div>
            <div class="stat-card" style="border-left-color: #fbbf24">
              <div class="stat-value" style="color: #fbbf24">${prodPods}</div>
              <div class="stat-label">Prod Pod Etkisi</div>
            </div>
          </div>
        </div>
      `;
    }

    // Risk Dağılımı
    if (contentOptions.includeRiskDistribution) {
      const riskDistribution = {
        CRITICAL: images.filter((img) => img.riskLevel === "CRITICAL").length,
        HIGH: images.filter((img) => img.riskLevel === "HIGH").length,
        MEDIUM: images.filter((img) => img.riskLevel === "MEDIUM").length,
        LOW: images.filter((img) => img.riskLevel === "LOW").length,
      };

      html += `
        <div class="section">
          <h2 style="color: ${primaryColor}">Risk Dağılımı</h2>
          <div class="risk-distribution">
            <div class="risk-item critical">
              <span class="risk-label">CRITICAL</span>
              <span class="risk-count">${riskDistribution.CRITICAL} (${((riskDistribution.CRITICAL / images.length) * 100).toFixed(1)}%)</span>
            </div>
            <div class="risk-item high">
              <span class="risk-label">HIGH</span>
              <span class="risk-count">${riskDistribution.HIGH} (${((riskDistribution.HIGH / images.length) * 100).toFixed(1)}%)</span>
            </div>
            <div class="risk-item medium">
              <span class="risk-label">MEDIUM</span>
              <span class="risk-count">${riskDistribution.MEDIUM} (${((riskDistribution.MEDIUM / images.length) * 100).toFixed(1)}%)</span>
            </div>
            <div class="risk-item low">
              <span class="risk-label">LOW</span>
              <span class="risk-count">${riskDistribution.LOW} (${((riskDistribution.LOW / images.length) * 100).toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      `;
    }

    // En Riskli Image'ler
    if (showTopRisky) {
      const sortedImages = [...images]
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, topRiskyCount);

      html += `
        <div class="section">
          <h2 style="color: ${primaryColor}">En Riskli ${Math.min(topRiskyCount, images.length)} Image</h2>
          <div class="images-table">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Image Name</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Pod Count</th>
                  <th>Risk Factors</th>
                </tr>
              </thead>
              <tbody>
      `;

      sortedImages.forEach((img, idx) => {
        const riskColor =
          img.riskLevel === "CRITICAL"
            ? "#ef4444"
            : img.riskLevel === "HIGH"
            ? "#f87171"
            : img.riskLevel === "MEDIUM"
            ? "#fbbf24"
            : "#10b981";

        html += `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${this.escapeHtml(img.imageName)}</strong></td>
            <td style="color: ${riskColor}; font-weight: bold">${img.riskScore}</td>
            <td><span class="badge badge-${img.riskLevel.toLowerCase()}">${img.riskLevel}</span></td>
            <td>${img.pods.length}</td>
            <td>${img.riskFactors.length > 0 ? this.escapeHtml(img.riskFactors.join(", ")) : "Yok"}</td>
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    html += this.getHtmlFooter(template);
    return html;
  }

  /**
   * Executive summary HTML raporu oluşturur
   */
  generateExecutiveReport(
    images: ImageRiskDocument[],
    stats: { totalImages: number; highOrCritical: number; prodImpactedPods: number; lastScanAt: Date | null },
    trends?: Array<{ startedAt: Date; finishedAt: Date; avgRiskScore: number; highOrCritical: number }>,
    options: ReportOptions = {}
  ): string {
    const template = options.template;
    const primaryColor = template?.primaryColor || "#4472C4";

    const avgRiskScore = images.reduce((sum, img) => sum + img.riskScore, 0) / images.length;
    const criticalImages = images.filter((img) => img.riskLevel === "CRITICAL").length;
    const highImages = images.filter((img) => img.riskLevel === "HIGH").length;

    let html = this.getHtmlHeader(template, "Executive Risk Summary");

    // Key Metrics
    html += `
      <div class="section">
        <h2 style="color: ${primaryColor}">Key Metrics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.totalImages}</div>
            <div class="stat-label">Toplam Image</div>
          </div>
          <div class="stat-card" style="border-left-color: #ef4444">
            <div class="stat-value" style="color: #ef4444">${criticalImages}</div>
            <div class="stat-label">Kritik Riskli</div>
          </div>
          <div class="stat-card" style="border-left-color: #f87171">
            <div class="stat-value" style="color: #f87171">${highImages}</div>
            <div class="stat-label">Yüksek Riskli</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${avgRiskScore.toFixed(1)}</div>
            <div class="stat-label">Ortalama Risk Skoru</div>
          </div>
          <div class="stat-card" style="border-left-color: #fbbf24">
            <div class="stat-value" style="color: #fbbf24">${stats.prodImpactedPods}</div>
            <div class="stat-label">Prod Pod Etkisi</div>
          </div>
        </div>
      </div>
    `;

    // Risk Dağılımı
    const riskDistribution = {
      CRITICAL: images.filter((img) => img.riskLevel === "CRITICAL").length,
      HIGH: images.filter((img) => img.riskLevel === "HIGH").length,
      MEDIUM: images.filter((img) => img.riskLevel === "MEDIUM").length,
      LOW: images.filter((img) => img.riskLevel === "LOW").length,
    };

    html += `
      <div class="section">
        <h2 style="color: ${primaryColor}">Risk Dağılımı</h2>
        <div class="risk-distribution">
          <div class="risk-item critical">
            <span class="risk-label">CRITICAL</span>
            <span class="risk-count">${riskDistribution.CRITICAL} (${((riskDistribution.CRITICAL / stats.totalImages) * 100).toFixed(1)}%)</span>
          </div>
          <div class="risk-item high">
            <span class="risk-label">HIGH</span>
            <span class="risk-count">${riskDistribution.HIGH} (${((riskDistribution.HIGH / stats.totalImages) * 100).toFixed(1)}%)</span>
          </div>
          <div class="risk-item medium">
            <span class="risk-label">MEDIUM</span>
            <span class="risk-count">${riskDistribution.MEDIUM} (${((riskDistribution.MEDIUM / stats.totalImages) * 100).toFixed(1)}%)</span>
          </div>
          <div class="risk-item low">
            <span class="risk-label">LOW</span>
            <span class="risk-count">${riskDistribution.LOW} (${((riskDistribution.LOW / stats.totalImages) * 100).toFixed(1)}%)</span>
          </div>
        </div>
      </div>
    `;

    // En Kritik 10 Image
    const topRisky = [...images]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    html += `
      <div class="section">
        <h2 style="color: ${primaryColor}">En Kritik 10 Image</h2>
        <div class="images-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Image Name</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
                <th>Pod Count</th>
              </tr>
            </thead>
            <tbody>
    `;

    topRisky.forEach((img, idx) => {
      const riskColor =
        img.riskLevel === "CRITICAL"
          ? "#ef4444"
          : img.riskLevel === "HIGH"
          ? "#f87171"
          : img.riskLevel === "MEDIUM"
          ? "#fbbf24"
          : "#10b981";

      html += `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${this.escapeHtml(img.imageName)}</strong></td>
          <td style="color: ${riskColor}; font-weight: bold">${img.riskScore}</td>
          <td><span class="badge badge-${img.riskLevel.toLowerCase()}">${img.riskLevel}</span></td>
          <td>${img.pods.length}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    html += this.getHtmlFooter(template);
    return html;
  }

  /**
   * Compliance HTML raporu oluşturur
   */
  generateComplianceReport(
    assessments: ComplianceAssessmentDocument[],
    options: ReportOptions
  ): string {
    const template = options.template;
    const primaryColor = template?.primaryColor || "#4472C4";

    let html = this.getHtmlHeader(template, "Compliance Raporu");

    const overallScore =
      assessments.reduce((sum, a) => sum + a.complianceScore, 0) / assessments.length;
    const passCount = assessments.filter((a) => a.overallStatus === "PASS").length;
    const failCount = assessments.filter((a) => a.overallStatus === "FAIL").length;

    html += `
      <div class="section">
        <h2 style="color: ${primaryColor}">Executive Summary</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${overallScore.toFixed(1)}%</div>
            <div class="stat-label">Ortalama Compliance Skoru</div>
          </div>
          <div class="stat-card" style="border-left-color: #10b981">
            <div class="stat-value" style="color: #10b981">${passCount}</div>
            <div class="stat-label">Geçen Standartlar</div>
          </div>
          <div class="stat-card" style="border-left-color: #ef4444">
            <div class="stat-value" style="color: #ef4444">${failCount}</div>
            <div class="stat-label">Başarısız Standartlar</div>
          </div>
        </div>
      </div>
    `;

    assessments.forEach((assessment) => {
      const statusColor =
        assessment.overallStatus === "PASS"
          ? "#10b981"
          : assessment.overallStatus === "FAIL"
          ? "#ef4444"
          : "#fbbf24";

      html += `
        <div class="section">
          <h2 style="color: ${primaryColor}">${assessment.standard} - ${assessment.version}</h2>
          <div class="compliance-status" style="border-left-color: ${statusColor}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <div style="font-size: 24px; font-weight: bold; color: ${statusColor}">
                  ${assessment.complianceScore}%
                </div>
                <div style="color: #6b7280">Compliance Skoru</div>
              </div>
              <div>
                <span class="badge badge-${assessment.overallStatus.toLowerCase()}" style="font-size: 14px; padding: 8px 16px">
                  ${assessment.overallStatus}
                </span>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px">
              <div>
                <div style="font-size: 18px; font-weight: bold">${assessment.totalRequirements}</div>
                <div style="color: #6b7280; font-size: 12px">Toplam</div>
              </div>
              <div>
                <div style="font-size: 18px; font-weight: bold; color: #10b981">${assessment.passedRequirements}</div>
                <div style="color: #6b7280; font-size: 12px">Geçti</div>
              </div>
              <div>
                <div style="font-size: 18px; font-weight: bold; color: #ef4444">${assessment.failedRequirements}</div>
                <div style="color: #6b7280; font-size: 12px">Başarısız</div>
              </div>
              <div>
                <div style="font-size: 18px; font-weight: bold; color: #fbbf24">${assessment.warningRequirements}</div>
                <div style="color: #6b7280; font-size: 12px">Uyarı</div>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    html += this.getHtmlFooter(template);
    return html;
  }

  /**
   * Detaylı analiz HTML raporu oluşturur
   */
  generateDetailedReport(
    images: ImageRiskDocument[],
    options: ReportOptions
  ): string {
    const template = options.template;
    const primaryColor = template?.primaryColor || "#4472C4";

    let html = this.getHtmlHeader(template, "Detaylı Risk Analiz Raporu");

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

    html += `
      <div class="section">
        <h2 style="color: ${primaryColor}">Kapsamlı İstatistikler</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Toplam Image</div>
          </div>
          <div class="stat-card" style="border-left-color: #ef4444">
            <div class="stat-value" style="color: #ef4444">${stats.critical}</div>
            <div class="stat-label">Kritik Risk</div>
          </div>
          <div class="stat-card" style="border-left-color: #f87171">
            <div class="stat-value" style="color: #f87171">${stats.high}</div>
            <div class="stat-label">Yüksek Risk</div>
          </div>
          <div class="stat-card" style="border-left-color: #fbbf24">
            <div class="stat-value" style="color: #fbbf24">${stats.medium}</div>
            <div class="stat-label">Orta Risk</div>
          </div>
          <div class="stat-card" style="border-left-color: #10b981">
            <div class="stat-value" style="color: #10b981">${stats.low}</div>
            <div class="stat-label">Düşük Risk</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.avgRiskScore.toFixed(2)}</div>
            <div class="stat-label">Ortalama Risk Skoru</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalPods}</div>
            <div class="stat-label">Toplam Pod</div>
          </div>
          <div class="stat-card" style="border-left-color: #fbbf24">
            <div class="stat-value" style="color: #fbbf24">${stats.prodPods}</div>
            <div class="stat-label">Prod Pod</div>
          </div>
        </div>
      </div>
    `;

    // Risk faktörü analizi
    const riskFactorCounts = new Map<string, number>();
    images.forEach((img) => {
      img.riskFactors.forEach((factor) => {
        riskFactorCounts.set(factor, (riskFactorCounts.get(factor) || 0) + 1);
      });
    });

    const sortedFactors = Array.from(riskFactorCounts.entries()).sort((a, b) => b[1] - a[1]);

    html += `
      <div class="section">
        <h2 style="color: ${primaryColor}">Risk Faktörü Analizi</h2>
        <div class="images-table">
          <table>
            <thead>
              <tr>
                <th>Risk Faktörü</th>
                <th>Image Sayısı</th>
                <th>Yüzde</th>
              </tr>
            </thead>
            <tbody>
    `;

    sortedFactors.slice(0, 10).forEach(([factor, count]) => {
      html += `
        <tr>
          <td>${this.escapeHtml(factor)}</td>
          <td>${count}</td>
          <td>${((count / stats.total) * 100).toFixed(1)}%</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    html += this.getHtmlFooter(template);
    return html;
  }

  /**
   * HTML header oluşturur
   */
  private getHtmlHeader(template: ReportTemplateDocument | undefined, title: string): string {
    const primaryColor = template?.primaryColor || "#4472C4";
    const secondaryColor = template?.secondaryColor || "#6B7280";
    const headerText = template?.headerText || title;
    const companyName = template?.companyName || "AutoPatch AI";

    return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(headerText)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid ${primaryColor};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      max-width: 120px;
      max-height: 60px;
    }
    .header-title {
      font-size: 28px;
      font-weight: bold;
      color: ${primaryColor};
    }
    .header-subtitle {
      color: ${secondaryColor};
      font-size: 14px;
      margin-top: 4px;
    }
    .section {
      margin-bottom: 40px;
    }
    h2 {
      font-size: 20px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid ${primaryColor};
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 14px;
      color: #6b7280;
    }
    .risk-distribution {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }
    .risk-item {
      padding: 16px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .risk-item.critical {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
    }
    .risk-item.high {
      background: #fff7ed;
      border-left: 4px solid #f87171;
    }
    .risk-item.medium {
      background: #fffbeb;
      border-left: 4px solid #fbbf24;
    }
    .risk-item.low {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
    }
    .risk-label {
      font-weight: 600;
      font-size: 14px;
    }
    .risk-count {
      font-size: 18px;
      font-weight: bold;
    }
    .images-table {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    th {
      background: ${primaryColor};
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
    }
    tr:hover {
      background: #f9fafb;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-critical {
      background: #fee2e2;
      color: #991b1b;
    }
    .badge-high {
      background: #fed7aa;
      color: #9a3412;
    }
    .badge-medium {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-low {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-pass {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-fail {
      background: #fee2e2;
      color: #991b1b;
    }
    .compliance-status {
      background: #f9fafb;
      padding: 24px;
      border-radius: 8px;
      border-left: 4px solid #10b981;
      margin-bottom: 24px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: ${secondaryColor};
      font-size: 12px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-content">
        <div>
          ${template?.logo ? `<img src="${template.logo}" alt="Logo" class="logo" />` : ""}
          <div class="header-title">${this.escapeHtml(headerText)}</div>
          <div class="header-subtitle">${this.escapeHtml(companyName)}</div>
        </div>
        <div style="text-align: right; color: ${secondaryColor}; font-size: 12px">
          ${new Date().toLocaleString("tr-TR")}
        </div>
      </div>
    </div>
  `;
  }

  /**
   * HTML footer oluşturur
   */
  private getHtmlFooter(template: ReportTemplateDocument | undefined): string {
    const footerText = template?.footerText || "";
    const companyContact = template?.companyContact || "";

    return `
    <div class="footer">
      ${footerText ? `<div style="margin-bottom: 8px">${this.escapeHtml(footerText)}</div>` : ""}
      ${companyContact ? `<div>${this.escapeHtml(companyContact)}</div>` : ""}
      <div style="margin-top: 8px; color: #9ca3af">
        AutoPatch AI - Risk Raporlama Sistemi
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * HTML escape helper
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

