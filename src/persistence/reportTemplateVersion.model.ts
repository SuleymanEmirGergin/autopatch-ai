import { Schema, model, Document } from "mongoose";

export interface ReportTemplateVersionDocument extends Document {
  templateId: string; // Ana şablon ID'si
  version: number; // Versiyon numarası (1, 2, 3, ...)
  
  // Şablon verilerinin snapshot'ı
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
  contentOptions: {
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
  
  // Versiyon bilgileri
  changeDescription?: string; // Bu versiyonda ne değişti?
  createdBy?: string; // Kim oluşturdu?
  createdAt: Date;
}

const ReportTemplateVersionSchema = new Schema<ReportTemplateVersionDocument>(
  {
    templateId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    headerText: { type: String },
    footerText: { type: String },
    companyName: { type: String },
    companyAddress: { type: String },
    companyContact: { type: String },
    primaryColor: { type: String },
    secondaryColor: { type: String },
    accentColor: { type: String },
    contentOptions: {
      includeSummary: { type: Boolean, default: true },
      includeRiskDistribution: { type: Boolean, default: true },
      includeTopRiskyImages: { type: Boolean, default: true },
      includeRiskFactorAnalysis: { type: Boolean, default: false },
      includeNamespaceAnalysis: { type: Boolean, default: false },
      includeTrends: { type: Boolean, default: false },
      includeRecommendations: { type: Boolean, default: true },
      topRiskyCount: { type: Number, default: 10 },
    },
    pdfOptions: {
      pageSize: { type: String, enum: ["A4", "LETTER"] },
      orientation: { type: String, enum: ["portrait", "landscape"] },
      margin: {
        top: { type: Number },
        right: { type: Number },
        bottom: { type: Number },
        left: { type: Number },
      },
      fontFamily: { type: String },
      fontSize: {
        title: { type: Number },
        heading: { type: Number },
        body: { type: Number },
      },
    },
    excelOptions: {
      includeCharts: { type: Boolean },
      includePivotTables: { type: Boolean },
      sheetOrder: { type: [String] },
    },
    changeDescription: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

// Compound index
ReportTemplateVersionSchema.index({ templateId: 1, version: -1 });
ReportTemplateVersionSchema.index({ templateId: 1, createdAt: -1 });

export const ReportTemplateVersionModel = model<ReportTemplateVersionDocument>(
  "ReportTemplateVersion",
  ReportTemplateVersionSchema
);

