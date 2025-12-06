import { Request, Response, NextFunction } from "express";
import { config } from "../../config";

export interface ClusterInfo {
  clusterId: string;
  projectId: string;
  name: string;
  enabled: boolean;
}

export class ClusterController {
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
}

