import { Schema, model, Document } from "mongoose";

export interface PackageVulnerability {
  cveId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number; // CVSS score
  description: string;
  fixedVersion?: string; // Eğer patch varsa
  publishedAt: Date;
  references?: string[];
}

export interface PackageInfo {
  name: string;
  version: string;
  type: "npm" | "pip" | "maven" | "golang" | "docker" | "os"; // Package manager veya OS package
  vulnerabilities: PackageVulnerability[];
}

export interface SBOMDocument extends Document {
  imageName: string;
  clusterId?: string;
  scannedAt: Date;
  
  // Package listesi
  packages: PackageInfo[];
  
  // Özet istatistikler
  totalPackages: number;
  vulnerablePackages: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  
  // SBOM format bilgisi
  format: "spdx" | "cyclonedx" | "syft"; // Hangi format kullanıldı
  scanner: "trivy" | "grype" | "syft" | "mock"; // Hangi scanner kullanıldı
  
  createdAt: Date;
  updatedAt: Date;
}

const PackageVulnerabilitySchema = new Schema<PackageVulnerability>(
  {
    cveId: { type: String, required: true },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
    },
    score: { type: Number, required: true },
    description: { type: String, required: true },
    fixedVersion: { type: String },
    publishedAt: { type: Date, required: true },
    references: { type: [String], default: [] },
  },
  { _id: false }
);

const PackageInfoSchema = new Schema<PackageInfo>(
  {
    name: { type: String, required: true },
    version: { type: String, required: true },
    type: {
      type: String,
      enum: ["npm", "pip", "maven", "golang", "docker", "os"],
      required: true,
    },
    vulnerabilities: { type: [PackageVulnerabilitySchema], default: [] },
  },
  { _id: false }
);

const SBOMSchema = new Schema<SBOMDocument>(
  {
    imageName: { type: String, required: true, index: true },
    clusterId: { type: String, index: true },
    scannedAt: { type: Date, required: true },
    
    packages: { type: [PackageInfoSchema], default: [] },
    
    totalPackages: { type: Number, default: 0 },
    vulnerablePackages: { type: Number, default: 0 },
    criticalVulnerabilities: { type: Number, default: 0 },
    highVulnerabilities: { type: Number, default: 0 },
    mediumVulnerabilities: { type: Number, default: 0 },
    lowVulnerabilities: { type: Number, default: 0 },
    
    format: {
      type: String,
      enum: ["spdx", "cyclonedx", "syft"],
      default: "syft",
    },
    scanner: {
      type: String,
      enum: ["trivy", "grype", "syft", "mock"],
      default: "mock",
    },
  },
  { timestamps: true }
);

// Compound index
SBOMSchema.index({ imageName: 1, clusterId: 1 });

export const SBOMModel = model<SBOMDocument>("SBOM", SBOMSchema);

