/**
 * Computer Vision Controller
 * Container image'lerin görsel analizi endpoint'leri
 */

import { Request, Response, NextFunction } from "express";
import { ComputerVisionService } from "../../services/computerVisionService";

export class ComputerVisionController {
  private cvService: ComputerVisionService;

  constructor() {
    this.cvService = new ComputerVisionService();
  }

  /**
   * Image layer analizi (Computer Vision)
   * GET /cv/analyze/:imageName
   */
  analyzeImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;
      const { manifest } = req.query;

      if (!imageName) {
        return res.status(400).json({
          success: false,
          error: "imageName gereklidir",
        });
      }

      const analysis = await this.cvService.analyzeImageLayers(
        imageName,
        manifest ? JSON.parse(manifest as string) : undefined
      );

      res.json({
        success: true,
        data: analysis,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Visual features çıkarır
   * GET /cv/features/:imageName
   */
  extractFeatures = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;

      if (!imageName) {
        return res.status(400).json({
          success: false,
          error: "imageName gereklidir",
        });
      }

      const features = await this.cvService.extractVisualFeatures(imageName);

      res.json({
        success: true,
        data: features,
      });
    } catch (err) {
      next(err);
    }
  };
}

