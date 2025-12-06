import { Request, Response, NextFunction } from "express";
import {
  ReportTemplateService,
  CreateReportTemplatePayload,
} from "../../services/reportTemplateService";
import { fileToBase64, deleteFile } from "../middleware/upload";
import path from "path";

export class ReportTemplateController {
  private templateService: ReportTemplateService;

  constructor(templateService?: ReportTemplateService) {
    this.templateService = templateService || new ReportTemplateService();
  }

  /**
   * Tüm şablonları listeler
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const tags = req.query.tags as string | undefined;
      
      const filters: { category?: string; tags?: string[] } = {};
      if (category) {
        filters.category = category;
      }
      if (tags) {
        filters.tags = tags.split(",").map((t) => t.trim());
      }
      
      const templates = await this.templateService.getAllTemplates(filters);
      res.json(templates);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Tüm kategorileri getirir
   */
  getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.templateService.getAllCategories();
      res.json(categories);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Tüm tag'leri getirir
   */
  getTags = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tags = await this.templateService.getAllTags();
      res.json(tags);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Varsayılan şablonu getirir
   */
  getDefault = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await this.templateService.getDefaultTemplate();
      if (!template) {
        return res.status(404).json({ error: "Varsayılan şablon bulunamadı" });
      }
      res.json(template);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Belirli bir şablonu getirir
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const template = await this.templateService.getTemplateById(id);
      if (!template) {
        return res.status(404).json({ error: "Şablon bulunamadı" });
      }
      res.json(template);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Yeni şablon oluşturur
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload: CreateReportTemplatePayload = req.body;

      if (!payload.name) {
        return res.status(400).json({ error: "name alanı gereklidir" });
      }

      const template = await this.templateService.createTemplate(payload);
      res.status(201).json(template);
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(409).json({ error: "Bu isimde bir şablon zaten var" });
      }
      next(err);
    }
  };

  /**
   * Şablonu günceller
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { changeDescription, ...updates } = req.body;
      const createdBy = (req as any).user?.apiKey;

      const template = await this.templateService.updateTemplate(
        id,
        updates,
        changeDescription,
        createdBy
      );
      if (!template) {
        return res.status(404).json({ error: "Şablon bulunamadı" });
      }
      res.json(template);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Şablonu siler
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deleted = await this.templateService.deleteTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Şablon bulunamadı" });
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * Şablonu kopyalar
   */
  copy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name } = req.body; // Opsiyonel yeni isim

      const copiedTemplate = await this.templateService.copyTemplate(id, name);
      if (!copiedTemplate) {
        return res.status(404).json({ error: "Şablon bulunamadı" });
      }

      res.json(copiedTemplate);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Şablonu varsayılan yapar
   */
  setAsDefault = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const template = await this.templateService.setAsDefault(id);
      if (!template) {
        return res.status(404).json({ error: "Şablon bulunamadı" });
      }
      res.json(template);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Varsayılan şablonları oluşturur
   */
  initialize = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.templateService.initializeDefaultTemplates();
      res.json({ message: "Varsayılan şablonlar oluşturuldu" });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Logo yükler ve şablona ekler
   */
  uploadLogo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "Logo dosyası yüklenmedi" });
      }

      // Dosyayı Base64'e dönüştür
      const base64Logo = await fileToBase64(file.path);

      // Şablonu güncelle
      const template = await this.templateService.updateTemplate(id, {
        logo: base64Logo,
      });

      if (!template) {
        // Dosyayı sil (şablon bulunamadıysa)
        await deleteFile(file.path);
        return res.status(404).json({ error: "Şablon bulunamadı" });
      }

      // Eski logo dosyasını sil (varsa)
      // Şimdilik sadece yeni dosyayı tutuyoruz, eski dosya referansı yoksa silinmez

      res.json({
        message: "Logo başarıyla yüklendi",
        template,
        logoUrl: `/uploads/logos/${path.basename(file.path)}`,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Şablon önizlemesi oluşturur (test verileriyle)
   */
  preview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const template = await this.templateService.getTemplateById(id);

      if (!template) {
        return res.status(404).json({ error: "Şablon bulunamadı" });
      }

      // Önizleme için şablon bilgilerini döndür
      res.json({
        template,
        preview: {
          message: "Önizleme özelliği aktif. Frontend'de görselleştirme yapılabilir.",
          config: template,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Şablonun versiyon geçmişini getirir
   */
  getVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const versions = await this.templateService.getTemplateVersions(id);
      res.json(versions);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Belirli bir versiyonu getirir
   */
  getVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, version } = req.params;
      const versionDoc = await this.templateService.getTemplateVersion(id, parseInt(version));
      if (!versionDoc) {
        return res.status(404).json({ error: "Versiyon bulunamadı" });
      }
      res.json(versionDoc);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Belirli bir versiyona geri döner
   */
  restoreVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, version } = req.params;
      const { changeDescription } = req.body;
      const createdBy = (req as any).user?.apiKey;

      const template = await this.templateService.restoreTemplateVersion(
        id,
        parseInt(version),
        changeDescription,
        createdBy
      );
      if (!template) {
        return res.status(404).json({ error: "Şablon veya versiyon bulunamadı" });
      }
      res.json(template);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Şablonu JSON olarak export eder
   */
  exportTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const template = await this.templateService.getTemplateById(id);
      
      if (!template) {
        return res.status(404).json({ error: "Şablon bulunamadı" });
      }

      // Export için şablon verilerini hazırla (sadece gerekli alanlar)
      const exportData = {
        name: template.name,
        description: template.description,
        logo: template.logo,
        headerText: template.headerText,
        footerText: template.footerText,
        companyName: template.companyName,
        companyAddress: template.companyAddress,
        companyContact: template.companyContact,
        primaryColor: template.primaryColor,
        secondaryColor: template.secondaryColor,
        accentColor: template.accentColor,
        category: template.category,
        tags: template.tags,
        contentOptions: template.contentOptions,
        pdfOptions: template.pdfOptions,
        excelOptions: template.excelOptions,
        version: template.currentVersion || 1,
        exportedAt: new Date().toISOString(),
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="template-${template.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json"`
      );
      res.json(exportData);
    } catch (err) {
      next(err);
    }
  };

  /**
   * JSON'dan şablon import eder
   */
  importTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const importData = req.body;
      const { overwrite } = req.query; // Eğer true ise, aynı isimdeki şablonu güncelle

      // Gerekli alanları kontrol et
      if (!importData.name) {
        return res.status(400).json({ error: "Şablon adı gereklidir" });
      }

      // Aynı isimde şablon var mı kontrol et
      const existingTemplate = await this.templateService.getTemplateByName(importData.name);
      
      if (existingTemplate) {
        if (overwrite === "true") {
          // Mevcut şablonu güncelle
          const updates: Partial<CreateReportTemplatePayload> = {
            description: importData.description,
            logo: importData.logo,
            headerText: importData.headerText,
            footerText: importData.footerText,
            companyName: importData.companyName,
            companyAddress: importData.companyAddress,
            companyContact: importData.companyContact,
            primaryColor: importData.primaryColor,
            secondaryColor: importData.secondaryColor,
            accentColor: importData.accentColor,
            category: importData.category,
            tags: importData.tags,
            contentOptions: importData.contentOptions,
            pdfOptions: importData.pdfOptions,
            excelOptions: importData.excelOptions,
          };

          const updatedTemplate = await this.templateService.updateTemplate(
            existingTemplate._id.toString(),
            updates,
            `Import edildi (versiyon ${importData.version || "bilinmiyor"})`,
            (req as any).user?.apiKey
          );

          return res.json({
            template: updatedTemplate,
            action: "updated",
            message: "Şablon güncellendi",
          });
        } else {
          return res.status(409).json({
            error: "Aynı isimde bir şablon zaten mevcut",
            existingTemplate: {
              _id: existingTemplate._id,
              name: existingTemplate.name,
            },
          });
        }
      } else {
        // Yeni şablon oluştur
        const payload: CreateReportTemplatePayload = {
          name: importData.name,
          description: importData.description,
          logo: importData.logo,
          headerText: importData.headerText,
          footerText: importData.footerText,
          companyName: importData.companyName,
          companyAddress: importData.companyAddress,
          companyContact: importData.companyContact,
          primaryColor: importData.primaryColor,
          secondaryColor: importData.secondaryColor,
          accentColor: importData.accentColor,
          category: importData.category,
          tags: importData.tags,
          contentOptions: importData.contentOptions,
          pdfOptions: importData.pdfOptions,
          excelOptions: importData.excelOptions,
          isDefault: false, // Import edilen şablon varsayılan olmaz
        };

        const newTemplate = await this.templateService.createTemplate(payload);

        return res.status(201).json({
          template: newTemplate,
          action: "created",
          message: "Şablon başarıyla import edildi",
        });
      }
    } catch (err) {
      next(err);
    }
  };
}

