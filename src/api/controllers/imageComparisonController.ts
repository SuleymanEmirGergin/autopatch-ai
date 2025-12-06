import { Request, Response, NextFunction } from "express";
import { ImageComparisonService } from "../../services/imageComparisonService";

export class ImageComparisonController {
  private comparisonService: ImageComparisonService;

  constructor() {
    this.comparisonService = new ImageComparisonService();
  }

  /**
   * İki image'ı karşılaştırır
   */
  compare = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { image1, image2, clusterId1, clusterId2 } = req.query;

      if (!image1 || !image2) {
        return res.status(400).json({
          error: "image1 ve image2 parametreleri gereklidir",
        });
      }

      const result = await this.comparisonService.compareImages(
        image1 as string,
        image2 as string,
        clusterId1 as string | undefined,
        clusterId2 as string | undefined
      );

      res.json(result);
    } catch (err: any) {
      if (err.message.includes("bulunamadı")) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  };

  /**
   * Bir image'ın zaman içindeki değişimlerini analiz eder
   */
  analyzeHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;
      const { clusterId, limit } = req.query;

      const result = await this.comparisonService.analyzeImageHistory(
        imageName,
        clusterId as string | undefined,
        limit ? Number(limit) : 10
      );

      res.json(result);
    } catch (err: any) {
      if (err.message.includes("bulunamadı")) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  };
}

