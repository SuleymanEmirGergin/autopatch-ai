import { Schema, model, Document } from "mongoose";

export type NotificationType =
  | "RISK_DETECTED"
  | "ANOMALY_DETECTED"
  | "BUDGET_EXCEEDED"
  | "SCAN_COMPLETE"
  | "CVE_DETECTED"
  | "ALERT_TRIGGERED";

export type NotificationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface NotificationGroupDocument extends Document {
  type: NotificationType;
  severity: NotificationSeverity;
  
  // Gruplama bilgisi
  groupKey: string; // Benzer bildirimleri gruplamak için unique key
  title: string; // Gruplanmış bildirim başlığı
  summary: string; // Özet mesaj
  
  // İlgili kaynaklar
  affectedImages: string[]; // Etkilenen image'ler
  affectedClusters?: string[]; // Etkilenen cluster'lar
  metadata?: Record<string, any>; // Ek bilgiler
  
  // Zaman bilgisi
  firstOccurredAt: Date; // İlk oluşma zamanı
  lastOccurredAt: Date; // Son oluşma zamanı
  count: number; // Kaç kez tekrarlandı
  
  // Durum
  acknowledged: boolean; // Kullanıcı tarafından onaylandı mı
  acknowledgedAt?: Date;
  dismissed: boolean; // Kullanıcı tarafından reddedildi mi
  dismissedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const NotificationGroupSchema = new Schema<NotificationGroupDocument>(
  {
    type: {
      type: String,
      enum: [
        "RISK_DETECTED",
        "ANOMALY_DETECTED",
        "BUDGET_EXCEEDED",
        "SCAN_COMPLETE",
        "CVE_DETECTED",
        "ALERT_TRIGGERED",
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
    groupKey: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    affectedImages: { type: [String], default: [] },
    affectedClusters: { type: [String], default: [] },
    metadata: { type: Schema.Types.Mixed },
    firstOccurredAt: { type: Date, required: true },
    lastOccurredAt: { type: Date, required: true },
    count: { type: Number, default: 1 },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
    dismissed: { type: Boolean, default: false },
    dismissedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
NotificationGroupSchema.index({ acknowledged: 1, dismissed: 1, lastOccurredAt: -1 });
NotificationGroupSchema.index({ type: 1, severity: 1 });

export const NotificationGroupModel = model<NotificationGroupDocument>(
  "NotificationGroup",
  NotificationGroupSchema
);

