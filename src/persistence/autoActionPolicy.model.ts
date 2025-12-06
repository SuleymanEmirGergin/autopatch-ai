import { Schema, model, Document } from "mongoose";
import { RiskLevel } from "../risk/riskEngine";

export type AutoActionType =
  | "NOTIFY"
  | "REMEDIATE_DRY_RUN"
  | "REMEDIATE_EXECUTE";

export interface AutoActionPolicyDocument extends Document {
  name: string;
  description?: string;
  enabled: boolean;
  clusterId?: string;
  projectId?: string;
  riskScoreThreshold: number;
  riskLevels: RiskLevel[];
  namespaces: string[];
  riskFactors: string[];
  maxActionsPerRun: number;
  actionType: AutoActionType;
  notifyChannels: string[];
  dryRun: boolean; // for remediation actions
  createdAt: Date;
  updatedAt: Date;
}

const AutoActionPolicySchema = new Schema<AutoActionPolicyDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    enabled: { type: Boolean, default: true },
    clusterId: { type: String, index: true },
    projectId: { type: String, index: true },
    riskScoreThreshold: { type: Number, default: 70 },
    riskLevels: {
      type: [String],
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: ["HIGH", "CRITICAL"],
    },
    namespaces: { type: [String], default: [] },
    riskFactors: { type: [String], default: [] },
    maxActionsPerRun: { type: Number, default: 5 },
    actionType: {
      type: String,
      enum: ["NOTIFY", "REMEDIATE_DRY_RUN", "REMEDIATE_EXECUTE"],
      default: "NOTIFY",
    },
    notifyChannels: { type: [String], default: [] },
    dryRun: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AutoActionPolicySchema.index({ clusterId: 1, projectId: 1 });

export const AutoActionPolicyModel = model<AutoActionPolicyDocument>(
  "AutoActionPolicy",
  AutoActionPolicySchema
);


