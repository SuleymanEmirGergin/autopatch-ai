import { Schema, model, Document } from "mongoose";
import { RiskLevel } from "../risk/riskEngine";

export interface ScanRunImageEntry {
  imageName: string;
  riskScore: number;
  riskLevel: RiskLevel;
}

export type ScanStatus = "RUNNING" | "COMPLETED" | "FAILED";

export interface ScanRunDocument extends Document {
  startedAt: Date;
  finishedAt?: Date;
  status: ScanStatus;
  errorMessage?: string;
  images: ScanRunImageEntry[];
}

const ScanRunImageSchema = new Schema<ScanRunImageEntry>(
  {
    imageName: { type: String, required: true },
    riskScore: { type: Number, required: true },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
    },
  },
  { _id: false }
);

const ScanRunSchema = new Schema<ScanRunDocument>({
  startedAt: { type: Date, required: true },
  finishedAt: { type: Date },
  status: {
    type: String,
    enum: ["RUNNING", "COMPLETED", "FAILED"],
    default: "RUNNING",
    required: true,
  },
  errorMessage: { type: String },
  images: { type: [ScanRunImageSchema], default: [] },
});

export const ScanRunModel = model<ScanRunDocument>("ScanRun", ScanRunSchema);


