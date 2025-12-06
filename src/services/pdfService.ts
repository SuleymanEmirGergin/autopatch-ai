import PDFDocument from "pdfkit";
import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { ComplianceAssessmentDocument } from "../persistence/compliance.model";
import { ReportTemplateDocument } from "../persistence/reportTemplate.model";

export type ReportType = "RISK_SUMMARY" | "COMPLIANCE" | "EXECUTIVE" | "DETAILED";

export interface ReportOptions {
  type?: ReportType;
  title?: string;
  includeCharts?: boolean;
  includeTrends?: boolean;
  clusterId?: string;
  projectId?: string;
  template?: ReportTemplateDocument; // Şablon desteği
}

export class PdfService {
  generateReport(
    images: ImageRiskDocument[],
    options: ReportOptions = {}
  ): InstanceType<typeof PDFDocument> {
    const reportType = options.type || "RISK_SUMMARY";

    switch (reportType) {
      case "COMPLIANCE":
        return this.generateComplianceReport(images, options);
      case "EXECUTIVE":
        return this.generateExecutiveReport(images, options);
      case "DETAILED":
        return this.generateDetailedReport(images, options);
      default:
        return this.generateRiskSummaryReport(images, options);
    }
  }

  /**
   * PDF'e header ekler (logo, şirket bilgileri)
   */
  private addHeader(doc: InstanceType<typeof PDFDocument>, template: ReportTemplateDocument, fontSize: any): void {
    const pageWidth = doc.page.width;
    const margin = doc.page.margins.left;
    const fontFamily = template.pdfOptions?.fontFamily || "Helvetica";

    // Logo ekleme (eğer varsa)
    if (template.logo) {
      try {
        // Base64 logo desteği
        if (template.logo.startsWith("data:image")) {
          const base64Data = template.logo.split(",")[1];
          const imageBuffer = Buffer.from(base64Data, "base64");
          doc.image(imageBuffer, margin, margin, { width: 60, height: 60 });
        } else if (template.logo.startsWith("http")) {
          // URL logo desteği (basit implementasyon, production'da daha gelişmiş olmalı)
          // Şimdilik atlıyoruz, çünkü PDFKit URL'den direkt image yükleyemez
        }
      } catch (err) {
        console.error("Logo eklenirken hata:", err);
      }
    }

    // Şirket bilgileri
    if (template.companyName) {
      doc.fontSize(fontSize.heading || 14)
        .font(`${fontFamily}-Bold`)
        .fillColor(template.primaryColor || "#000000")
        .text(template.companyName, margin + 70, margin, { width: pageWidth - margin * 2 - 70 });
    }
  }

  /**
   * PDF'e footer ekler
   */
  private addFooter(doc: InstanceType<typeof PDFDocument>, template: ReportTemplateDocument, fontSize: any): void {
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;
    const margin = doc.page.margins.bottom;
    const fontFamily = template.pdfOptions?.fontFamily || "Helvetica";
    const footerY = pageHeight - margin - 20;

    // Her sayfada footer eklemek için event listener kullan
    let pageCount = 0;
    doc.on("pageAdded", () => {
      pageCount++;
      const currentPage = doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1;
      
      // Footer text
      if (template.footerText) {
        doc.fontSize(fontSize.body || 10)
          .font(fontFamily)
          .fillColor(template.secondaryColor || "#666666")
          .text(template.footerText, doc.page.margins.left, footerY, {
            align: "center",
            width: pageWidth - doc.page.margins.left - doc.page.margins.right,
          });
      }

      // Şirket iletişim bilgileri
      if (template.companyContact) {
        doc.fontSize(fontSize.body || 9)
          .font(fontFamily)
          .fillColor(template.secondaryColor || "#666666")
          .text(template.companyContact, doc.page.margins.left, footerY + 15, {
            align: "center",
            width: pageWidth - doc.page.margins.left - doc.page.margins.right,
          });
      }

      // Sayfa numarası
      doc.fontSize(fontSize.body || 9)
        .font(fontFamily)
        .fillColor(template.secondaryColor || "#666666")
        .text(`Sayfa ${currentPage + 1}`, doc.page.margins.left, footerY + 30, {
          align: "center",
          width: pageWidth - doc.page.margins.left - doc.page.margins.right,
        });
    });

    // İlk sayfa için footer ekle
    if (template.footerText || template.companyContact) {
      doc.fontSize(fontSize.body || 10)
        .font(fontFamily)
        .fillColor(template.secondaryColor || "#666666");
      
      if (template.footerText) {
        doc.text(template.footerText, doc.page.margins.left, footerY, {
          align: "center",
          width: pageWidth - doc.page.margins.left - doc.page.margins.right,
        });
      }
      
      if (template.companyContact) {
        doc.fontSize(fontSize.body || 9)
          .text(template.companyContact, doc.page.margins.left, footerY + 15, {
            align: "center",
            width: pageWidth - doc.page.margins.left - doc.page.margins.right,
          });
      }
      
      doc.fontSize(fontSize.body || 9)
        .text("Sayfa 1", doc.page.margins.left, footerY + 30, {
          align: "center",
          width: pageWidth - doc.page.margins.left - doc.page.margins.right,
        });
    }
  }

  private generateRiskSummaryReport(
    images: ImageRiskDocument[],
    options: ReportOptions
  ): InstanceType<typeof PDFDocument> {
    const template = options.template;
    const pdfOptions = template?.pdfOptions || {};
    const margins = pdfOptions.margin || { top: 50, bottom: 50, left: 50, right: 50 };
    const fontSize = pdfOptions.fontSize || { title: 20, heading: 14, body: 10 };
    const fontFamily = pdfOptions.fontFamily || "Helvetica";
    const pageSize = pdfOptions.pageSize === "LETTER" ? [612, 792] : [595, 842]; // A4 default
    const orientation = pdfOptions.orientation === "landscape" ? [pageSize[1], pageSize[0]] : pageSize;

    const doc = new PDFDocument({
      size: orientation,
      margin: margins.top,
      margins: {
        top: margins.top || 50,
        bottom: margins.bottom || 50,
        left: margins.left || 50,
        right: margins.right || 50,
      },
    });

    // Şablon varsa logo ve header ekle
    if (template) {
      this.addHeader(doc, template, fontSize);
    }

    // Başlık
    const titleColor = template?.primaryColor || "#000000";
    doc.fontSize(fontSize.title || 20)
      .font(`${fontFamily}-Bold`)
      .fillColor(titleColor)
      .text(template?.headerText || "AutoPatch AI - Risk Raporu", { align: "center" });
    doc.fillColor("black");
    doc.moveDown();
    doc.fontSize(fontSize.body || 12)
      .font(fontFamily)
      .text(`Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}`, {
        align: "center",
      });
    doc.moveDown(2);

    // İçerik seçenekleri kontrolü
    const contentOptions = template?.contentOptions || {};
    const showSummary = contentOptions.includeSummary !== false; // Default true
    const showTopRisky = contentOptions.includeTopRiskyImages !== false; // Default true
    const topRiskyCount = contentOptions.topRiskyCount || 10;

    // Özet (eğer şablon izin veriyorsa)
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

      const headingColor = template?.primaryColor || "#000000";
      doc.fontSize(fontSize.heading || 14)
        .font(`${fontFamily}-Bold`)
        .fillColor(headingColor)
        .text("Özet", { underline: true });
      doc.fillColor("black");
      doc.fontSize(fontSize.body || 10).font(fontFamily);
      doc.text(`Toplam Image Sayısı: ${images.length}`);
      doc.text(`HIGH/CRITICAL Risk: ${highCritical}`);
      doc.text(`Prod Pod Etkisi: ${prodPods}`);
      doc.moveDown(2);
    }

    // Risk Dağılımı (eğer şablon izin veriyorsa)
    if (contentOptions.includeRiskDistribution) {
      const headingColor = template?.primaryColor || "#000000";
      doc.fontSize(fontSize.heading || 14)
        .font(`${fontFamily}-Bold`)
        .fillColor(headingColor)
        .text("Risk Dağılımı", { underline: true });
      doc.fillColor("black");
      doc.fontSize(fontSize.body || 10).font(fontFamily);
      
      const riskDistribution = {
        CRITICAL: images.filter((img) => img.riskLevel === "CRITICAL").length,
        HIGH: images.filter((img) => img.riskLevel === "HIGH").length,
        MEDIUM: images.filter((img) => img.riskLevel === "MEDIUM").length,
        LOW: images.filter((img) => img.riskLevel === "LOW").length,
      };

      const accentColor = template?.accentColor || "#ef4444";
      doc.fillColor(accentColor).text(`🔴 CRITICAL: ${riskDistribution.CRITICAL} (${((riskDistribution.CRITICAL / images.length) * 100).toFixed(1)}%)`);
      doc.fillColor("#f87171").text(`🟠 HIGH: ${riskDistribution.HIGH} (${((riskDistribution.HIGH / images.length) * 100).toFixed(1)}%)`);
      doc.fillColor("#fbbf24").text(`🟡 MEDIUM: ${riskDistribution.MEDIUM} (${((riskDistribution.MEDIUM / images.length) * 100).toFixed(1)}%)`);
      doc.fillColor("#10b981").text(`🟢 LOW: ${riskDistribution.LOW} (${((riskDistribution.LOW / images.length) * 100).toFixed(1)}%)`);
      doc.fillColor("black");
      doc.moveDown(2);
    }

    // Image listesi (eğer şablon izin veriyorsa)
    if (showTopRisky) {
      const headingColor = template?.primaryColor || "#000000";
      doc.fontSize(fontSize.heading || 14)
        .font(`${fontFamily}-Bold`)
        .fillColor(headingColor)
        .text(`En Riskli ${Math.min(topRiskyCount, images.length)} Image`, { underline: true });
      doc.fillColor("black");
      doc.moveDown();

      const sortedImages = [...images].sort((a, b) => b.riskScore - a.riskScore).slice(0, topRiskyCount);

      sortedImages.forEach((img, idx) => {
        if (idx > 0 && idx % 3 === 0) {
          doc.addPage();
          if (template) {
            this.addHeader(doc, template, fontSize);
          }
        }

        doc.fontSize(fontSize.heading || 12)
          .font(`${fontFamily}-Bold`)
          .text(`${idx + 1}. ${img.imageName}`);
        doc.font(fontFamily).fontSize(fontSize.body || 10);

        const riskColor =
          img.riskLevel === "CRITICAL"
            ? "#ef4444"
            : img.riskLevel === "HIGH"
            ? "#f87171"
            : img.riskLevel === "MEDIUM"
            ? "#fbbf24"
            : "#10b981";

        doc.fillColor(riskColor).text(`Risk: ${img.riskScore} (${img.riskLevel})`);
        doc.fillColor("black");

        doc.text(`Pod Sayısı: ${img.pods.length}`);
        doc.text(`Risk Faktörleri: ${img.riskFactors.join(", ") || "Yok"}`);
        doc.text(
          `Son Tarama: ${new Date(img.lastScannedAt).toLocaleString("tr-TR")}`
        );
        doc.moveDown();
      });
    }

    // Footer ekle
    if (template) {
      this.addFooter(doc, template, fontSize);
    }

    return doc;
  }

  /**
   * Compliance raporu oluşturur
   */
  generateComplianceReport(
    assessments: ComplianceAssessmentDocument[],
    options: ReportOptions = {}
  ): InstanceType<typeof PDFDocument> {
    const template = options.template;
    const pdfOptions = template?.pdfOptions || {};
    const margins = pdfOptions.margin || { top: 50, bottom: 50, left: 50, right: 50 };
    const fontSize = pdfOptions.fontSize || { title: 24, heading: 16, body: 12 };
    const fontFamily = pdfOptions.fontFamily || "Helvetica";
    const pageSize = pdfOptions.pageSize === "LETTER" ? [612, 792] : [595, 842];
    const orientation = pdfOptions.orientation === "landscape" ? [pageSize[1], pageSize[0]] : pageSize;

    const doc = new PDFDocument({
      size: orientation,
      margin: margins.top,
      margins: {
        top: margins.top || 50,
        bottom: margins.bottom || 50,
        left: margins.left || 50,
        right: margins.right || 50,
      },
    });

    // Şablon varsa header ekle
    if (template) {
      this.addHeader(doc, template, fontSize);
    }

    // Başlık
    const titleColor = template?.primaryColor || "#000000";
    doc.fontSize(fontSize.title || 24)
      .font(`${fontFamily}-Bold`)
      .fillColor(titleColor)
      .text(template?.headerText || "Compliance Raporu", { align: "center" });
    doc.fillColor("black");
    doc.moveDown();
    doc.fontSize(fontSize.body || 12)
      .font(fontFamily)
      .text(`Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}`, {
        align: "center",
      });
    doc.moveDown(2);

    // Executive Summary
    doc.fontSize(16).font("Helvetica-Bold").text("Executive Summary", { underline: true });
    doc.moveDown();

    const overallScore = assessments.reduce((sum, a) => sum + a.complianceScore, 0) / assessments.length;
    const passCount = assessments.filter((a) => a.overallStatus === "PASS").length;
    const failCount = assessments.filter((a) => a.overallStatus === "FAIL").length;

    doc.fontSize(12);
    doc.text(`Ortalama Compliance Skoru: ${overallScore.toFixed(1)}%`);
    doc.text(`Geçen Standartlar: ${passCount}/${assessments.length}`);
    doc.text(`Başarısız Standartlar: ${failCount}/${assessments.length}`);
    doc.moveDown(2);

    // Her standart için detay
    assessments.forEach((assessment, idx) => {
      if (idx > 0) doc.addPage();

      doc.fontSize(18).font("Helvetica-Bold").text(`${assessment.standard} - ${assessment.version}`, {
        underline: true,
      });
      doc.moveDown();

      // Skor ve durum
      const statusColor =
        assessment.overallStatus === "PASS"
          ? "#10b981"
          : assessment.overallStatus === "FAIL"
          ? "#ef4444"
          : "#fbbf24";

      doc.fontSize(14);
      doc.fillColor(statusColor).text(`Compliance Skoru: ${assessment.complianceScore}%`);
      doc.fillColor("black");
      doc.text(`Durum: ${assessment.overallStatus}`);
      doc.text(`Değerlendirme Tarihi: ${new Date(assessment.assessedAt).toLocaleString("tr-TR")}`);
      doc.moveDown();

      // Gereksinim özeti
      doc.fontSize(12).font("Helvetica-Bold").text("Gereksinim Özeti");
      doc.font("Helvetica");
      doc.text(`Toplam: ${assessment.totalRequirements}`);
      doc.fillColor("#10b981").text(`✅ Geçti: ${assessment.passedRequirements}`);
      doc.fillColor("#ef4444").text(`❌ Başarısız: ${assessment.failedRequirements}`);
      doc.fillColor("#fbbf24").text(`⚠️ Uyarı: ${assessment.warningRequirements}`);
      doc.fillColor("black");
      doc.moveDown();

      // Kritik gereksinimler
      const criticalFailures = assessment.requirements.filter(
        (r) => r.severity === "CRITICAL" && r.status === "FAIL"
      );
      if (criticalFailures.length > 0) {
        doc.fontSize(12).font("Helvetica-Bold").text("Kritik Başarısızlıklar", { underline: true });
        doc.font("Helvetica");
        criticalFailures.forEach((req) => {
          doc.text(`• ${req.id}: ${req.title}`, { indent: 20 });
          if (req.notes) {
            doc.fontSize(10).fillColor("#666").text(`  ${req.notes}`, { indent: 30 });
            doc.fillColor("black").fontSize(12);
          }
        });
        doc.moveDown();
      }

      // Tüm gereksinimler
      doc.fontSize(12).font("Helvetica-Bold").text("Tüm Gereksinimler", { underline: true });
      doc.font("Helvetica");
      assessment.requirements.forEach((req) => {
        const reqStatusColor =
          req.status === "PASS"
            ? "#10b981"
            : req.status === "FAIL"
            ? "#ef4444"
            : req.status === "WARNING"
            ? "#fbbf24"
            : "#6b7280";

        doc.fillColor(reqStatusColor);
        doc.text(`${req.status === "PASS" ? "✅" : req.status === "FAIL" ? "❌" : "⚠️"} ${req.id}: ${req.title}`);
        doc.fillColor("black");
        doc.fontSize(10).text(`   ${req.description}`, { indent: 20 });
        if (req.notes) {
          doc.fillColor("#666").text(`   Not: ${req.notes}`, { indent: 20 });
          doc.fillColor("black");
        }
        doc.fontSize(12);
        doc.moveDown(0.5);
      });
    });

    // Footer ekle
    if (template) {
      this.addFooter(doc, template, fontSize);
    }

    return doc;
  }

  /**
   * Executive summary raporu oluşturur
   */
  generateExecutiveReport(
    images: ImageRiskDocument[],
    stats: { totalImages: number; highOrCritical: number; prodImpactedPods: number; lastScanAt: Date | null },
    trends?: Array<{ startedAt: Date; finishedAt: Date; avgRiskScore: number; highOrCritical: number }>,
    options: ReportOptions = {}
  ): InstanceType<typeof PDFDocument> {
    const template = options.template;
    const pdfOptions = template?.pdfOptions || {};
    const margins = pdfOptions.margin || { top: 50, bottom: 50, left: 50, right: 50 };
    const fontSize = pdfOptions.fontSize || { title: 28, heading: 18, body: 14 };
    const fontFamily = pdfOptions.fontFamily || "Helvetica";
    const pageSize = pdfOptions.pageSize === "LETTER" ? [612, 792] : [595, 842];
    const orientation = pdfOptions.orientation === "landscape" ? [pageSize[1], pageSize[0]] : pageSize;

    const doc = new PDFDocument({
      size: orientation,
      margin: margins.top,
      margins: {
        top: margins.top || 50,
        bottom: margins.bottom || 50,
        left: margins.left || 50,
        right: margins.right || 50,
      },
    });

    // Şablon varsa header ekle
    if (template) {
      this.addHeader(doc, template, fontSize);
    }

    // Kapak sayfası
    const titleColor = template?.primaryColor || "#000000";
    doc.fontSize(fontSize.title || 28)
      .font(`${fontFamily}-Bold`)
      .fillColor(titleColor)
      .text(template?.companyName || "AutoPatch AI", { align: "center" });
    doc.fillColor("black");
    doc.moveDown();
    doc.fontSize(fontSize.heading || 20)
      .font(`${fontFamily}-Bold`)
      .text(template?.headerText || "Executive Risk Summary", { align: "center" });
    doc.moveDown(2);
    doc.fontSize(fontSize.body || 14)
      .font(fontFamily)
      .text(`Rapor Tarihi: ${new Date().toLocaleString("tr-TR")}`, {
        align: "center",
      });
    doc.moveDown(4);

    // Key Metrics
    doc.fontSize(18).font("Helvetica-Bold").text("Key Metrics", { underline: true });
    doc.moveDown();

    const avgRiskScore = images.reduce((sum, img) => sum + img.riskScore, 0) / images.length;
    const criticalImages = images.filter((img) => img.riskLevel === "CRITICAL").length;
    const highImages = images.filter((img) => img.riskLevel === "HIGH").length;

    doc.fontSize(14);
    doc.text(`📊 Toplam Image Sayısı: ${stats.totalImages}`);
    doc.text(`⚠️ Kritik Riskli Image'ler: ${criticalImages}`);
    doc.text(`🔴 Yüksek Riskli Image'ler: ${highImages}`);
    doc.text(`📈 Ortalama Risk Skoru: ${avgRiskScore.toFixed(1)}`);
    doc.text(`🏭 Prod Pod Etkisi: ${stats.prodImpactedPods}`);
    doc.moveDown(2);

    // Risk Dağılımı
    doc.fontSize(18).font("Helvetica-Bold").text("Risk Dağılımı", { underline: true });
    doc.moveDown();

    const riskDistribution = {
      CRITICAL: images.filter((img) => img.riskLevel === "CRITICAL").length,
      HIGH: images.filter((img) => img.riskLevel === "HIGH").length,
      MEDIUM: images.filter((img) => img.riskLevel === "MEDIUM").length,
      LOW: images.filter((img) => img.riskLevel === "LOW").length,
    };

    doc.fontSize(12);
    doc.fillColor("#ef4444").text(`🔴 CRITICAL: ${riskDistribution.CRITICAL} (${((riskDistribution.CRITICAL / stats.totalImages) * 100).toFixed(1)}%)`);
    doc.fillColor("#f87171").text(`🟠 HIGH: ${riskDistribution.HIGH} (${((riskDistribution.HIGH / stats.totalImages) * 100).toFixed(1)}%)`);
    doc.fillColor("#fbbf24").text(`🟡 MEDIUM: ${riskDistribution.MEDIUM} (${((riskDistribution.MEDIUM / stats.totalImages) * 100).toFixed(1)}%)`);
    doc.fillColor("#10b981").text(`🟢 LOW: ${riskDistribution.LOW} (${((riskDistribution.LOW / stats.totalImages) * 100).toFixed(1)}%)`);
    doc.fillColor("black");
    doc.moveDown(2);

    // En Kritik 10 Image
    doc.fontSize(18).font("Helvetica-Bold").text("En Kritik 10 Image", { underline: true });
    doc.moveDown();

    const topRisky = [...images]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    doc.fontSize(11);
    topRisky.forEach((img, idx) => {
      const riskColor =
        img.riskLevel === "CRITICAL"
          ? "#ef4444"
          : img.riskLevel === "HIGH"
          ? "#f87171"
          : img.riskLevel === "MEDIUM"
          ? "#fbbf24"
          : "#10b981";

      doc.fillColor(riskColor).font("Helvetica-Bold");
      doc.text(`${idx + 1}. ${img.imageName} - Risk: ${img.riskScore} (${img.riskLevel})`);
      doc.fillColor("black").font("Helvetica");
      doc.fontSize(10);
      doc.text(`   Pod Sayısı: ${img.pods.length} | Risk Faktörleri: ${img.riskFactors.length}`);
      doc.fontSize(11);
      doc.moveDown(0.5);
    });

    // Trend analizi (eğer varsa)
    if (trends && trends.length > 0) {
      doc.addPage();
      doc.fontSize(18).font("Helvetica-Bold").text("Trend Analizi", { underline: true });
      doc.moveDown();

      const latestTrend = trends[trends.length - 1];
      const previousTrend = trends.length > 1 ? trends[trends.length - 2] : null;

      doc.fontSize(12);
      doc.text(`Son Tarama Ortalama Risk Skoru: ${latestTrend.avgRiskScore.toFixed(1)}`);
      if (previousTrend) {
        const change = latestTrend.avgRiskScore - previousTrend.avgRiskScore;
        const changeColor = change < 0 ? "#10b981" : change > 0 ? "#ef4444" : "#6b7280";
        doc.fillColor(changeColor);
        doc.text(`Değişim: ${change > 0 ? "+" : ""}${change.toFixed(1)} (${((change / previousTrend.avgRiskScore) * 100).toFixed(1)}%)`);
        doc.fillColor("black");
      }
      doc.text(`HIGH/CRITICAL Image Sayısı: ${latestTrend.highOrCritical}`);
    }

    // Öneriler
    doc.addPage();
    doc.fontSize(18).font("Helvetica-Bold").text("Öneriler", { underline: true });
    doc.moveDown();

    const recommendations: string[] = [];
    if (criticalImages > 0) {
      recommendations.push(`${criticalImages} kritik riskli image acilen gözden geçirilmelidir.`);
    }
    if (stats.prodImpactedPods > 0) {
      recommendations.push(`Prod ortamında ${stats.prodImpactedPods} pod etkilenmektedir. Öncelikli aksiyon alınmalıdır.`);
    }
    if (avgRiskScore > 50) {
      recommendations.push(`Ortalama risk skoru yüksek (${avgRiskScore.toFixed(1)}). Genel güvenlik durumu iyileştirilmelidir.`);
    }
    if (recommendations.length === 0) {
      recommendations.push("Genel güvenlik durumu iyi görünmektedir. Düzenli taramalar devam ettirilmelidir.");
    }

    doc.fontSize(12);
    recommendations.forEach((rec, idx) => {
      doc.text(`${idx + 1}. ${rec}`);
      doc.moveDown(0.5);
    });

    // Footer ekle
    if (template) {
      this.addFooter(doc, template, fontSize);
    }

    return doc;
  }

  /**
   * Detaylı analiz raporu oluşturur
   */
  generateDetailedReport(
    images: ImageRiskDocument[],
    options: ReportOptions = {}
  ): InstanceType<typeof PDFDocument> {
    const template = options.template;
    const pdfOptions = template?.pdfOptions || {};
    const margins = pdfOptions.margin || { top: 50, bottom: 50, left: 50, right: 50 };
    const fontSize = pdfOptions.fontSize || { title: 20, heading: 16, body: 12 };
    const fontFamily = pdfOptions.fontFamily || "Helvetica";
    const pageSize = pdfOptions.pageSize === "LETTER" ? [612, 792] : [595, 842];
    const orientation = pdfOptions.orientation === "landscape" ? [pageSize[1], pageSize[0]] : pageSize;

    const doc = new PDFDocument({
      size: orientation,
      margin: margins.top,
      margins: {
        top: margins.top || 50,
        bottom: margins.bottom || 50,
        left: margins.left || 50,
        right: margins.right || 50,
      },
    });

    // Şablon varsa header ekle
    if (template) {
      this.addHeader(doc, template, fontSize);
    }

    // Başlık
    const titleColor = template?.primaryColor || "#000000";
    doc.fontSize(fontSize.title || 20)
      .font(`${fontFamily}-Bold`)
      .fillColor(titleColor)
      .text(template?.headerText || "Detaylı Risk Analiz Raporu", { align: "center" });
    doc.fillColor("black");
    doc.moveDown();
    doc.fontSize(fontSize.body || 12)
      .font(fontFamily)
      .text(`Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}`, {
        align: "center",
      });
    doc.moveDown(2);

    // Kapsamlı istatistikler
    doc.fontSize(16).font("Helvetica-Bold").text("Kapsamlı İstatistikler", { underline: true });
    doc.moveDown();

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

    doc.fontSize(12);
    doc.text(`Toplam Image: ${stats.total}`);
    doc.text(`Kritik Risk: ${stats.critical} (${((stats.critical / stats.total) * 100).toFixed(1)}%)`);
    doc.text(`Yüksek Risk: ${stats.high} (${((stats.high / stats.total) * 100).toFixed(1)}%)`);
    doc.text(`Orta Risk: ${stats.medium} (${((stats.medium / stats.total) * 100).toFixed(1)}%)`);
    doc.text(`Düşük Risk: ${stats.low} (${((stats.low / stats.total) * 100).toFixed(1)}%)`);
    doc.text(`Ortalama Risk Skoru: ${stats.avgRiskScore.toFixed(2)}`);
    doc.text(`Toplam Pod: ${stats.totalPods}`);
    doc.text(`Prod Pod: ${stats.prodPods} (${((stats.prodPods / stats.totalPods) * 100).toFixed(1)}%)`);
    doc.moveDown(2);

    // Risk faktörü analizi
    doc.fontSize(16).font("Helvetica-Bold").text("Risk Faktörü Analizi", { underline: true });
    doc.moveDown();

    const riskFactorCounts = new Map<string, number>();
    images.forEach((img) => {
      img.riskFactors.forEach((factor) => {
        riskFactorCounts.set(factor, (riskFactorCounts.get(factor) || 0) + 1);
      });
    });

    const sortedFactors = Array.from(riskFactorCounts.entries()).sort((a, b) => b[1] - a[1]);

    doc.fontSize(12);
    sortedFactors.slice(0, 10).forEach(([factor, count], idx) => {
      doc.text(`${idx + 1}. ${factor}: ${count} image (${((count / stats.total) * 100).toFixed(1)}%)`);
    });
    doc.moveDown(2);

    // Namespace analizi
    doc.fontSize(16).font("Helvetica-Bold").text("Namespace Analizi", { underline: true });
    doc.moveDown();

    const namespaceCounts = new Map<string, { total: number; critical: number; high: number }>();
    images.forEach((img) => {
      img.pods.forEach((pod) => {
        const ns = pod.namespace;
        if (!namespaceCounts.has(ns)) {
          namespaceCounts.set(ns, { total: 0, critical: 0, high: 0 });
        }
        const nsData = namespaceCounts.get(ns)!;
        nsData.total++;
        if (img.riskLevel === "CRITICAL") nsData.critical++;
        if (img.riskLevel === "HIGH") nsData.high++;
      });
    });

    const sortedNamespaces = Array.from(namespaceCounts.entries()).sort((a, b) => b[1].total - a[1].total);

    doc.fontSize(11);
    sortedNamespaces.slice(0, 15).forEach(([ns, data]) => {
      doc.text(`${ns}:`);
      doc.text(`  Toplam Pod: ${data.total}`, { indent: 20 });
      doc.text(`  Kritik Risk: ${data.critical}`, { indent: 20 });
      doc.text(`  Yüksek Risk: ${data.high}`, { indent: 20 });
      doc.moveDown(0.5);
    });

    // Detaylı image listesi
    doc.addPage();
    doc.fontSize(16).font("Helvetica-Bold").text("Detaylı Image Listesi", { underline: true });
    doc.moveDown();

    images
      .sort((a, b) => b.riskScore - a.riskScore)
      .forEach((img, idx) => {
        if (idx > 0 && idx % 5 === 0) {
          doc.addPage();
        }

        doc.fontSize(12).font("Helvetica-Bold").text(`${idx + 1}. ${img.imageName}`);
        doc.font("Helvetica").fontSize(10);

        const riskColor =
          img.riskLevel === "CRITICAL"
            ? "#ef4444"
            : img.riskLevel === "HIGH"
            ? "#f87171"
            : img.riskLevel === "MEDIUM"
            ? "#fbbf24"
            : "#10b981";

        doc.fillColor(riskColor).text(`Risk: ${img.riskScore} (${img.riskLevel})`);
        doc.fillColor("black");

        doc.text(`Pod Sayısı: ${img.pods.length}`);
        doc.text(`Risk Faktörleri: ${img.riskFactors.length}`);
        if (img.riskFactors.length > 0) {
          doc.text(`  ${img.riskFactors.join(", ")}`, { indent: 20 });
        }
        doc.text(`Son Tarama: ${new Date(img.lastScannedAt).toLocaleString("tr-TR")}`);
        doc.moveDown();
      });

    // Footer ekle
    if (template) {
      this.addFooter(doc, template, fontSize);
    }

    return doc;
  }
}

