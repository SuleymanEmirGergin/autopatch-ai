import { ReportTemplateModel, ReportTemplateDocument } from "../persistence/reportTemplate.model";
import { ReportTemplateVersionModel, ReportTemplateVersionDocument } from "../persistence/reportTemplateVersion.model";

export interface CreateReportTemplatePayload {
  name: string;
  description?: string;
  logo?: string;
  headerText?: string;
  footerText?: string;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  category?: string;
  tags?: string[];
  contentOptions?: {
    includeSummary?: boolean;
    includeRiskDistribution?: boolean;
    includeTopRiskyImages?: boolean;
    includeRiskFactorAnalysis?: boolean;
    includeNamespaceAnalysis?: boolean;
    includeTrends?: boolean;
    includeRecommendations?: boolean;
    topRiskyCount?: number;
  };
  pdfOptions?: {
    pageSize?: "A4" | "LETTER";
    orientation?: "portrait" | "landscape";
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    fontFamily?: string;
    fontSize?: {
      title?: number;
      heading?: number;
      body?: number;
    };
  };
  excelOptions?: {
    includeCharts?: boolean;
    includePivotTables?: boolean;
    sheetOrder?: string[];
  };
  isDefault?: boolean;
}

export class ReportTemplateService {
  /**
   * Tüm şablonları listeler
   */
  async getAllTemplates(): Promise<ReportTemplateDocument[]> {
    return ReportTemplateModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Varsayılan şablonu getirir
   */
  async getDefaultTemplate(): Promise<ReportTemplateDocument | null> {
    return ReportTemplateModel.findOne({ isDefault: true }).exec();
  }

  /**
   * Belirli bir şablonu getirir
   */
  async getTemplateById(id: string): Promise<ReportTemplateDocument | null> {
    return ReportTemplateModel.findById(id).exec();
  }

  /**
   * Şablon adına göre getirir
   */
  async getTemplateByName(name: string): Promise<ReportTemplateDocument | null> {
    return ReportTemplateModel.findOne({ name }).exec();
  }

  /**
   * Yeni şablon oluşturur
   */
  async createTemplate(
    payload: CreateReportTemplatePayload
  ): Promise<ReportTemplateDocument> {
    // Eğer varsayılan olarak işaretlenmişse, diğer varsayılan şablonları kaldır
    if (payload.isDefault) {
      await ReportTemplateModel.updateMany(
        { isDefault: true },
        { isDefault: false }
      );
    }

    return ReportTemplateModel.create(payload);
  }

  /**
   * Şablonu günceller ve versiyon oluşturur
   */
  async updateTemplate(
    id: string,
    updates: Partial<CreateReportTemplatePayload>,
    changeDescription?: string,
    createdBy?: string
  ): Promise<ReportTemplateDocument | null> {
    const existingTemplate = await ReportTemplateModel.findById(id).exec();
    if (!existingTemplate) {
      return null;
    }

    // Eğer varsayılan olarak işaretlenmişse, diğer varsayılan şablonları kaldır
    if (updates.isDefault) {
      await ReportTemplateModel.updateMany(
        { isDefault: true, _id: { $ne: id } },
        { isDefault: false }
      );
    }

    // Mevcut şablonun versiyonunu kaydet
    const currentVersion = existingTemplate.currentVersion || 1;
    const newVersion = currentVersion + 1;

    // Versiyon snapshot'ı oluştur
    const versionSnapshot: Partial<ReportTemplateVersionDocument> = {
      templateId: id,
      version: currentVersion,
      name: existingTemplate.name,
      description: existingTemplate.description,
      logo: existingTemplate.logo,
      headerText: existingTemplate.headerText,
      footerText: existingTemplate.footerText,
      companyName: existingTemplate.companyName,
      companyAddress: existingTemplate.companyAddress,
      companyContact: existingTemplate.companyContact,
      primaryColor: existingTemplate.primaryColor,
      secondaryColor: existingTemplate.secondaryColor,
      accentColor: existingTemplate.accentColor,
      contentOptions: existingTemplate.contentOptions,
      pdfOptions: existingTemplate.pdfOptions,
      excelOptions: existingTemplate.excelOptions,
      changeDescription: changeDescription || "Şablon güncellendi",
      createdBy: createdBy || existingTemplate.createdBy,
    };

    // Versiyon kaydını oluştur
    await ReportTemplateVersionModel.create(versionSnapshot);

    // Şablonu güncelle ve versiyon numarasını artır
    const updatedTemplate = await ReportTemplateModel.findByIdAndUpdate(
      id,
      {
        ...updates,
        currentVersion: newVersion,
        versionCount: (existingTemplate.versionCount || 1) + 1,
      },
      { new: true }
    ).exec();

    return updatedTemplate;
  }

  /**
   * Şablonu siler
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const result = await ReportTemplateModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Şablonu kopyalar ve yeni bir şablon oluşturur
   */
  async copyTemplate(id: string, newName?: string): Promise<ReportTemplateDocument | null> {
    const originalTemplate = await this.getTemplateById(id);
    if (!originalTemplate) {
      return null;
    }

    // Yeni şablon adı belirle
    const templateName = newName || `Copy of ${originalTemplate.name}`;

    // Orijinal şablonun tüm özelliklerini kopyala (isDefault hariç)
    const copyPayload: CreateReportTemplatePayload = {
      name: templateName,
      description: originalTemplate.description,
      logo: originalTemplate.logo,
      headerText: originalTemplate.headerText,
      footerText: originalTemplate.footerText,
      companyName: originalTemplate.companyName,
      companyAddress: originalTemplate.companyAddress,
      companyContact: originalTemplate.companyContact,
      primaryColor: originalTemplate.primaryColor,
      secondaryColor: originalTemplate.secondaryColor,
      accentColor: originalTemplate.accentColor,
      contentOptions: originalTemplate.contentOptions,
      pdfOptions: originalTemplate.pdfOptions,
      excelOptions: originalTemplate.excelOptions,
      isDefault: false, // Kopyalanan şablon varsayılan olmaz
    };

    return this.createTemplate(copyPayload);
  }

  /**
   * Şablonu varsayılan yapar
   */
  async setAsDefault(id: string): Promise<ReportTemplateDocument | null> {
    // Diğer varsayılan şablonları kaldır
    await ReportTemplateModel.updateMany(
      { isDefault: true },
      { isDefault: false }
    );

    // Bu şablonu varsayılan yap
    return ReportTemplateModel.findByIdAndUpdate(
      id,
      { isDefault: true },
      { new: true }
    ).exec();
  }

  /**
   * Şablon kullanımını kaydeder
   */
  async recordUsage(id: string): Promise<void> {
    await ReportTemplateModel.findByIdAndUpdate(id, {
      $inc: { usageCount: 1 },
      lastUsedAt: new Date(),
    }).exec();
  }

  /**
   * Şablonun versiyon geçmişini getirir
   */
  async getTemplateVersions(templateId: string): Promise<ReportTemplateVersionDocument[]> {
    return ReportTemplateVersionModel.find({ templateId })
      .sort({ version: -1 })
      .exec();
  }

  /**
   * Belirli bir versiyonu getirir
   */
  async getTemplateVersion(templateId: string, version: number): Promise<ReportTemplateVersionDocument | null> {
    return ReportTemplateVersionModel.findOne({ templateId, version }).exec();
  }

  /**
   * Belirli bir versiyona geri döner (restore)
   */
  async restoreTemplateVersion(
    templateId: string,
    version: number,
    changeDescription?: string,
    createdBy?: string
  ): Promise<ReportTemplateDocument | null> {
    const versionDoc = await this.getTemplateVersion(templateId, version);
    if (!versionDoc) {
      return null;
    }

    // Versiyon verilerini şablon olarak geri yükle
    const updates: Partial<CreateReportTemplatePayload> = {
      name: versionDoc.name,
      description: versionDoc.description,
      logo: versionDoc.logo,
      headerText: versionDoc.headerText,
      footerText: versionDoc.footerText,
      companyName: versionDoc.companyName,
      companyAddress: versionDoc.companyAddress,
      companyContact: versionDoc.companyContact,
      primaryColor: versionDoc.primaryColor,
      secondaryColor: versionDoc.secondaryColor,
      accentColor: versionDoc.accentColor,
      contentOptions: versionDoc.contentOptions,
      pdfOptions: versionDoc.pdfOptions,
      excelOptions: versionDoc.excelOptions,
    };

    return this.updateTemplate(
      templateId,
      updates,
      changeDescription || `Versiyon ${version} geri yüklendi`,
      createdBy
    );
  }

  /**
   * Önceden tanımlı şablonları oluşturur (ilk kurulum için)
   */
  async initializeDefaultTemplates(): Promise<void> {
    const existingTemplates = await ReportTemplateModel.countDocuments().exec();
    if (existingTemplates > 0) {
      return; // Zaten şablonlar var
    }

    // Minimal şablon
    await ReportTemplateModel.create({
      name: "Minimal",
      description: "Sade ve minimal rapor şablonu",
      primaryColor: "#000000",
      secondaryColor: "#6B7280",
      accentColor: "#EF4444",
      contentOptions: {
        includeSummary: true,
        includeTopRiskyImages: true,
        includeRecommendations: true,
        topRiskyCount: 5,
      },
      isDefault: false,
    });

    // Detaylı şablon
    await ReportTemplateModel.create({
      name: "Detaylı",
      description: "Tüm bölümleri içeren kapsamlı rapor şablonu",
      primaryColor: "#4472C4",
      secondaryColor: "#6B7280",
      accentColor: "#10B981",
      contentOptions: {
        includeSummary: true,
        includeRiskDistribution: true,
        includeTopRiskyImages: true,
        includeRiskFactorAnalysis: true,
        includeNamespaceAnalysis: true,
        includeTrends: true,
        includeRecommendations: true,
        topRiskyCount: 20,
      },
      pdfOptions: {
        pageSize: "A4",
        orientation: "portrait",
        margin: {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        },
      },
      isDefault: true,
    });

    // Executive şablon
    await ReportTemplateModel.create({
      name: "Executive",
      description: "Yönetim için özet rapor şablonu",
      primaryColor: "#1F2937",
      secondaryColor: "#6B7280",
      accentColor: "#3B82F6",
      contentOptions: {
        includeSummary: true,
        includeRiskDistribution: true,
        includeTopRiskyImages: true,
        includeRecommendations: true,
        topRiskyCount: 10,
      },
      pdfOptions: {
        pageSize: "A4",
        orientation: "portrait",
        fontSize: {
          title: 24,
          heading: 16,
          body: 12,
        },
      },
      isDefault: false,
    });

    console.log("[ReportTemplates] Varsayılan şablonlar oluşturuldu");
  }
}

