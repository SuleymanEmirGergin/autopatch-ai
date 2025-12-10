import { Request, Response, NextFunction } from "express";
import { config } from "../../config";
import { MongoImageRiskRepository } from "../../persistence/imageRisk.repository";
import { ScanService } from "../../services/scanService";

export interface ClusterInfo {
  clusterId: string;
  projectId: string;
  name: string;
  enabled: boolean;
}

export class ClusterController {
  private readonly imageRepo = new MongoImageRiskRepository();
  private scanService?: ScanService;

  constructor(scanService?: ScanService) {
    this.scanService = scanService;
  }
  /**
   * Tüm cluster'ları listeler
   */
  listClusters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clusters: ClusterInfo[] = (config.clusters || []).filter((c) => c.enabled);
      res.json(clusters);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Belirli bir cluster için özet istatistikler döndürür
   */
  getClusterStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId } = req.params;
      const projectId = req.query.projectId as string | undefined;

      // Cluster'ı bul
      const cluster = (config.clusters || []).find(
        (c) => c.clusterId === clusterId && c.enabled
      );

      if (!cluster) {
        return res.status(404).json({ error: "Cluster bulunamadı" });
      }

      // Bu cluster için image'leri saymak için repository'ye ihtiyacımız var
      // Şimdilik basit bir response döndürelim, gerçek stats için ImageController kullanılabilir
      res.json({
        clusterId: cluster.clusterId,
        projectId: cluster.projectId,
        name: cluster.name,
        message: "Cluster stats için /stats endpoint'ini clusterId query parametresi ile kullanın",
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Cluster'daki pod'ları listeler
   */
  getClusterPods = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId } = req.params;
      const projectId = req.query.projectId as string | undefined;

      const cluster = (config.clusters || []).find(
        (c) => c.clusterId === clusterId && c.enabled
      );

      if (!cluster) {
        return res.status(404).json({ error: "Cluster bulunamadı" });
      }

      // Cluster'daki tüm image'leri al
      const images = await this.imageRepo.findAll(clusterId, projectId);
      
      // Tüm pod'ları topla
      const allPods: Array<{ namespace: string; name: string; imageName: string }> = [];
      images.forEach((image) => {
        image.pods.forEach((pod) => {
          allPods.push({
            namespace: pod.namespace,
            name: pod.name,
            imageName: image.imageName,
          });
        });
      });

      res.json({
        clusterId,
        projectId,
        totalPods: allPods.length,
        pods: allPods,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Cluster'daki image'leri listeler
   */
  getClusterImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId } = req.params;
      const projectId = req.query.projectId as string | undefined;

      const cluster = (config.clusters || []).find(
        (c) => c.clusterId === clusterId && c.enabled
      );

      if (!cluster) {
        return res.status(404).json({ error: "Cluster bulunamadı" });
      }

      const images = await this.imageRepo.findAll(clusterId, projectId);
      
      res.json({
        clusterId,
        projectId,
        totalImages: images.length,
        images: images.map((img) => ({
          imageName: img.imageName,
          riskScore: img.riskScore,
          riskLevel: img.riskLevel,
          podCount: img.pods.length,
          lastScannedAt: img.lastScannedAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Cluster için risk özeti döndürür
   */
  getClusterRiskSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId } = req.params;
      const projectId = req.query.projectId as string | undefined;

      const cluster = (config.clusters || []).find(
        (c) => c.clusterId === clusterId && c.enabled
      );

      if (!cluster) {
        return res.status(404).json({ error: "Cluster bulunamadı" });
      }

      const images = await this.imageRepo.findAll(clusterId, projectId);
      
      const totalImages = images.length;
      const totalPods = images.reduce((sum, img) => sum + img.pods.length, 0);
      const avgRiskScore = totalImages > 0
        ? images.reduce((sum, img) => sum + img.riskScore, 0) / totalImages
        : 0;

      const riskLevelCounts = {
        Critical: images.filter((img) => img.riskLevel === "Critical").length,
        High: images.filter((img) => img.riskLevel === "High").length,
        Medium: images.filter((img) => img.riskLevel === "Medium").length,
        Low: images.filter((img) => img.riskLevel === "Low").length,
      };

      const topRiskyImages = images
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 10)
        .map((img) => ({
          imageName: img.imageName,
          riskScore: img.riskScore,
          riskLevel: img.riskLevel,
          podCount: img.pods.length,
        }));

      res.json({
        clusterId,
        projectId,
        totalImages,
        totalPods,
        averageRiskScore: Math.round(avgRiskScore * 100) / 100,
        riskLevelCounts,
        topRiskyImages,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Cluster için tarama başlatır
   */
  scanCluster = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId } = req.params;
      const projectId = req.query.projectId as string | undefined;

      const cluster = (config.clusters || []).find(
        (c) => c.clusterId === clusterId && c.enabled
      );

      if (!cluster) {
        return res.status(404).json({ error: "Cluster bulunamadı" });
      }

      if (!this.scanService) {
        return res.status(503).json({ 
          error: "Scan service mevcut değil",
          message: "Tarama servisi yapılandırılmamış"
        });
      }

      // Taramayı arka planda başlat
      this.scanService.runScan(clusterId, projectId).catch((err) => {
        console.error(`Cluster tarama hatası (${clusterId}):`, err);
      });

      res.json({
        message: "Cluster taraması başlatıldı",
        clusterId,
        projectId,
        status: "initiated",
        note: "Tarama arka planda çalışacak. Sonuçları /clusters/:clusterId/stats endpoint'inden kontrol edebilirsiniz.",
      });
    } catch (err) {
      next(err);
    }
  };
}

