import { Schema, model, Document } from "mongoose";

export interface AlertRuleDocument extends Document {
  name: string;
  enabled: boolean;
  conditions: {
    riskLevel?: "HIGH" | "CRITICAL";
    minRiskScore?: number;
    prodOnly?: boolean;
    namespace?: string;
  };
  notificationChannels: {
    email?: boolean;
    webhook?: boolean;
  };
  lastTriggeredAt?: Date;
}

const AlertRuleSchema = new Schema<AlertRuleDocument>({
  name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  conditions: {
    riskLevel: {
      type: String,
      enum: ["HIGH", "CRITICAL"],
    },
    minRiskScore: { type: Number },
    prodOnly: { type: Boolean, default: false },
    namespace: { type: String },
  },
  notificationChannels: {
    email: { type: Boolean, default: false },
    webhook: { type: Boolean, default: false },
  },
  lastTriggeredAt: { type: Date },
});

export const AlertRuleModel = model<AlertRuleDocument>(
  "AlertRule",
  AlertRuleSchema
);

