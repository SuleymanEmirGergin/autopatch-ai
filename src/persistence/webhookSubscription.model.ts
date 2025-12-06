import { Schema, model, Document } from "mongoose";

export type WebhookEventType =
  | "scan.complete"
  | "scan.failed"
  | "risk.new"
  | "risk.updated"
  | "anomaly.detected"
  | "budget.exceeded"
  | "cve.detected"
  | "image.deleted"
  | "*"; // Tüm event'leri dinle

export interface WebhookSubscriptionDocument extends Document {
  name: string;
  description?: string;
  url: string; // Webhook URL'i
  events: WebhookEventType[]; // Dinlenecek event tipleri
  
  // Authentication
  secret?: string; // HMAC signature için secret key
  headers?: Record<string, string>; // Custom headers
  
  // Durum
  enabled: boolean;
  active: boolean; // Son delivery başarılı mı
  
  // İstatistikler
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  lastDeliveryAt?: Date;
  lastDeliveryStatus?: "success" | "failed";
  lastDeliveryError?: string;
  
  // Retry ayarları
  retryEnabled: boolean;
  maxRetries: number; // Maksimum retry sayısı
  retryIntervalMs: number; // Retry aralığı (ms)
  
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSubscriptionSchema = new Schema<WebhookSubscriptionDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true, index: true },
    events: {
      type: [String],
      enum: [
        "scan.complete",
        "scan.failed",
        "risk.new",
        "risk.updated",
        "anomaly.detected",
        "budget.exceeded",
        "cve.detected",
        "image.deleted",
        "*",
      ],
      default: ["*"],
    },
    secret: { type: String },
    headers: { type: Schema.Types.Mixed },
    enabled: { type: Boolean, default: true, index: true },
    active: { type: Boolean, default: true },
    totalDeliveries: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
    lastDeliveryAt: { type: Date },
    lastDeliveryStatus: { type: String, enum: ["success", "failed"] },
    lastDeliveryError: { type: String },
    retryEnabled: { type: Boolean, default: true },
    maxRetries: { type: Number, default: 3 },
    retryIntervalMs: { type: Number, default: 5000 }, // 5 saniye
  },
  { timestamps: true }
);

// Indexes
WebhookSubscriptionSchema.index({ enabled: 1, active: 1 });
WebhookSubscriptionSchema.index({ url: 1 });

export const WebhookSubscriptionModel = model<WebhookSubscriptionDocument>(
  "WebhookSubscription",
  WebhookSubscriptionSchema
);

