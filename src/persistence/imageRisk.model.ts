import { Schema, model, Document } from "mongoose";
import { RiskLevel } from "../risk/riskEngine";

export interface ImageRiskDocument extends Document {
  imageName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  lastScannedAt: Date;
  pods: { namespace: string; name: string }[];
  riskFactors: string[];
  clusterId?: string; // Multi-cluster desteği için
  projectId?: string; // Multi-project desteği için
}

const PodRefSchema = new Schema(
  {
    namespace: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const ImageRiskSchema = new Schema<ImageRiskDocument>({
  imageName: { type: String, required: true },
  riskScore: { type: Number, required: true },
  riskLevel: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    required: true,
  },
  lastScannedAt: { type: Date, required: true },
  pods: { type: [PodRefSchema], default: [] },
  riskFactors: { type: [String], default: [] },
  clusterId: { type: String, index: true },
  projectId: { type: String, index: true },
});

// Compound index for cluster/project filtering
ImageRiskSchema.index({ clusterId: 1, projectId: 1 });
ImageRiskSchema.index({ imageName: 1, clusterId: 1 }, { unique: true });

export const ImageRiskModel = model<ImageRiskDocument>(
  "ImageRisk",
  ImageRiskSchema
);


