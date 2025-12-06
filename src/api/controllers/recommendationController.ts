import { Request, Response, NextFunction } from "express";
import { RecommendationService } from "../../services/recommendationService";
import { ImageUpdateRecommendationService } from "../../services/imageUpdateRecommendationService";
import { PatchRecommendationService } from "../../services/patchRecommendationService";
import { ScanService } from "../../services/scanService";
import { SBOMModel } from "../../persistence/sbom.model";

export class RecommendationController {
  private recommendationService: RecommendationService;
  private imageUpdateService: ImageUpdateRecommendationService;
  private patchService: PatchRecommendationService;
  private scanService: ScanService;

  constructor(scanService: ScanService) {
    this.recommendationService = new RecommendationService();
    this.imageUpdateService = new ImageUpdateRecommendationService();
    this.patchService = new PatchRecommendationService();
    this.scanService = scanService;
  }

  /**
   * Belirli bir image için öneriler getirir
   */
  getImageRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;
      const { clusterId, projectId } = req.query;

      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      const image = images.find((img) => img.imageName === imageName);
      if (!image) {
        return res.status(404).json({ error: "Image bulunamadı" });
      }

      const recommendations = this.recommendationService.generateRecommendations(image);
      res.json({
        image: {
          imageName: image.imageName,
          riskScore: image.riskScore,
          riskLevel: image.riskLevel,
          riskFactors: image.riskFactors,
        },
        recommendations,
        totalRecommendations: recommendations.length,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Tüm image'ler için toplu öneriler getirir
   */
  getBulkRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, riskLevel, limit } = req.query;

      let images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Risk seviyesine göre filtrele
      if (riskLevel && riskLevel !== "ALL") {
        images = images.filter((img) => img.riskLevel === riskLevel);
      }

      // Limit uygula
      const limitNum = limit ? parseInt(limit as string) : undefined;
      if (limitNum) {
        images = images.slice(0, limitNum);
      }

      // Risk skoruna göre sırala (en yüksekten en düşüğe)
      images.sort((a, b) => b.riskScore - a.riskScore);

      const result = this.recommendationService.generateBulkRecommendations(images);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Öncelikli önerileri getirir (en kritik olanlar)
   */
  getPriorityRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, minPriority } = req.query;

      let images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Sadece kritik ve yüksek riskli image'leri al
      images = images.filter(
        (img) => img.riskLevel === "CRITICAL" || img.riskLevel === "HIGH"
      );

      const result = this.recommendationService.generateBulkRecommendations(images);
      const minPriorityNum = minPriority ? parseInt(minPriority as string) : 7;

      // Önceliğe göre filtrele
      const filteredRecommendations = result.recommendations.filter(
        (rec) => rec.priority >= minPriorityNum
      );

      res.json({
        ...result,
        recommendations: filteredRecommendations,
        filteredCount: filteredRecommendations.length,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Belirli bir image için patch önerilerini getirir
   */
  getImagePatchRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;
      const { clusterId, projectId } = req.query;

      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      const image = images.find((img) => img.imageName === imageName);
      if (!image) {
        return res.status(404).json({ error: "Image bulunamadı" });
      }

      // SBOM verilerini al
      let sbomData;
      try {
        sbomData = await SBOMModel.findOne({ imageName }).sort({ scannedAt: -1 }).exec();
      } catch (err) {
        console.warn("SBOM verisi alınamadı:", err);
      }

      const patches = this.patchService.generatePatchRecommendations(image, sbomData || undefined, images);

      const criticalPatches = patches.filter((p) => p.severity === "CRITICAL").length;
      const highPatches = patches.filter((p) => p.severity === "HIGH").length;

      res.json({
        image: {
          imageName: image.imageName,
          riskScore: image.riskScore,
          riskLevel: image.riskLevel,
        },
        patches,
        totalPatches: patches.length,
        criticalPatches,
        highPatches,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Tüm image'ler için toplu patch önerilerini getirir
   */
  getBulkPatchRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId, minPriority, severity, limit } = req.query;

      let images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      // Limit uygula
      const limitNum = limit ? parseInt(limit as string) : undefined;
      if (limitNum) {
        images = images.slice(0, limitNum);
      }

      // SBOM verilerini toplu al
      const sbomDataMap = new Map();
      try {
        const sbomDocs = await SBOMModel.find({
          imageName: { $in: images.map((img) => img.imageName) },
        }).exec();
        sbomDocs.forEach((sbom) => {
          // En yeni SBOM'u sakla
          if (!sbomDataMap.has(sbom.imageName) || sbom.scannedAt > sbomDataMap.get(sbom.imageName).scannedAt) {
            sbomDataMap.set(sbom.imageName, sbom);
          }
        });
      } catch (err) {
        console.warn("SBOM verileri alınamadı:", err);
      }

      const result = this.patchService.generateBulkPatchRecommendations(images, sbomDataMap);

      // Filtreleme
      let filteredPatches = result.patches;
      if (minPriority) {
        const minPriorityNum = parseInt(minPriority as string);
        filteredPatches = filteredPatches.filter((p) => p.priority >= minPriorityNum);
      }
      if (severity && severity !== "ALL") {
        filteredPatches = filteredPatches.filter((p) => p.severity === severity);
      }

      res.json({
        patches: filteredPatches,
        summary: {
          ...result.summary,
          filteredPatches: filteredPatches.length,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

