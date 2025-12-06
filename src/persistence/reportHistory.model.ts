import { Schema, model, Document } from "mongoose";

export type ReportType = "RISK_SUMMARY" | "COMPLIANCE" | "EXECUTIVE" | "DETAILED" | "EXCEL_EXPORT" | "CSV_EXPORT" | "JSON_EXPORT";

export interface ReportHistoryDocument extends Document {
  reportType: ReportType;
  templateId?: string; // Hangi şablon kullanıldı
  templateName?: string; // Şablon adı (snapshot)
  
  // Filtreler ve parametreler
  filters?: {
    riskLevel?: string;
    namespace?: string;
    clusterId?: string;
    projectId?: string;
    standard?: string; // Compliance için
  };
  
  // Rapor bilgileri
  fileName: string;
  fileSize?: number; // Byte cinsinden
  filePath?: string; // Dosya yolu (eğer saklanıyorsa)
  format?: "PDF" | "XLSX" | "CSV" | "JSON";
  
  // İstatistikler (snapshot)
  stats?: {
    totalImages?: number;
    highOrCritical?: number;
    prodImpactedPods?: number;
    avgRiskScore?: number;
  };
  
  // Oluşturan kullanıcı bilgisi
  createdBy?: string; // API Key veya User ID
  createdAt: Date;
}

const ReportHistorySchema = new Schema<ReportHistoryDocument>(
  {
    reportType: {
      type: String,
      enum: ["RISK_SUMMARY", "COMPLIANCE", "EXECUTIVE", "DETAILED", "EXCEL_EXPORT", "CSV_EXPORT", "JSON_EXPORT"],
      required: true,
      index: true,
    },
    templateId: { type: String, index: true },
    templateName: { type: String },
    filters: {
      riskLevel: { type: String },
      namespace: { type: String },
      clusterId: { type: String },
      projectId: { type: String },
      standard: { type: String },
    },
    fileName: { type: String, required: true },
    fileSize: { type: Number },
    filePath: { type: String },
    format: {
      type: String,
      enum: ["PDF", "XLSX", "CSV", "JSON"],
    },
    stats: {
      totalImages: { type: Number },
      highOrCritical: { type: Number },
      prodImpactedPods: { type: Number },
      avgRiskScore: { type: Number },
    },
    createdBy: { type: String },
  },
  { timestamps: true }
);

// Indexes
ReportHistorySchema.index({ createdAt: -1 });
ReportHistorySchema.index({ reportType: 1, createdAt: -1 });
ReportHistorySchema.index({ templateId: 1 });
ReportHistorySchema.index({ "filters.clusterId": 1 });
ReportHistorySchema.index({ "filters.projectId": 1 });

export const ReportHistoryModel = model<ReportHistoryDocument>(
  "ReportHistory",
  ReportHistorySchema
);

