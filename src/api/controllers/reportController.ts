import { Request, Response, NextFunction } from "express";
import { PdfService, ReportType } from "../../services/pdfService";
import { HtmlService } from "../../services/htmlService";
import { MarkdownService } from "../../services/markdownService";
import { ExportService } from "../../services/exportService";
import { ScanService } from "../../services/scanService";
import { ComplianceService } from "../../services/complianceService";
import { StatsController } from "./statsController";
import { ReportTemplateService } from "../../services/reportTemplateService";
import { ReportHistoryService } from "../../services/reportHistoryService";

export class ReportController {
  private pdfService: PdfService;
  private htmlService: HtmlService;
  private markdownService: MarkdownService;
  private scanService: ScanService;
  private complianceService: ComplianceService;
  private statsController: StatsController;
  private reportTemplateService: ReportTemplateService;
  private reportHistoryService: ReportHistoryService;

  constructor(
    scanService: ScanService,
    complianceService: ComplianceService,
    statsController: StatsController,
    reportTemplateService?: ReportTemplateService,
    reportHistoryService?: ReportHistoryService
  ) {
    this.pdfService = new PdfService();
    this.htmlService = new HtmlService();
    this.markdownService = new MarkdownService();
    this.scanService = scanService;
    this.complianceService = complianceService;
    this.statsController = statsController;
    this.reportTemplateService = reportTemplateService || new ReportTemplateService();
    this.reportHistoryService = reportHistoryService || new ReportHistoryService();
  }

  /**
   * Şablonu alır (ID veya varsayılan)
   */
  private async getTemplate(templateId?: string) {
    if (templateId) {
      return await this.reportTemplateService.getTemplateById(templateId);
    }
    return await this.reportTemplateService.getDefaultTemplate();
  }

  /**
   * Risk özet raporu oluşturur
   */
  generateRiskSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, templateId } = req.query;
      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Filtreleme
      const riskLevel = req.query.riskLevel as string | undefined;
      const namespace = req.query.namespace as string | undefined;

      let filtered = images;
      if (riskLevel && riskLevel !== "ALL") {
        filtered = filtered.filter((img) => img.riskLevel === riskLevel);
      }
      if (namespace && namespace !== "ALL") {
        filtered = filtered.filter((img) =>
          img.pods.some((p) => p.namespace === namespace)
        );
      }

      filtered.sort((a, b) => b.riskScore - a.riskScore);

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const doc = this.pdfService.generateReport(filtered, {
        type: "RISK_SUMMARY",
        clusterId: clusterId as string | undefined,
        projectId: projectId as string | undefined,
        template: template || undefined,
      });

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      const fileName = `risk-summary-${new Date().toISOString().slice(0, 10)}.pdf`;

      // Rapor geçmişini kaydet
      try {
        const highCritical = filtered.filter(
          (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
        ).length;
        const prodPods = filtered.reduce((sum, img) => {
          return (
            sum +
            img.pods.filter((p) => {
              const ns = p.namespace.toLowerCase();
              return ns === "prod" || ns.startsWith("prod-");
            }).length
          );
        }, 0);
        const avgRiskScore = filtered.reduce((sum, img) => sum + img.riskScore, 0) / filtered.length || 0;

        await this.reportHistoryService.createHistory({
          reportType: "RISK_SUMMARY",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            riskLevel: riskLevel as string | undefined,
            namespace: namespace as string | undefined,
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName,
          format: "PDF",
          stats: {
            totalImages: filtered.length,
            highOrCritical: highCritical,
            prodImpactedPods: prodPods,
            avgRiskScore,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
        // Hata olsa bile raporu gönder
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

      doc.pipe(res);
      doc.end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * Executive summary raporu oluşturur
   */
  generateExecutiveSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, templateId } = req.query;
      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Stats hesapla
      const totalImages = images.length;
      const highOrCritical = images.filter(
        (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
      ).length;

      let prodImpactedPods = 0;
      images.forEach((img) => {
        img.pods.forEach((pod) => {
          const ns = pod.namespace.toLowerCase();
          if (ns === "prod" || ns.startsWith("prod-")) {
            prodImpactedPods++;
          }
        });
      });

      // Trends al (basit implementasyon)
      // TODO: getTrends method'u repository'ye eklenecek
      let trendsData: any[] | undefined = undefined;

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const doc = this.pdfService.generateExecutiveReport(
        images,
        {
          totalImages,
          highOrCritical,
          prodImpactedPods,
          lastScanAt: null, // TODO: Get from scan service
        },
        trendsData,
        {
          type: "EXECUTIVE",
          clusterId: clusterId as string | undefined,
          projectId: projectId as string | undefined,
          template: template || undefined,
        }
      );

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      const fileName = `executive-summary-${new Date().toISOString().slice(0, 10)}.pdf`;

      // Rapor geçmişini kaydet
      try {
        await this.reportHistoryService.createHistory({
          reportType: "EXECUTIVE",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName,
          format: "PDF",
          stats: {
            totalImages,
            highOrCritical,
            prodImpactedPods,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

      doc.pipe(res);
      doc.end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * Compliance raporu oluşturur
   */
  generateComplianceReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { standard, clusterId, projectId, templateId } = req.query;

      let assessments;
      if (standard && standard !== "ALL") {
        const assessment = await this.complianceService.getLatestAssessment(
          standard as any,
          clusterId as string | undefined,
          projectId as string | undefined
        );
        assessments = assessment ? [assessment] : [];
      } else {
        assessments = await this.complianceService.getAllAssessments(
          undefined,
          clusterId as string | undefined,
          projectId as string | undefined
        );
      }

      if (assessments.length === 0) {
        return res.status(404).json({ error: "Compliance assessment bulunamadı" });
      }

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const doc = this.pdfService.generateComplianceReport(assessments, {
        type: "COMPLIANCE",
        clusterId: clusterId as string | undefined,
        projectId: projectId as string | undefined,
        template: template || undefined,
      });

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      const fileName = `compliance-report-${new Date().toISOString().slice(0, 10)}.pdf`;

      // Rapor geçmişini kaydet
      try {
        await this.reportHistoryService.createHistory({
          reportType: "COMPLIANCE",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            standard: standard as string | undefined,
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName,
          format: "PDF",
          stats: {
            totalImages: assessments.length,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

      doc.pipe(res);
      doc.end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * Detaylı analiz raporu oluşturur
   */
  generateDetailedReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, templateId } = req.query;
      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const doc = this.pdfService.generateDetailedReport(images, {
        type: "DETAILED",
        clusterId: clusterId as string | undefined,
        projectId: projectId as string | undefined,
        template: template || undefined,
      });

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      const fileName = `detailed-analysis-${new Date().toISOString().slice(0, 10)}.pdf`;

      // Rapor geçmişini kaydet
      try {
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

        await this.reportHistoryService.createHistory({
          reportType: "DETAILED",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName,
          format: "PDF",
          stats: {
            totalImages: images.length,
            highOrCritical: highCritical,
            prodImpactedPods: prodPods,
            avgRiskScore,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

      doc.pipe(res);
      doc.end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * Compliance assessment'ları Excel'e export eder
   */
  exportComplianceToExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { standard, clusterId, projectId } = req.query;

      let assessments;
      if (standard && standard !== "ALL") {
        const assessment = await this.complianceService.getLatestAssessment(
          standard as any,
          clusterId as string | undefined,
          projectId as string | undefined
        );
        assessments = assessment ? [assessment] : [];
      } else {
        assessments = await this.complianceService.getAllAssessments(
          undefined,
          clusterId as string | undefined,
          projectId as string | undefined
        );
      }

      if (assessments.length === 0) {
        return res.status(404).json({ error: "Compliance assessment bulunamadı" });
      }

      const exportService = new ExportService();
      const buffer = await exportService.exportComplianceToExcel(assessments);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="compliance-export-${new Date().toISOString().slice(0, 10)}.xlsx"`
      );

      res.send(buffer);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Risk özet HTML raporu oluşturur
   */
  generateRiskSummaryHtml = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, templateId } = req.query;
      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Filtreleme
      const riskLevel = req.query.riskLevel as string | undefined;
      const namespace = req.query.namespace as string | undefined;

      let filtered = images;
      if (riskLevel && riskLevel !== "ALL") {
        filtered = filtered.filter((img) => img.riskLevel === riskLevel);
      }
      if (namespace && namespace !== "ALL") {
        filtered = filtered.filter((img) =>
          img.pods.some((p) => p.namespace === namespace)
        );
      }

      filtered.sort((a, b) => b.riskScore - a.riskScore);

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const html = this.htmlService.generateRiskSummaryReport(filtered, {
        type: "RISK_SUMMARY",
        clusterId: clusterId as string | undefined,
        projectId: projectId as string | undefined,
        template: template || undefined,
      });

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      // Rapor geçmişini kaydet
      try {
        const highCritical = filtered.filter(
          (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
        ).length;
        const prodPods = filtered.reduce((sum, img) => {
          return (
            sum +
            img.pods.filter((p) => {
              const ns = p.namespace.toLowerCase();
              return ns === "prod" || ns.startsWith("prod-");
            }).length
          );
        }, 0);
        const avgRiskScore = filtered.reduce((sum, img) => sum + img.riskScore, 0) / filtered.length || 0;

        await this.reportHistoryService.createHistory({
          reportType: "RISK_SUMMARY",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            riskLevel: riskLevel as string | undefined,
            namespace: namespace as string | undefined,
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName: `risk-summary-${new Date().toISOString().slice(0, 10)}.html`,
          format: "PDF",
          stats: {
            totalImages: filtered.length,
            highOrCritical: highCritical,
            prodImpactedPods: prodPods,
            avgRiskScore,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="risk-summary-${new Date().toISOString().slice(0, 10)}.html"`
      );
      res.send(html);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Executive summary HTML raporu oluşturur
   */
  generateExecutiveSummaryHtml = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, templateId } = req.query;
      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Stats hesapla
      const totalImages = images.length;
      const highOrCritical = images.filter(
        (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
      ).length;

      let prodImpactedPods = 0;
      images.forEach((img) => {
        img.pods.forEach((pod) => {
          const ns = pod.namespace.toLowerCase();
          if (ns === "prod" || ns.startsWith("prod-")) {
            prodImpactedPods++;
          }
        });
      });

      // Trends al (basit implementasyon)
      // TODO: getTrends method'u repository'ye eklenecek
      let trendsData: any[] | undefined = undefined;

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const html = this.htmlService.generateExecutiveReport(
        images,
        {
          totalImages,
          highOrCritical,
          prodImpactedPods,
          lastScanAt: null,
        },
        trendsData,
        {
          type: "EXECUTIVE",
          clusterId: clusterId as string | undefined,
          projectId: projectId as string | undefined,
          template: template || undefined,
        }
      );

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      // Rapor geçmişini kaydet
      try {
        await this.reportHistoryService.createHistory({
          reportType: "EXECUTIVE",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName: `executive-summary-${new Date().toISOString().slice(0, 10)}.html`,
          format: "PDF",
          stats: {
            totalImages,
            highOrCritical,
            prodImpactedPods,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="executive-summary-${new Date().toISOString().slice(0, 10)}.html"`
      );
      res.send(html);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Compliance HTML raporu oluşturur
   */
  generateComplianceReportHtml = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { standard, clusterId, projectId, templateId } = req.query;

      let assessments;
      if (standard && standard !== "ALL") {
        const assessment = await this.complianceService.getLatestAssessment(
          standard as any,
          clusterId as string | undefined,
          projectId as string | undefined
        );
        assessments = assessment ? [assessment] : [];
      } else {
        assessments = await this.complianceService.getAllAssessments(
          undefined,
          clusterId as string | undefined,
          projectId as string | undefined
        );
      }

      if (assessments.length === 0) {
        return res.status(404).json({ error: "Compliance assessment bulunamadı" });
      }

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const html = this.htmlService.generateComplianceReport(assessments, {
        type: "COMPLIANCE",
        clusterId: clusterId as string | undefined,
        projectId: projectId as string | undefined,
        template: template || undefined,
      });

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      // Rapor geçmişini kaydet
      try {
        await this.reportHistoryService.createHistory({
          reportType: "COMPLIANCE",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            standard: standard as string | undefined,
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName: `compliance-report-${new Date().toISOString().slice(0, 10)}.html`,
          format: "PDF",
          stats: {
            totalImages: assessments.length,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="compliance-report-${new Date().toISOString().slice(0, 10)}.html"`
      );
      res.send(html);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Detaylı analiz HTML raporu oluşturur
   */
  generateDetailedReportHtml = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, templateId } = req.query;
      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const html = this.htmlService.generateDetailedReport(images, {
        type: "DETAILED",
        clusterId: clusterId as string | undefined,
        projectId: projectId as string | undefined,
        template: template || undefined,
      });

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      // Rapor geçmişini kaydet
      try {
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

        await this.reportHistoryService.createHistory({
          reportType: "DETAILED",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName: `detailed-analysis-${new Date().toISOString().slice(0, 10)}.html`,
          format: "PDF",
          stats: {
            totalImages: images.length,
            highOrCritical: highCritical,
            prodImpactedPods: prodPods,
            avgRiskScore,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="detailed-analysis-${new Date().toISOString().slice(0, 10)}.html"`
      );
      res.send(html);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Risk özet Markdown raporu oluşturur
   */
  generateRiskSummaryMarkdown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, templateId } = req.query;
      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Filtreleme
      const riskLevel = req.query.riskLevel as string | undefined;
      const namespace = req.query.namespace as string | undefined;

      let filtered = images;
      if (riskLevel && riskLevel !== "ALL") {
        filtered = filtered.filter((img) => img.riskLevel === riskLevel);
      }
      if (namespace && namespace !== "ALL") {
        filtered = filtered.filter((img) =>
          img.pods.some((p) => p.namespace === namespace)
        );
      }

      filtered.sort((a, b) => b.riskScore - a.riskScore);

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const markdown = this.markdownService.generateRiskSummaryReport(filtered, {
        type: "RISK_SUMMARY",
        clusterId: clusterId as string | undefined,
        projectId: projectId as string | undefined,
        template: template || undefined,
      });

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      // Rapor geçmişini kaydet
      try {
        const highCritical = filtered.filter(
          (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
        ).length;
        const prodPods = filtered.reduce((sum, img) => {
          return (
            sum +
            img.pods.filter((p) => {
              const ns = p.namespace.toLowerCase();
              return ns === "prod" || ns.startsWith("prod-");
            }).length
          );
        }, 0);
        const avgRiskScore = filtered.reduce((sum, img) => sum + img.riskScore, 0) / filtered.length || 0;

        await this.reportHistoryService.createHistory({
          reportType: "RISK_SUMMARY",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            riskLevel: riskLevel as string | undefined,
            namespace: namespace as string | undefined,
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName: `risk-summary-${new Date().toISOString().slice(0, 10)}.md`,
          format: "PDF",
          stats: {
            totalImages: filtered.length,
            highOrCritical: highCritical,
            prodImpactedPods: prodPods,
            avgRiskScore,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="risk-summary-${new Date().toISOString().slice(0, 10)}.md"`
      );
      res.send(markdown);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Executive summary Markdown raporu oluşturur
   */
  generateExecutiveSummaryMarkdown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, templateId } = req.query;
      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Stats hesapla
      const totalImages = images.length;
      const highOrCritical = images.filter(
        (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
      ).length;

      let prodImpactedPods = 0;
      images.forEach((img) => {
        img.pods.forEach((pod) => {
          const ns = pod.namespace.toLowerCase();
          if (ns === "prod" || ns.startsWith("prod-")) {
            prodImpactedPods++;
          }
        });
      });

      // Trends al (basit implementasyon)
      // TODO: getTrends method'u repository'ye eklenecek
      let trendsData: any[] | undefined = undefined;

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const markdown = this.markdownService.generateExecutiveReport(
        images,
        {
          totalImages,
          highOrCritical,
          prodImpactedPods,
          lastScanAt: null,
        },
        trendsData,
        {
          type: "EXECUTIVE",
          clusterId: clusterId as string | undefined,
          projectId: projectId as string | undefined,
          template: template || undefined,
        }
      );

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      // Rapor geçmişini kaydet
      try {
        await this.reportHistoryService.createHistory({
          reportType: "EXECUTIVE",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName: `executive-summary-${new Date().toISOString().slice(0, 10)}.md`,
          format: "PDF",
          stats: {
            totalImages,
            highOrCritical,
            prodImpactedPods,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="executive-summary-${new Date().toISOString().slice(0, 10)}.md"`
      );
      res.send(markdown);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Compliance Markdown raporu oluşturur
   */
  generateComplianceReportMarkdown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { standard, clusterId, projectId, templateId } = req.query;

      let assessments;
      if (standard && standard !== "ALL") {
        const assessment = await this.complianceService.getLatestAssessment(
          standard as any,
          clusterId as string | undefined,
          projectId as string | undefined
        );
        assessments = assessment ? [assessment] : [];
      } else {
        assessments = await this.complianceService.getAllAssessments(
          undefined,
          clusterId as string | undefined,
          projectId as string | undefined
        );
      }

      if (assessments.length === 0) {
        return res.status(404).json({ error: "Compliance assessment bulunamadı" });
      }

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const markdown = this.markdownService.generateComplianceReport(assessments, {
        type: "COMPLIANCE",
        clusterId: clusterId as string | undefined,
        projectId: projectId as string | undefined,
        template: template || undefined,
      });

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      // Rapor geçmişini kaydet
      try {
        await this.reportHistoryService.createHistory({
          reportType: "COMPLIANCE",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            standard: standard as string | undefined,
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName: `compliance-report-${new Date().toISOString().slice(0, 10)}.md`,
          format: "PDF",
          stats: {
            totalImages: assessments.length,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="compliance-report-${new Date().toISOString().slice(0, 10)}.md"`
      );
      res.send(markdown);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Detaylı analiz Markdown raporu oluşturur
   */
  generateDetailedReportMarkdown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, templateId } = req.query;
      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const markdown = this.markdownService.generateDetailedReport(images, {
        type: "DETAILED",
        clusterId: clusterId as string | undefined,
        projectId: projectId as string | undefined,
        template: template || undefined,
      });

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      // Rapor geçmişini kaydet
      try {
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

        await this.reportHistoryService.createHistory({
          reportType: "DETAILED",
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: {
            clusterId: clusterId as string | undefined,
            projectId: projectId as string | undefined,
          },
          fileName: `detailed-analysis-${new Date().toISOString().slice(0, 10)}.md`,
          format: "PDF",
          stats: {
            totalImages: images.length,
            highOrCritical: highCritical,
            prodImpactedPods: prodPods,
            avgRiskScore,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="detailed-analysis-${new Date().toISOString().slice(0, 10)}.md"`
      );
      res.send(markdown);
    } catch (err) {
      next(err);
    }
  };
}

