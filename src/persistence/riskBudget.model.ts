import { Schema, model, Document } from "mongoose";

export interface RiskBudgetDocument extends Document {
  name: string;
  description?: string;
  enabled: boolean;
  clusterId?: string; // Multi-cluster desteği için
  projectId?: string; // Multi-project desteği için
  
  // Threshold'lar
  maxCritical: number | null; // null = sınırsız
  maxHigh: number | null;
  maxMedium: number | null;
  maxTotalRiskScore: number | null; // Toplam risk skoru eşiği
  
  // Alert ayarları
  alertOnExceed: boolean;
  alertChannels: string[]; // ["email", "slack", "webhook"]
  
  // İstatistikler
  currentCritical: number;
  currentHigh: number;
  currentMedium: number;
  currentTotalRiskScore: number;
  lastCheckedAt: Date | null;
  exceededAt: Date | null; // Son aşma zamanı
  
  createdAt: Date;
  updatedAt: Date;
}

const RiskBudgetSchema = new Schema<RiskBudgetDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    enabled: { type: Boolean, default: true },
    clusterId: { type: String, index: true },
    projectId: { type: String, index: true },
    
    maxCritical: { type: Number, default: null },
    maxHigh: { type: Number, default: null },
    maxMedium: { type: Number, default: null },
    maxTotalRiskScore: { type: Number, default: null },
    
    alertOnExceed: { type: Boolean, default: true },
    alertChannels: { type: [String], default: [] },
    
    currentCritical: { type: Number, default: 0 },
    currentHigh: { type: Number, default: 0 },
    currentMedium: { type: Number, default: 0 },
    currentTotalRiskScore: { type: Number, default: 0 },
    lastCheckedAt: { type: Date, default: null },
    exceededAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index
RiskBudgetSchema.index({ clusterId: 1, projectId: 1 });

export const RiskBudgetModel = model<RiskBudgetDocument>(
  "RiskBudget",
  RiskBudgetSchema
);

