import { Schema, model, Document } from "mongoose";
import { ReportType } from "../services/pdfService";
import { ComplianceStandard } from "./compliance.model";

export type ScheduleFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface ScheduledReportDocument extends Document {
  name: string;
  description?: string;
  
  // Rapor tipi ve ayarları
  reportType: ReportType;
  complianceStandard?: ComplianceStandard; // COMPLIANCE raporu için
  
  // Filtreler
  filters?: {
    riskLevel?: string;
    namespace?: string;
    clusterId?: string;
    projectId?: string;
  };
  
  // Zamanlama
  frequency: ScheduleFrequency;
  dayOfWeek?: number; // 0-6 (Pazar=0) WEEKLY için
  dayOfMonth?: number; // 1-31 MONTHLY için
  time: string; // HH:MM formatında (örn: "09:00")
  timezone?: string; // Varsayılan: "Europe/Istanbul"
  
  // Alıcılar
  recipients: string[]; // E-posta adresleri
  
  // Durum
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastRunStatus?: "success" | "failed";
  lastRunError?: string;
  
  // İstatistikler
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledReportSchema = new Schema<ScheduledReportDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    reportType: {
      type: String,
      enum: ["RISK_SUMMARY", "COMPLIANCE", "EXECUTIVE", "DETAILED"],
      required: true,
    },
    complianceStandard: {
      type: String,
      enum: ["PCI-DSS", "SOC2", "ISO27001"],
    },
    filters: {
      riskLevel: { type: String },
      namespace: { type: String },
      clusterId: { type: String },
      projectId: { type: String },
    },
    frequency: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY"],
      required: true,
    },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    dayOfMonth: { type: Number, min: 1, max: 31 },
    time: { type: String, required: true }, // HH:MM formatı
    timezone: { type: String, default: "Europe/Istanbul" },
    recipients: { type: [String], required: true, default: [] },
    enabled: { type: Boolean, default: true, index: true },
    lastRunAt: { type: Date },
    nextRunAt: { type: Date, index: true },
    lastRunStatus: { type: String, enum: ["success", "failed"] },
    lastRunError: { type: String },
    totalRuns: { type: Number, default: 0 },
    successfulRuns: { type: Number, default: 0 },
    failedRuns: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes
ScheduledReportSchema.index({ enabled: 1, nextRunAt: 1 });
ScheduledReportSchema.index({ reportType: 1 });

export const ScheduledReportModel = model<ScheduledReportDocument>(
  "ScheduledReport",
  ScheduledReportSchema
);

