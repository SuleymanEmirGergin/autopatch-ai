import { Schema, model, Document } from "mongoose";

export type CustomRuleField =
  | "imageName"
  | "namespace"
  | "tag"
  | "age"
  | "baseImage"
  | "custom";

export type CustomRuleOperator =
  | "contains"
  | "equals"
  | "startsWith"
  | "endsWith"
  | "regex"
  | "greaterThan"
  | "lessThan";

export type CustomRuleConjunction = "AND" | "OR";

export interface CustomRuleCondition {
  type: CustomRuleField;
  operator: CustomRuleOperator;
  value: string | number;
  /**
   * Birden fazla koşul zincirlerken kullanılacak bağlaç.
   * İlk koşul için genellikle kullanılmaz.
   */
  conj?: CustomRuleConjunction;
}

export interface CustomRiskRuleDocument extends Document {
  name: string;
  description?: string;
  enabled: boolean;
  /**
   * Geriye dönük uyumluluk için tekil condition alanı korunuyor.
   * Yeni kurallar mümkünse conditions dizisini kullanmalı.
   */
  condition: CustomRuleCondition;
  /**
   * Opsiyonel çoklu koşul desteği.
   * Eğer doluysa evaluator bu alanı kullanır, aksi halde condition alanına düşer.
   */
  conditions?: CustomRuleCondition[];
  riskScore: number;
  riskFactor: string;
  priority: number; // Düşük sayı = yüksek öncelik
  createdAt: Date;
  updatedAt: Date;
}

const CustomRiskRuleSchema = new Schema<CustomRiskRuleDocument>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    enabled: { type: Boolean, default: true },
    condition: {
      type: {
        type: String,
        enum: ["imageName", "namespace", "tag", "age", "baseImage", "custom"],
        required: true,
      },
      operator: {
        type: String,
        enum: [
          "contains",
          "equals",
          "startsWith",
          "endsWith",
          "regex",
          "greaterThan",
          "lessThan",
        ],
        required: true,
      },
      value: { type: Schema.Types.Mixed, required: true },
    },
    conditions: [
      {
        type: {
          type: String,
          enum: [
            "imageName",
            "namespace",
            "tag",
            "age",
            "baseImage",
            "custom",
          ],
        },
        operator: {
          type: String,
          enum: [
            "contains",
            "equals",
            "startsWith",
            "endsWith",
            "regex",
            "greaterThan",
            "lessThan",
          ],
        },
        value: { type: Schema.Types.Mixed },
        conj: {
          type: String,
          enum: ["AND", "OR"],
        },
      },
    ],
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskFactor: { type: String, required: true },
    priority: { type: Number, default: 100 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const CustomRiskRuleModel = model<CustomRiskRuleDocument>(
  "CustomRiskRule",
  CustomRiskRuleSchema
);

