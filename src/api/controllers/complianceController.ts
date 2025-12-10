import { Request, Response, NextFunction } from "express";
import { ComplianceService } from "../../services/complianceService";
import { ComplianceStandard } from "../../persistence/compliance.model";

export class ComplianceController {
  private complianceService: ComplianceService;

  constructor() {
    this.complianceService = new ComplianceService();
  }

  /**
   * Compliance değerlendirmesi yapar
   */
  assess = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { standard } = req.params;
      const { clusterId, projectId } = req.query;

      if (!standard || !["PCI-DSS", "SOC2", "ISO27001"].includes(standard)) {
        return res.status(400).json({
          error: "Geçerli bir standart belirtilmelidir (PCI-DSS, SOC2, ISO27001)",
        });
      }

      const assessment = await this.complianceService.assessCompliance(
        standard as ComplianceStandard,
        clusterId as string | undefined,
        projectId as string | undefined
      );

      res.json(assessment);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Tüm assessment'ları listeler
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { standard, clusterId, projectId } = req.query;
      const assessments = await this.complianceService.getAllAssessments(
        standard as ComplianceStandard | undefined,
        clusterId as string | undefined,
        projectId as string | undefined
      );
      res.json(assessments);
    } catch (err) {
      next(err);
    }
  };

  /**
   * En son assessment'ı getirir
   */
  getLatest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { standard } = req.params;
      const { clusterId, projectId } = req.query;

      if (!standard || !["PCI-DSS", "SOC2", "ISO27001"].includes(standard)) {
        return res.status(400).json({
          error: "Geçerli bir standart belirtilmelidir",
        });
      }

      const assessment = await this.complianceService.getLatestAssessment(
        standard as ComplianceStandard,
        clusterId as string | undefined,
        projectId as string | undefined
      );

      if (!assessment) {
        return res.status(404).json({ error: "Assessment bulunamadı" });
      }

      res.json(assessment);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Desteklenen compliance framework'lerini listeler
   */
  getFrameworks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const frameworks = [
        {
          id: "PCI-DSS",
          name: "Payment Card Industry Data Security Standard",
          version: "PCI-DSS v3.2.1",
          description: "Kredi kartı verilerinin güvenli işlenmesi için standart",
          requirements: 12,
        },
        {
          id: "SOC2",
          name: "System and Organization Controls 2",
          version: "SOC 2 Type II",
          description: "Hizmet organizasyonlarının güvenlik kontrolleri",
          requirements: 5,
        },
        {
          id: "ISO27001",
          name: "ISO/IEC 27001",
          version: "ISO/IEC 27001:2022",
          description: "Bilgi güvenliği yönetim sistemi standardı",
          requirements: 93,
        },
      ];

      res.json(frameworks);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Tüm assessment'ları listeler (route için)
   */
  listAssessments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { standard, clusterId, projectId } = req.query;
      const assessments = await this.complianceService.getAllAssessments(
        standard as ComplianceStandard | undefined,
        clusterId as string | undefined,
        projectId as string | undefined
      );
      res.json(assessments);
    } catch (err) {
      next(err);
    }
  };
}
