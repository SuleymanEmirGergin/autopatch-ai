import { Request, Response, NextFunction } from "express";
import { AnomalyDetectionService } from "../../services/anomalyDetectionService";

export class AnomalyController {
  private anomalyService: AnomalyDetectionService;

  constructor() {
    this.anomalyService = new AnomalyDetectionService();
  }

  /**
   * Çözülmemiş anomalileri listeler
   */
  listUnresolved = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clusterId = req.query.clusterId as string | undefined;
      const limit = Number(req.query.limit) || 100;
      const anomalies = await this.anomalyService.getUnresolvedAnomalies(
        clusterId,
        limit
      );
      res.json(anomalies);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Belirli bir image için anomalileri listeler
   */
  getByImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;
      const clusterId = req.query.clusterId as string | undefined;
      const limit = Number(req.query.limit) || 50;
      const decoded = decodeURIComponent(imageName);
      const anomalies = await this.anomalyService.getAnomaliesForImage(
        decoded,
        clusterId,
        limit
      );
      res.json(anomalies);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Bir anomaliyi çözülmüş olarak işaretler
   */
  resolve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const anomaly = await this.anomalyService.resolveAnomaly(id);
      if (!anomaly) {
        return res.status(404).json({ error: "Anomali bulunamadı" });
      }
      res.json(anomaly);
    } catch (err) {
      next(err);
    }
  };
}

