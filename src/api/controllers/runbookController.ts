import { Request, Response, NextFunction } from "express";
import { RunbookService } from "../../services/runbookService";

export class RunbookController {
  private runbookService: RunbookService;

  constructor() {
    // Environment'tan custom runbook URL'leri oku (opsiyonel)
    // Örnek: RUNBOOK_MAPPINGS='{"Uses latest tag":"https://your-docs.com/latest"}'
    const customMappings = process.env.RUNBOOK_MAPPINGS
      ? JSON.parse(process.env.RUNBOOK_MAPPINGS)
      : undefined;

    this.runbookService = new RunbookService(customMappings);
  }

  /**
   * Belirli bir risk faktörü için runbook URL'ini döndürür
   */
  getRunbookUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { riskFactor } = req.params;
      const url = this.runbookService.getRunbookUrl(riskFactor);

      if (!url) {
        return res.status(404).json({
          error: "Runbook URL bulunamadı",
          riskFactor,
        });
      }

      res.json({ riskFactor, url });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Tüm runbook mapping'lerini döndürür
   */
  getAllMappings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mappings = this.runbookService.getAllMappings();
      res.json(mappings);
    } catch (err) {
      next(err);
    }
  };
}

