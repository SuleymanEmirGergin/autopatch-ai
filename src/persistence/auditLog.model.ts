import { Schema, model, Document } from "mongoose";

export type AuditAction =
  | "SCAN_TRIGGERED"
  | "SCAN_COMPLETED"
  | "SCAN_FAILED"
  | "ALLOWLIST_CREATED"
  | "ALLOWLIST_UPDATED"
  | "ALLOWLIST_DELETED"
  | "CUSTOM_RULE_CREATED"
  | "CUSTOM_RULE_UPDATED"
  | "CUSTOM_RULE_DELETED"
  | "CUSTOM_RULE_TOGGLED"
  | "ALERT_RULE_CREATED"
  | "ALERT_RULE_UPDATED"
  | "ALERT_RULE_DELETED"
  | "IMAGE_VIEWED"
  | "EXPORT_GENERATED";

export interface AuditLogDocument extends Document {
  action: AuditAction;
  userId?: string;
  userIp?: string;
  resourceType?: string; // "image", "allowlist", "customRule", etc.
  resourceId?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    action: {
      type: String,
      enum: [
        "SCAN_TRIGGERED",
        "SCAN_COMPLETED",
        "SCAN_FAILED",
        "ALLOWLIST_CREATED",
        "ALLOWLIST_UPDATED",
        "ALLOWLIST_DELETED",
        "CUSTOM_RULE_CREATED",
        "CUSTOM_RULE_UPDATED",
        "CUSTOM_RULE_DELETED",
        "CUSTOM_RULE_TOGGLED",
        "ALERT_RULE_CREATED",
        "ALERT_RULE_UPDATED",
        "ALERT_RULE_DELETED",
        "IMAGE_VIEWED",
        "EXPORT_GENERATED",
      ],
      required: true,
    },
    userId: { type: String },
    userIp: { type: String },
    resourceType: { type: String },
    resourceId: { type: String },
    details: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false }
);

// Index for faster queries
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });

export const AuditLogModel = model<AuditLogDocument>(
  "AuditLog",
  AuditLogSchema
);

