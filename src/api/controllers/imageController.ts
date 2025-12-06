import { Request, Response, NextFunction } from "express";
import { ScanService } from "../../services/scanService";
import { ScanRunRepository } from "../../persistence/scanRun.repository";
import { PdfService } from "../../services/pdfService";
import { ExportService, ExportFormat } from "../../services/exportService";
import { calculateRiskBreakdown } from "../../risk/riskBreakdown";
import { RiskAllowlistRepository } from "../../persistence/riskAllowlist.repository";
import { ReportTemplateService } from "../../services/reportTemplateService";
import { ReportHistoryService } from "../../services/reportHistoryService";
import {
  parseImageName,
  groupImagesByRepository,
  compareTags,
} from "../../utils/imageParser";
import {
  validateImageName,
  validateRiskScore,
  validateRiskLevel,
  validateRiskFactors,
  validatePods,
  validateClusterId,
  validateProjectId,
  validateBulkImagesLimit,
  ValidationError,
} from "../../utils/inputValidator";
import { AuditService } from "../../services/auditService";

export class ImageController {
  private reportTemplateService: ReportTemplateService;
  private reportHistoryService: ReportHistoryService;
  private auditService: AuditService;

  constructor(
    private readonly scanService: ScanService,
    private readonly scanRunRepo: ScanRunRepository = new ScanRunRepository(),
    reportTemplateService?: ReportTemplateService,
    reportHistoryService?: ReportHistoryService
  ) {
    this.reportTemplateService = reportTemplateService || new ReportTemplateService();
    this.reportHistoryService = reportHistoryService || new ReportHistoryService();
    this.auditService = new AuditService();
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

  listImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clusterId = req.query.clusterId as string | undefined;
      const projectId = req.query.projectId as string | undefined;
      const images = await this.scanService.listImages(clusterId, projectId);
      res.json(images);
    } catch (err) {
      next(err);
    }
  };

  getImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;
      const clusterId = req.query.clusterId as string | undefined;
      const image = await this.scanService.getImage(imageName, clusterId);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      res.json(image);
    } catch (err) {
      next(err);
    }
  };

  getImageBreakdown = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { imageName } = req.params;
      const image = await this.scanService.getImage(imageName);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Allowlist'ten ignored factors'ı al
      const allowlistRepo = new RiskAllowlistRepository();
      const ignoredFactors =
        await allowlistRepo.getIgnoredFactorsForImage(imageName);

      // ImageUsage oluştur
      const usage = {
        imageName: image.imageName,
        pods: image.pods,
      };

      // Metadata derive et (basit heuristik)
      const imageNameLower = image.imageName.toLowerCase();
      const metadata = {
        usesRootUser:
          imageNameLower.includes("root") ||
          imageNameLower.includes("privileged"),
        baseImageKnown: ["ubuntu", "alpine", "debian", "node", "nginx"].some(
          (base) =>
            image.imageName.startsWith(base + ":") ||
            image.imageName.includes("/" + base + ":")
        ),
      };

      const breakdown = calculateRiskBreakdown(
        usage,
        metadata,
        ignoredFactors
      );

      res.json(breakdown);
    } catch (err) {
      next(err);
    }
  };

  getImageTags = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;
      const images = await this.scanService.getImageTags(imageName);

      // Tag'lere göre sırala
      const parsedImages = images.map((img) => ({
        ...img.toObject(),
        parsed: parseImageName(img.imageName),
      }));

      parsedImages.sort((a, b) =>
        compareTags(a.parsed.tag, b.parsed.tag)
      );

      res.json({
        baseName: parseImageName(imageName).baseName,
        tags: parsedImages.map((img) => ({
          imageName: img.imageName,
          tag: img.parsed.tag,
          riskScore: img.riskScore,
          riskLevel: img.riskLevel,
          lastScannedAt: img.lastScannedAt,
          pods: img.pods,
        })),
      });
    } catch (err) {
      next(err);
    }
  };

  getRepositories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allImages = await this.scanService.listImages();
      const groups = groupImagesByRepository(
        allImages.map((img) => ({ imageName: img.imageName }))
      );

      const repositories = Array.from(groups.entries()).map(
        ([baseName, parsedImages]) => {
          const images = allImages.filter((img) =>
            parsedImages.some((p) => p.fullName === img.imageName)
          );

          // En yüksek risk skorunu bul
          const maxRisk = Math.max(...images.map((img) => img.riskScore));
          const maxRiskImage = images.find((img) => img.riskScore === maxRisk);

          // Tag sayısı
          const tagCount = parsedImages.length;

          // Prod pod sayısı
          let prodPodCount = 0;
          images.forEach((img) => {
            img.pods.forEach((p) => {
              const ns = p.namespace.toLowerCase();
              if (ns === "prod" || ns.startsWith("prod-")) {
                prodPodCount++;
              }
            });
          });

          return {
            baseName,
            registry: parsedImages[0]?.registry,
            repository: parsedImages[0]?.repository,
            tagCount,
            maxRiskScore: maxRisk,
            maxRiskLevel: maxRiskImage?.riskLevel,
            prodPodCount,
            lastScannedAt: maxRiskImage?.lastScannedAt,
          };
        }
      );

      repositories.sort((a, b) => b.maxRiskScore - a.maxRiskScore);

      res.json(repositories);
    } catch (err) {
      next(err);
    }
  };

  getTopImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Number(req.query.limit) || 5;
      const prodOnly = req.query.prodOnly === "true";
      const clusterId = req.query.clusterId as string | undefined;
      const projectId = req.query.projectId as string | undefined;
      const images = await this.scanService.getTopImages(limit, prodOnly, clusterId, projectId);
      res.json(images);
    } catch (err) {
      next(err);
    }
  };

  getImageHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { imageName } = req.params;
      const limit = Number(req.query.limit) || 10;

      const history = await this.scanRunRepo.getImageHistory(
        imageName,
        limit
      );

      res.json(history);
    } catch (err) {
      next(err);
    }
  };

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clusterId = req.query.clusterId as string | undefined;
      const projectId = req.query.projectId as string | undefined;
      const images = await this.scanService.listImages(clusterId, projectId);

      const totalImages = images.length;
      const highOrCritical = images.filter(
        (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
      ).length;

      let prodImpactedPods = 0;
      images.forEach((img) => {
        img.pods.forEach((pod) => {
          const ns = pod.namespace.toLowerCase();
          if (ns === "prod" || ns.startsWith("prod-")) {
            prodImpactedPods += 1;
          }
        });
      });

      // Son scan zamanını bul
      const lastScan = await this.scanRunRepo.getLatestScan();
      const lastScanAt = lastScan?.finishedAt?.toISOString() || null;

      res.json({
        totalImages,
        highOrCritical,
        prodImpactedPods,
        lastScanAt,
      });
    } catch (err) {
      next(err);
    }
  };

  exportPdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const images = await this.scanService.listImages();

      // Filtreleme parametreleri (opsiyonel)
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

      // Risk skoruna göre sırala
      filtered.sort((a, b) => b.riskScore - a.riskScore);

      const pdfService = new PdfService();
      const doc = pdfService.generateReport(filtered);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="autopatch-report-${new Date().toISOString().slice(0, 10)}.pdf"`
      );

      doc.pipe(res);
      doc.end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * CSV/Excel/JSON formatında export oluşturur
   */
  exportData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { format, templateId } = req.query;
      const clusterId = req.query.clusterId as string | undefined;
      const projectId = req.query.projectId as string | undefined;

      const images = await this.scanService.listImages(clusterId, projectId);

      // Şablonu al
      const template = await this.getTemplate(templateId as string | undefined);

      const exportService = new ExportService();
      const exportFormat = (format as ExportFormat) || "CSV";

      const options = {
        format: exportFormat,
        filters: {
          riskLevel: req.query.riskLevel as string | undefined,
          namespace: req.query.namespace as string | undefined,
          clusterId,
          projectId,
        },
        includePods: req.query.includePods === "true",
        includeRiskFactors: req.query.includeRiskFactors === "true",
        sortBy: (req.query.sortBy as "riskScore" | "imageName" | "lastScannedAt") || "riskScore",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
        template: template || undefined,
      };

      // Şablon kullanımını kaydet
      if (template) {
        await this.reportTemplateService.recordUsage(template._id.toString());
      }

      const fileName = `images-export-${new Date().toISOString().slice(0, 10)}.${exportFormat.toLowerCase()}`;

      // Rapor geçmişini kaydet
      try {
        const filtered = exportService.applyFilters(images, options.filters);
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

        const reportType =
          exportFormat === "XLSX"
            ? "EXCEL_EXPORT"
            : exportFormat === "CSV"
            ? "CSV_EXPORT"
            : "JSON_EXPORT";

        await this.reportHistoryService.createHistory({
          reportType: reportType as any,
          templateId: template?._id.toString(),
          templateName: template?.name,
          filters: options.filters,
          fileName,
          format: exportFormat === "XLSX" ? "XLSX" : exportFormat === "CSV" ? "CSV" : "JSON",
          stats: {
            totalImages: filtered.length,
            highOrCritical,
            prodImpactedPods: prodPods,
            avgRiskScore,
          },
          createdBy: (req as any).user?.apiKey || undefined,
        });
      } catch (err) {
        console.error("Rapor geçmişi kaydedilirken hata:", err);
      }

      if (exportFormat === "CSV") {
        const csv = await exportService.exportToCSV(images, options);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.send(csv);
      } else if (exportFormat === "XLSX") {
        const buffer = await exportService.exportToExcel(images, options);
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.send(buffer);
      } else if (exportFormat === "JSON") {
        const filtered = exportService.applyFilters(images, options.filters);
        const sorted = exportService.applySorting(filtered, options);
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.json(sorted);
      } else {
        return res.status(400).json({ error: "Geçersiz format. CSV, XLSX veya JSON olmalı." });
      }
    } catch (err) {
      next(err);
    }
  };

  /**
   * Dışarıdan manuel image ekleme
   * POST /api/images
   * Güvenlik: Admin yetkisi gerekir, input validation yapılır, audit log tutulur
   */
  createImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        imageName,
        riskScore,
        riskLevel,
        riskFactors,
        pods,
        clusterId,
        projectId,
      } = req.body;

      // Güvenlik: Input validasyonu
      try {
        validateImageName(imageName);
        const validatedRiskScore = validateRiskScore(riskScore);
        const validatedRiskLevel = validateRiskLevel(riskLevel);
        const validatedRiskFactors = validateRiskFactors(riskFactors);
        const validatedPods = validatePods(pods);
        const validatedClusterId = validateClusterId(clusterId);
        const validatedProjectId = validateProjectId(projectId);

        // Risk skoru ve seviyesi yoksa otomatik hesapla
        let finalRiskScore = validatedRiskScore;
        let finalRiskLevel = validatedRiskLevel;

        if (finalRiskScore < 0 || !finalRiskLevel) {
          // Risk engine ile hesapla
          const usage = {
            imageName,
            pods: validatedPods,
          };

          const metadata = {
            usesRootUser: validatedRiskFactors.includes("Uses root user"),
            baseImageKnown: true,
          };

          const { RiskEngine } = await import("../../risk/riskEngine");
          const riskEngine = new RiskEngine();
          const result = riskEngine.calculateRisk(usage, metadata);

          finalRiskScore = finalRiskScore < 0 ? result.riskScore : finalRiskScore;
          finalRiskLevel = finalRiskLevel || result.riskLevel;
        }

        // Image risk verisi oluştur
        const imageRisk = await this.scanService.createOrUpdateImage({
          imageName,
          riskScore: finalRiskScore,
          riskLevel: finalRiskLevel,
          riskFactors: validatedRiskFactors,
          pods: validatedPods,
          clusterId: validatedClusterId,
          projectId: validatedProjectId,
          lastScannedAt: new Date(),
        });

        // Güvenlik: Audit log
        await this.auditService.log({
          action: "IMAGE_CREATED",
          details: {
            imageName,
            riskScore: finalRiskScore,
            riskLevel: finalRiskLevel,
            clusterId: validatedClusterId,
            projectId: validatedProjectId,
            source: "manual",
          },
        });

        res.status(201).json({
          success: true,
          message: "Image başarıyla eklendi",
          data: imageRisk,
        });
      } catch (validationError) {
        if (validationError instanceof ValidationError) {
          return res.status(400).json({
            success: false,
            error: validationError.message,
          });
        }
        throw validationError;
      }
    } catch (err) {
      next(err);
    }
  };

  /**
   * Toplu image ekleme
   * POST /api/images/bulk
   * Güvenlik: Admin yetkisi gerekir, input validation yapılır, DoS koruması var, audit log tutulur
   */
  createBulkImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { images } = req.body;

      // Güvenlik: Bulk limit kontrolü (DoS önleme)
      try {
        validateBulkImagesLimit(images);
      } catch (validationError) {
        if (validationError instanceof ValidationError) {
          return res.status(400).json({
            success: false,
            error: validationError.message,
          });
        }
        throw validationError;
      }

      const results = [];
      const errors = [];

      for (const imageData of images) {
        try {
          const {
            imageName,
            riskScore,
            riskLevel,
            riskFactors,
            pods,
            clusterId,
            projectId,
          } = imageData;

          // Güvenlik: Her image için validasyon
          try {
            validateImageName(imageName);
            const validatedRiskScore = validateRiskScore(riskScore);
            const validatedRiskLevel = validateRiskLevel(riskLevel);
            const validatedRiskFactors = validateRiskFactors(riskFactors);
            const validatedPods = validatePods(pods);
            const validatedClusterId = validateClusterId(clusterId);
            const validatedProjectId = validateProjectId(projectId);

            // Risk skoru ve seviyesi yoksa otomatik hesapla
            let finalRiskScore = validatedRiskScore;
            let finalRiskLevel = validatedRiskLevel;

            if (finalRiskScore < 0 || !finalRiskLevel) {
              const usage = {
                imageName,
                pods: validatedPods,
              };

              const metadata = {
                usesRootUser: validatedRiskFactors.includes("Uses root user"),
                baseImageKnown: true,
              };

              const { RiskEngine } = await import("../../risk/riskEngine");
              const riskEngine = new RiskEngine();
              const result = riskEngine.calculateRisk(usage, metadata);

              finalRiskScore = finalRiskScore < 0 ? result.riskScore : finalRiskScore;
              finalRiskLevel = finalRiskLevel || result.riskLevel;
            }

            const imageRisk = await this.scanService.createOrUpdateImage({
              imageName,
              riskScore: finalRiskScore,
              riskLevel: finalRiskLevel,
              riskFactors: validatedRiskFactors,
              pods: validatedPods,
              clusterId: validatedClusterId,
              projectId: validatedProjectId,
              lastScannedAt: new Date(),
            });

            results.push(imageRisk);
          } catch (validationError) {
            if (validationError instanceof ValidationError) {
              errors.push({
                imageName: imageName || "unknown",
                error: validationError.message,
              });
            } else {
              throw validationError;
            }
          }
        } catch (error: any) {
          errors.push({
            imageName: imageData.imageName || "unknown",
            error: error.message || "Bilinmeyen hata",
          });
        }
      }

      // Güvenlik: Audit log
      await this.auditService.log({
        action: "BULK_IMAGES_CREATED",
        details: {
          total: images.length,
          created: results.length,
          failed: errors.length,
          clusterId: images[0]?.clusterId,
          projectId: images[0]?.projectId,
          source: "manual",
        },
      });

      res.status(201).json({
        success: true,
        message: `${results.length} image başarıyla eklendi`,
        data: {
          created: results.length,
          failed: errors.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}


