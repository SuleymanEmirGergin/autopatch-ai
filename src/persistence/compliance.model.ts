import { Schema, model, Document } from "mongoose";

export type ComplianceStandard = "PCI-DSS" | "SOC2" | "ISO27001";

export type ComplianceStatus = "PASS" | "FAIL" | "WARNING" | "NOT_APPLICABLE";

export interface ComplianceRequirement {
  id: string; // Unique requirement ID (e.g., "PCI-DSS-3.4")
  title: string;
  description: string;
  standard: ComplianceStandard;
  category: string; // e.g., "Image Security", "Access Control"
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: ComplianceStatus;
  evidence?: string[]; // Evidence/documentation links
  lastCheckedAt: Date;
  notes?: string;
}

export interface ComplianceAssessmentDocument extends Document {
  standard: ComplianceStandard;
  clusterId?: string;
  projectId?: string;
  
  // Assessment metadata
  assessedAt: Date;
  assessedBy?: string;
  version: string; // Standard version (e.g., "PCI-DSS v3.2.1")
  
  // Requirements
  requirements: ComplianceRequirement[];
  
  // Summary scores
  totalRequirements: number;
  passedRequirements: number;
  failedRequirements: number;
  warningRequirements: number;
  notApplicableRequirements: number;
  
  // Overall score (0-100)
  complianceScore: number;
  overallStatus: ComplianceStatus;
  
  // Next assessment date
  nextAssessmentDue?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceRequirementSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    standard: {
      type: String,
      enum: ["PCI-DSS", "SOC2", "ISO27001"],
      required: true,
    },
    category: { type: String, required: true },
    severity: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PASS", "FAIL", "WARNING", "NOT_APPLICABLE"],
      required: true,
    },
    evidence: { type: [String], default: [] },
    lastCheckedAt: { type: Date, required: true },
    notes: { type: String },
  },
  { _id: false }
);

const ComplianceAssessmentSchema = new Schema<ComplianceAssessmentDocument>(
  {
    standard: {
      type: String,
      enum: ["PCI-DSS", "SOC2", "ISO27001"],
      required: true,
      index: true,
    },
    clusterId: { type: String, index: true },
    projectId: { type: String, index: true },
    assessedAt: { type: Date, required: true },
    assessedBy: { type: String },
    version: { type: String, required: true },
    requirements: { type: [ComplianceRequirementSchema], default: [] },
    totalRequirements: { type: Number, default: 0 },
    passedRequirements: { type: Number, default: 0 },
    failedRequirements: { type: Number, default: 0 },
    warningRequirements: { type: Number, default: 0 },
    notApplicableRequirements: { type: Number, default: 0 },
    complianceScore: { type: Number, default: 0 },
    overallStatus: {
      type: String,
      enum: ["PASS", "FAIL", "WARNING", "NOT_APPLICABLE"],
      default: "FAIL",
    },
    nextAssessmentDue: { type: Date },
  },
  { timestamps: true }
);

// Indexes
ComplianceAssessmentSchema.index({ standard: 1, clusterId: 1, projectId: 1 });
ComplianceAssessmentSchema.index({ assessedAt: -1 });

export const ComplianceAssessmentModel = model<ComplianceAssessmentDocument>(
  "ComplianceAssessment",
  ComplianceAssessmentSchema
);

