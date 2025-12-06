import {
  ComplianceAssessmentModel,
  ComplianceAssessmentDocument,
  ComplianceStandard,
  ComplianceRequirement,
  ComplianceStatus,
} from "../persistence/compliance.model";
import { ImageRiskRepository, MongoImageRiskRepository } from "../persistence/imageRisk.repository";

export interface ComplianceCheckResult {
  requirementId: string;
  status: ComplianceStatus;
  evidence: string[];
  notes?: string;
}

export class ComplianceService {
  private imageRiskRepo: ImageRiskRepository;

  constructor() {
    this.imageRiskRepo = new MongoImageRiskRepository();
  }

  /**
   * Compliance değerlendirmesi oluşturur veya günceller
   */
  async assessCompliance(
    standard: ComplianceStandard,
    clusterId?: string,
    projectId?: string
  ): Promise<ComplianceAssessmentDocument> {
    const requirements = this.getRequirementsForStandard(standard);
    const checks = await this.performComplianceChecks(standard, clusterId, projectId);

    // Requirements ile checks'i birleştir
    const assessedRequirements: ComplianceRequirement[] = requirements.map((req) => {
      const check = checks.find((c) => c.requirementId === req.id);
      return {
        ...req,
        status: check?.status || "NOT_APPLICABLE",
        evidence: check?.evidence || [],
        notes: check?.notes,
        lastCheckedAt: new Date(),
      };
    });

    // Skorları hesapla
    const totalRequirements = assessedRequirements.length;
    const passedRequirements = assessedRequirements.filter(
      (r) => r.status === "PASS"
    ).length;
    const failedRequirements = assessedRequirements.filter(
      (r) => r.status === "FAIL"
    ).length;
    const warningRequirements = assessedRequirements.filter(
      (r) => r.status === "WARNING"
    ).length;
    const notApplicableRequirements = assessedRequirements.filter(
      (r) => r.status === "NOT_APPLICABLE"
    ).length;

    // Compliance skoru hesapla (PASS olanların yüzdesi)
    const applicableRequirements = totalRequirements - notApplicableRequirements;
    const complianceScore =
      applicableRequirements > 0
        ? Math.round((passedRequirements / applicableRequirements) * 100)
        : 100;

    // Genel durum
    const overallStatus: ComplianceStatus =
      failedRequirements > 0
        ? "FAIL"
        : warningRequirements > 0
        ? "WARNING"
        : complianceScore >= 80
        ? "PASS"
        : "WARNING";

    // Mevcut assessment'ı bul veya yeni oluştur
    const query: any = { standard, clusterId: clusterId || undefined, projectId: projectId || undefined };
    const existing = await ComplianceAssessmentModel.findOne(query).exec();

    const assessmentData = {
      standard,
      clusterId,
      projectId,
      assessedAt: new Date(),
      version: this.getStandardVersion(standard),
      requirements: assessedRequirements,
      totalRequirements,
      passedRequirements,
      failedRequirements,
      warningRequirements,
      notApplicableRequirements,
      complianceScore,
      overallStatus,
      nextAssessmentDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 gün sonra
    };

    if (existing) {
      existing.set(assessmentData);
      await existing.save();
      return existing;
    } else {
      return await ComplianceAssessmentModel.create(assessmentData);
    }
  }

  /**
   * Standart için gereksinimleri döner
   */
  private getRequirementsForStandard(standard: ComplianceStandard): Omit<ComplianceRequirement, "status" | "evidence" | "lastCheckedAt" | "notes">[] {
    switch (standard) {
      case "PCI-DSS":
        return [
          {
            id: "PCI-DSS-3.4",
            title: "Container Image Güvenliği",
            description: "Tüm container image'leri güvenli ve güncel olmalıdır",
            standard: "PCI-DSS",
            category: "Image Security",
            severity: "CRITICAL",
          },
          {
            id: "PCI-DSS-6.2",
            title: "Güvenlik Açığı Yönetimi",
            description: "Bilinen güvenlik açıkları için düzenli tarama yapılmalıdır",
            standard: "PCI-DSS",
            category: "Vulnerability Management",
            severity: "HIGH",
          },
          {
            id: "PCI-DSS-7.1",
            title: "Erişim Kontrolü",
            description: "Production ortamına erişim sınırlandırılmalıdır",
            standard: "PCI-DSS",
            category: "Access Control",
            severity: "CRITICAL",
          },
        ];
      case "SOC2":
        return [
          {
            id: "SOC2-CC6.1",
            title: "Güvenlik Kontrolleri",
            description: "Güvenlik kontrolleri düzenli olarak değerlendirilmelidir",
            standard: "SOC2",
            category: "Security Controls",
            severity: "HIGH",
          },
          {
            id: "SOC2-CC7.2",
            title: "Sistem İzleme",
            description: "Sistemler sürekli izlenmeli ve anomaliler tespit edilmelidir",
            standard: "SOC2",
            category: "Monitoring",
            severity: "MEDIUM",
          },
        ];
      case "ISO27001":
        return [
          {
            id: "ISO27001-A.9.4.2",
            title: "Güvenli Sistem Kullanımı",
            description: "Sistemler güvenli bir şekilde kullanılmalıdır",
            standard: "ISO27001",
            category: "System Security",
            severity: "HIGH",
          },
          {
            id: "ISO27001-A.12.6.1",
            title: "Güvenlik Açığı Yönetimi",
            description: "Güvenlik açıkları yönetilmeli ve düzeltilmelidir",
            standard: "ISO27001",
            category: "Vulnerability Management",
            severity: "CRITICAL",
          },
        ];
      default:
        return [];
    }
  }

  /**
   * Compliance kontrollerini gerçekleştirir
   */
  private async performComplianceChecks(
    standard: ComplianceStandard,
    clusterId?: string,
    projectId?: string
  ): Promise<ComplianceCheckResult[]> {
    const images = await this.imageRiskRepo.findAll(clusterId, projectId);
    const stats = await this.imageRiskRepo.getStats(clusterId, projectId);

    const results: ComplianceCheckResult[] = [];

    switch (standard) {
      case "PCI-DSS":
        // PCI-DSS-3.4: Container Image Güvenliği
        const highCriticalImages = images.filter(
          (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
        );
        results.push({
          requirementId: "PCI-DSS-3.4",
          status:
            highCriticalImages.length === 0
              ? "PASS"
              : highCriticalImages.length <= stats.totalImages * 0.1
              ? "WARNING"
              : "FAIL",
          evidence: highCriticalImages.slice(0, 5).map((img) => img.imageName),
          notes: `${highCriticalImages.length} HIGH/CRITICAL riskli image tespit edildi`,
        });

        // PCI-DSS-6.2: Güvenlik Açığı Yönetimi
        const hasRecentScan = stats.lastScanAt && 
          (Date.now() - stats.lastScanAt.getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 gün içinde
        results.push({
          requirementId: "PCI-DSS-6.2",
          status: hasRecentScan ? "PASS" : "FAIL",
          evidence: stats.lastScanAt ? [stats.lastScanAt.toISOString()] : [],
          notes: hasRecentScan ? "Son tarama 7 gün içinde yapıldı" : "Son tarama 7 günden eski",
        });

        // PCI-DSS-7.1: Erişim Kontrolü
        const prodImages = images.filter((img) =>
          img.pods.some((p) => p.namespace.toLowerCase().match(/^prod/i))
        );
        const prodHighCritical = prodImages.filter(
          (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
        );
        results.push({
          requirementId: "PCI-DSS-7.1",
          status: prodHighCritical.length === 0 ? "PASS" : "FAIL",
          evidence: prodHighCritical.slice(0, 5).map((img) => img.imageName),
          notes: `${prodHighCritical.length} HIGH/CRITICAL riskli image prod'da çalışıyor`,
        });
        break;

      case "SOC2":
        // SOC2-CC6.1: Güvenlik Kontrolleri
        results.push({
          requirementId: "SOC2-CC6.1",
          status: stats.highOrCritical <= stats.totalImages * 0.2 ? "PASS" : "WARNING",
          evidence: [],
          notes: `${stats.highOrCritical} HIGH/CRITICAL image (${((stats.highOrCritical / stats.totalImages) * 100).toFixed(1)}%)`,
        });

        // SOC2-CC7.2: Sistem İzleme
        results.push({
          requirementId: "SOC2-CC7.2",
          status: stats.lastScanAt ? "PASS" : "FAIL",
          evidence: stats.lastScanAt ? [stats.lastScanAt.toISOString()] : [],
          notes: stats.lastScanAt ? "Sistem izleme aktif" : "Sistem izleme yapılmamış",
        });
        break;

      case "ISO27001":
        // ISO27001-A.9.4.2: Güvenli Sistem Kullanımı
        results.push({
          requirementId: "ISO27001-A.9.4.2",
          status: stats.highOrCritical === 0 ? "PASS" : stats.highOrCritical <= stats.totalImages * 0.15 ? "WARNING" : "FAIL",
          evidence: [],
          notes: `${stats.highOrCritical} HIGH/CRITICAL riskli image`,
        });

        // ISO27001-A.12.6.1: Güvenlik Açığı Yönetimi
        const hasRegularScans = stats.lastScanAt && 
          (Date.now() - stats.lastScanAt.getTime()) < 30 * 24 * 60 * 60 * 1000; // 30 gün içinde
        results.push({
          requirementId: "ISO27001-A.12.6.1",
          status: hasRegularScans ? "PASS" : "WARNING",
          evidence: stats.lastScanAt ? [stats.lastScanAt.toISOString()] : [],
          notes: hasRegularScans ? "Düzenli tarama yapılıyor" : "Tarama gecikmiş",
        });
        break;
    }

    return results;
  }

  /**
   * Standart versiyonunu döner
   */
  private getStandardVersion(standard: ComplianceStandard): string {
    switch (standard) {
      case "PCI-DSS":
        return "PCI-DSS v3.2.1";
      case "SOC2":
        return "SOC 2 Type II";
      case "ISO27001":
        return "ISO/IEC 27001:2022";
      default:
        return "Unknown";
    }
  }

  /**
   * Tüm assessment'ları listeler
   */
  async getAllAssessments(
    standard?: ComplianceStandard,
    clusterId?: string,
    projectId?: string
  ): Promise<ComplianceAssessmentDocument[]> {
    const query: any = {};
    if (standard) query.standard = standard;
    if (clusterId) query.clusterId = clusterId;
    if (projectId) query.projectId = projectId;

    return ComplianceAssessmentModel.find(query)
      .sort({ assessedAt: -1 })
      .exec();
  }

  /**
   * En son assessment'ı getirir
   */
  async getLatestAssessment(
    standard: ComplianceStandard,
    clusterId?: string,
    projectId?: string
  ): Promise<ComplianceAssessmentDocument | null> {
    const query: any = { standard };
    if (clusterId) query.clusterId = clusterId;
    if (projectId) query.projectId = projectId;

    return ComplianceAssessmentModel.findOne(query)
      .sort({ assessedAt: -1 })
      .exec();
  }
}
