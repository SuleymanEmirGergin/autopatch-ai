import {
  WidgetModel,
  WidgetDocument,
  WidgetType,
  WidgetConfig,
} from "../persistence/widget.model";
import { ImageRiskRepository, MongoImageRiskRepository } from "../persistence/imageRisk.repository";

export interface Stats {
  totalImages: number;
  highOrCritical: number;
  prodImpactedPods: number;
  avgRiskScore: number;
  lastScanAt: Date | null;
}

export interface CreateWidgetPayload {
  name: string;
  type: WidgetType;
  config?: WidgetConfig;
  position?: { x: number; y: number; w: number; h: number };
  enabled?: boolean;
  order?: number;
}

export class WidgetService {
  private imageRiskRepo: ImageRiskRepository;

  constructor() {
    this.imageRiskRepo = new MongoImageRiskRepository();
  }

  /**
   * Tüm aktif widget'ları listeler
   */
  async getAllWidgets(userId?: string): Promise<WidgetDocument[]> {
    const query: any = { enabled: true };
    if (userId) {
      query.userId = userId;
    } else {
      // Global widgets (no userId)
      query.userId = { $exists: false };
    }
    return WidgetModel.find(query).sort({ order: 1 }).exec();
  }

  /**
   * Widget oluşturur
   */
  async createWidget(payload: CreateWidgetPayload, userId?: string): Promise<WidgetDocument> {
    const widget = await WidgetModel.create({
      ...payload,
      userId,
      config: payload.config || {},
      position: payload.position || { x: 0, y: 0, w: 4, h: 3 },
      enabled: payload.enabled !== undefined ? payload.enabled : true,
      order: payload.order || 0,
    });
    return widget;
  }

  /**
   * Widget günceller
   */
  async updateWidget(
    widgetId: string,
    updates: Partial<CreateWidgetPayload>,
    userId?: string
  ): Promise<WidgetDocument | null> {
    const query: any = { _id: widgetId };
    if (userId) {
      query.userId = userId;
    } else {
      query.userId = { $exists: false };
    }

    const widget = await WidgetModel.findOneAndUpdate(query, updates, {
      new: true,
    }).exec();
    return widget;
  }

  /**
   * Widget siler
   */
  async deleteWidget(widgetId: string, userId?: string): Promise<boolean> {
    const query: any = { _id: widgetId };
    if (userId) {
      query.userId = userId;
    } else {
      query.userId = { $exists: false };
    }

    const result = await WidgetModel.deleteOne(query).exec();
    return result.deletedCount > 0;
  }

  /**
   * Widget pozisyonlarını toplu günceller (drag & drop için)
   */
  async updateWidgetPositions(
    positions: Array<{ id: string; x: number; y: number; w: number; h: number; order: number }>,
    userId?: string
  ): Promise<void> {
    const bulkOps = positions.map((pos) => ({
      updateOne: {
        filter: { _id: pos.id, ...(userId ? { userId } : { userId: { $exists: false } }) },
        update: {
          $set: {
            "position.x": pos.x,
            "position.y": pos.y,
            "position.w": pos.w,
            "position.h": pos.h,
            order: pos.order,
          },
        },
      },
    }));

    await WidgetModel.bulkWrite(bulkOps);
  }

  /**
   * Widget için veri hazırlar (widget tipine göre)
   */
  async getWidgetData(widget: WidgetDocument): Promise<any> {
    switch (widget.type) {
      case "STATS_CARD":
        return this.getStatsCardData(widget);
      case "TOP_IMAGES_LIST":
        return this.getTopImagesListData(widget);
      case "RISK_CHART":
        return this.getRiskChartData(widget);
      case "TREND_CHART":
        return this.getTrendChartData(widget);
      case "ANOMALIES_LIST":
        return this.getAnomaliesListData(widget);
      case "RISK_BUDGET_STATUS":
        return this.getRiskBudgetStatusData(widget);
      default:
        return null;
    }
  }

  private async getStatsCardData(widget: WidgetDocument): Promise<any> {
    // TODO: getStats method'u repository'ye eklenecek
    const images = await this.imageRiskRepo.findAll(
      widget.config.clusterId,
      widget.config.projectId
    );
    const highOrCritical = images.filter(
      (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
    ).length;
    const prodPods = images.reduce((sum, img) => {
      return (
        sum +
        img.pods.filter((p) => {
          const ns = p.namespace.toLowerCase();
          return ns === "prod" || ns.startsWith("prod-");
        }).length
      );
    }, 0);
    return {
      totalImages: images.length,
      highOrCritical,
      prodImpactedPods: prodPods,
      lastScanAt: images.length > 0 ? images[0].lastScannedAt : null,
    };
  }

  private async getTopImagesListData(widget: WidgetDocument): Promise<any> {
    const limit = widget.config.limit || 5;
    const images = await this.imageRiskRepo.findTop(
      limit,
      false,
      widget.config.clusterId,
      widget.config.projectId
    );
    return images.map((img) => ({
      imageName: img.imageName,
      riskScore: img.riskScore,
      riskLevel: img.riskLevel,
      pods: img.pods.length,
    }));
  }

  private async getRiskChartData(widget: WidgetDocument): Promise<any> {
    const images = await this.imageRiskRepo.findAll(
      widget.config.clusterId,
      widget.config.projectId
    );
    const riskDistribution = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    images.forEach((img) => {
      riskDistribution[img.riskLevel] = (riskDistribution[img.riskLevel] || 0) + 1;
    });
    return riskDistribution;
  }

  private async getTrendChartData(widget: WidgetDocument): Promise<any> {
    // TODO: getTrends method'u repository'ye eklenecek
    const limit = widget.config.limit || 20;
    // Şimdilik boş array döndür
    const trends: Array<{ finishedAt: Date; avgRiskScore: number; highOrCritical: number }> = [];
    return trends.map((t: { finishedAt: Date; avgRiskScore: number; highOrCritical: number }) => ({
      date: t.finishedAt.toISOString(),
      avgRiskScore: t.avgRiskScore,
      highOrCritical: t.highOrCritical,
    }));
  }

  private async getAnomaliesListData(widget: WidgetDocument): Promise<any> {
    // Bu endpoint için AnomalyDetectionService'e ihtiyaç var
    // Şimdilik boş döndürüyoruz
    return [];
  }

  private async getRiskBudgetStatusData(widget: WidgetDocument): Promise<any> {
    // Bu endpoint için RiskBudgetService'e ihtiyaç var
    // Şimdilik boş döndürüyoruz
    return [];
  }
}

