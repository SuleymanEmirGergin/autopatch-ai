import { Schema, model, Document } from "mongoose";

export interface RiskAllowlistDocument extends Document {
  imageName: string;
  ignoredRiskFactors: string[];
  note?: string;
}

const RiskAllowlistSchema = new Schema<RiskAllowlistDocument>({
  imageName: { type: String, required: true, unique: true },
  ignoredRiskFactors: { type: [String], default: [] },
  note: { type: String },
});

export const RiskAllowlistModel = model<RiskAllowlistDocument>(
  "RiskAllowlist",
  RiskAllowlistSchema
);


