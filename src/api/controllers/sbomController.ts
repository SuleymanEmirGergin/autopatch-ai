import { Request, Response, NextFunction } from "express";
import { SBOMService } from "../../services/sbomService";

export class SBOMController {
  private sbomService: SBOMService;

  constructor() {
    this.sbomService = new SBOMService();
  }

  /**
   * Belirli bir image için SBOM'u döndürür
   */
  getSBOM = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;
      const clusterId = req.query.clusterId as string | undefined;
      const decoded = decodeURIComponent(imageName);
      
      const sbom = await this.sbomService.getOrCreateSBOM(decoded, clusterId);
      res.json(sbom);
    } catch (err) {
      next(err);
    }
  };

  /**
   * SBOM'u zorla yeniden tarar
   */
  rescanSBOM = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;
      const clusterId = req.query.clusterId as string | undefined;
      const decoded = decodeURIComponent(imageName);
      
      const sbom = await this.sbomService.rescanSBOM(decoded, clusterId);
      res.json(sbom);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Tüm CVE'leri listeler
   */
  getAllCVEs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clusterId = req.query.clusterId as string | undefined;
      const cves = await this.sbomService.getAllCVEs(clusterId);
      res.json(cves);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Belirli bir package'ı kullanan image'leri bulur
   */
  findByPackage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { packageName } = req.params;
      const clusterId = req.query.clusterId as string | undefined;
      const sboms = await this.sbomService.findByPackage(packageName, clusterId);
      res.json(sboms);
    } catch (err) {
      next(err);
    }
  };
}

