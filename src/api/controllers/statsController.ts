import { Request, Response, NextFunction } from "express";
import { ScanRunModel } from "../../persistence/scanRun.model";

export class StatsController {
  /**
   * Son N başarılı scan için trend verisi döner.
   * Varsayılan N = 20
   */
  getTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Number(req.query.limit) || 20;

      const scans = await ScanRunModel.find({ status: "COMPLETED" })
        .sort({ finishedAt: -1 })
        .limit(limit)
        .lean()
        .exec();

      const trend = scans
        .map((scan) => {
          const images = scan.images || [];
          if (!images.length) {
            return null;
          }

          const avgRiskScore =
            images.reduce((sum, img) => sum + (img.riskScore || 0), 0) /
            images.length;

          const highOrCritical = images.filter(
            (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
          ).length;

          return {
            startedAt: scan.startedAt,
            finishedAt: scan.finishedAt,
            avgRiskScore,
            highOrCritical,
            // Gelecekte prod pod etkisi / compliance skorları eklenebilir
          };
        })
        .filter(Boolean);

      // Zaman sırasına göre eski → yeni
      trend.reverse();

      res.json(trend);
    } catch (err) {
      next(err);
    }
  };
}


