import { Schema, model, Document } from "mongoose";

export type ApiTokenRole = "admin" | "readonly";

export interface ApiTokenDocument extends Document {
  token: string;
  label: string;
  role: ApiTokenRole;
  scopes: string[];
  expiresAt?: Date | null;
  createdAt: Date;
  lastUsedAt?: Date | null;
  createdBy?: string | null;
}

const ApiTokenSchema = new Schema<ApiTokenDocument>({
  token: { type: String, required: true, unique: true, index: true },
  label: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ["admin", "readonly"],
    default: "readonly",
  },
  scopes: {
    type: [String],
    default: [],
  },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: () => new Date() },
  lastUsedAt: { type: Date, default: null },
  createdBy: { type: String, default: null },
});

export const ApiTokenModel = model<ApiTokenDocument>(
  "ApiToken",
  ApiTokenSchema
);


