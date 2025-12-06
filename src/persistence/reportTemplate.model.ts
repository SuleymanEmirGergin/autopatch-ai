import { Schema, model, Document } from "mongoose";

export interface ReportTemplateDocument extends Document {
  name: string;
  description?: string;
  
  // Görsel özelleştirme
  logo?: string; // Base64 veya URL
  headerText?: string;
  footerText?: string;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  
  // Renk şeması
  primaryColor?: string; // Hex color (örn: #4472C4)
  secondaryColor?: string;
  accentColor?: string;
  
  // İçerik seçenekleri
  contentOptions: {
    includeSummary?: boolean;
    includeRiskDistribution?: boolean;
    includeTopRiskyImages?: boolean;
    includeRiskFactorAnalysis?: boolean;
    includeNamespaceAnalysis?: boolean;
    includeTrends?: boolean;
    includeRecommendations?: boolean;
    topRiskyCount?: number; // Kaç image gösterilecek (varsayılan: 10)
  };
  
  // PDF özelleştirme
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
  
  // Excel özelleştirme
  excelOptions?: {
    includeCharts?: boolean;
    includePivotTables?: boolean;
    sheetOrder?: string[]; // Sayfa sırası
  };
  
  // Varsayılan şablon mu?
  isDefault: boolean;
  
  // Kategoriler ve Tags
  category?: string; // Ana kategori (örn: "Executive", "Technical", "Compliance")
  tags?: string[]; // Etiketler (örn: ["monthly-report", "risk-analysis", "compliance"])
  
  // Kullanım istatistikleri
  usageCount: number;
  lastUsedAt?: Date;
  
  // Versiyonlama
  currentVersion: number; // Mevcut versiyon numarası
  versionCount: number; // Toplam versiyon sayısı
  
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // User ID (gelecekte kullanım için)
}

const ReportTemplateSchema = new Schema<ReportTemplateDocument>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    logo: { type: String },
    headerText: { type: String },
    footerText: { type: String },
    companyName: { type: String },
    companyAddress: { type: String },
    companyContact: { type: String },
    primaryColor: { type: String, default: "#4472C4" },
    secondaryColor: { type: String, default: "#6B7280" },
    accentColor: { type: String, default: "#10B981" },
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
      pageSize: { type: String, enum: ["A4", "LETTER"], default: "A4" },
      orientation: { type: String, enum: ["portrait", "landscape"], default: "portrait" },
      margin: {
        top: { type: Number, default: 50 },
        right: { type: Number, default: 50 },
        bottom: { type: Number, default: 50 },
        left: { type: Number, default: 50 },
      },
      fontFamily: { type: String, default: "Helvetica" },
      fontSize: {
        title: { type: Number, default: 20 },
        heading: { type: Number, default: 14 },
        body: { type: Number, default: 10 },
      },
    },
    excelOptions: {
      includeCharts: { type: Boolean, default: false },
      includePivotTables: { type: Boolean, default: false },
      sheetOrder: { type: [String], default: [] },
    },
    isDefault: { type: Boolean, default: false, index: true },
    category: { type: String, index: true },
    tags: { type: [String], default: [], index: true },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    currentVersion: { type: Number, default: 1 },
    versionCount: { type: Number, default: 1 },
    createdBy: { type: String },
  },
  { timestamps: true }
);

// Indexes
ReportTemplateSchema.index({ isDefault: 1 });
ReportTemplateSchema.index({ name: 1 });

export const ReportTemplateModel = model<ReportTemplateDocument>(
  "ReportTemplate",
  ReportTemplateSchema
);

