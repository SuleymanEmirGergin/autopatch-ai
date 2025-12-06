import { Request, Response, NextFunction } from "express";
import { ScanService } from "../../services/scanService";
import { AuditService } from "../../services/auditService";

const auditService = new AuditService();
import { ScanRunRepository } from "../../persistence/scanRun.repository";

export class ScanController {
  constructor(
    private readonly scanService: ScanService,
    private readonly scanRunRepo: ScanRunRepository = new ScanRunRepository()
  ) {}

  triggerScan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await auditService.log({
        action: "SCAN_TRIGGERED",
        userIp: req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown",
      });

      const results = await this.scanService.runScan();
      
      await auditService.log({
        action: "SCAN_COMPLETED",
        details: { imagesScanned: results.length },
      });

      res.status(202).json({ imagesScanned: results.length, results });
    } catch (err) {
      await auditService.log({
        action: "SCAN_FAILED",
        details: { error: err instanceof Error ? err.message : String(err) },
      });
      next(err);
    }
  };

  getScanStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const latest = await this.scanRunRepo.getLatestScan();
      if (!latest) {
        return res.json({
          status: null,
          message: "Henüz scan yapılmamış",
        });
      }

      res.json({
        status: latest.status,
        startedAt: latest.startedAt,
        finishedAt: latest.finishedAt,
        errorMessage: latest.errorMessage,
      });
    } catch (err) {
      next(err);
    }
  };
}


