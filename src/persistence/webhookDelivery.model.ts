import { Schema, model, Document } from "mongoose";

export interface WebhookDeliveryDocument extends Document {
  subscriptionId: string; // WebhookSubscription ID
  eventType: string;
  payload: Record<string, any>;
  
  // Delivery durumu
  status: "pending" | "delivered" | "failed" | "retrying";
  attempts: number; // Kaç kez denendi
  maxAttempts: number;
  
  // HTTP response bilgileri
  responseStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  
  // Zaman bilgisi
  scheduledAt: Date;
  deliveredAt?: Date;
  nextRetryAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const WebhookDeliverySchema = new Schema<WebhookDeliveryDocument>(
  {
    subscriptionId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["pending", "delivered", "failed", "retrying"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    responseStatus: { type: Number },
    responseBody: { type: String },
    errorMessage: { type: String },
    scheduledAt: { type: Date, required: true, index: true },
    deliveredAt: { type: Date },
    nextRetryAt: { type: Date, index: true },
  },
  { timestamps: true }
);

// Indexes
WebhookDeliverySchema.index({ subscriptionId: 1, status: 1 });
WebhookDeliverySchema.index({ nextRetryAt: 1, status: 1 }); // Retry için

export const WebhookDeliveryModel = model<WebhookDeliveryDocument>(
  "WebhookDelivery",
  WebhookDeliverySchema
);

