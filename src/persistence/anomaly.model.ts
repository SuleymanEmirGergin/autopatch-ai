import { Schema, model, Document } from "mongoose";

export type AnomalyType =
  | "RISK_SCORE_SPIKE" // Risk skorunda ani artış
  | "RISK_SCORE_DROP" // Risk skorunda ani düşüş
  | "NEW_RISK_FACTOR" // Yeni risk faktörü eklendi
  | "POD_COUNT_INCREASE" // Pod sayısında ani artış
  | "CRITICAL_VULNERABILITY" // Kritik CVE eklendi
  | "IMAGE_DELETED" // Image silindi
  | "UNUSUAL_NAMESPACE"; // Alışılmadık namespace'de görüldü

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AnomalyDocument extends Document {
  imageName: string;
  clusterId?: string;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  
  // Anomali detayları
  description: string;
  previousValue?: number | string; // Önceki değer
  currentValue?: number | string; // Mevcut değer
  changePercentage?: number; // Değişim yüzdesi
  
  // İlgili kaynaklar
  affectedPods?: { namespace: string; name: string }[];
  riskFactors?: string[];
  
  // Zaman bilgisi
  detectedAt: Date;
  resolvedAt?: Date; // Çözüldüyse
  
  // Metadata
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

const AnomalySchema = new Schema<AnomalyDocument>(
  {
    imageName: { type: String, required: true, index: true },
    clusterId: { type: String, index: true },
    anomalyType: {
      type: String,
      enum: [
        "RISK_SCORE_SPIKE",
        "RISK_SCORE_DROP",
        "NEW_RISK_FACTOR",
        "POD_COUNT_INCREASE",
        "CRITICAL_VULNERABILITY",
        "IMAGE_DELETED",
        "UNUSUAL_NAMESPACE",
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed },
    currentValue: { type: Schema.Types.Mixed },
    changePercentage: { type: Number },
    affectedPods: {
      type: [
        {
          namespace: String,
          name: String,
        },
      ],
      default: [],
    },
    riskFactors: { type: [String], default: [] },
    detectedAt: { type: Date, required: true, index: true },
    resolvedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Compound indexes
AnomalySchema.index({ imageName: 1, detectedAt: -1 });
AnomalySchema.index({ clusterId: 1, detectedAt: -1 });
AnomalySchema.index({ anomalyType: 1, severity: 1, detectedAt: -1 });
AnomalySchema.index({ resolvedAt: 1 }); // Çözülmemiş anomali'leri bulmak için

export const AnomalyModel = model<AnomalyDocument>("Anomaly", AnomalySchema);

