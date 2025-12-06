import { ReportHistoryModel, ReportHistoryDocument, ReportType } from "../persistence/reportHistory.model";

export interface CreateReportHistoryPayload {
  reportType: ReportType;
  templateId?: string;
  templateName?: string;
  filters?: {
    riskLevel?: string;
    namespace?: string;
    clusterId?: string;
    projectId?: string;
    standard?: string;
  };
  fileName: string;
  fileSize?: number;
  filePath?: string;
  format?: "PDF" | "XLSX" | "CSV" | "JSON";
  stats?: {
    totalImages?: number;
    highOrCritical?: number;
    prodImpactedPods?: number;
    avgRiskScore?: number;
  };
  createdBy?: string;
}

export class ReportHistoryService {
  /**
   * Yeni rapor geçmişi kaydı oluşturur
   */
  async createHistory(payload: CreateReportHistoryPayload): Promise<ReportHistoryDocument> {
    return ReportHistoryModel.create(payload);
  }

  /**
   * Tüm rapor geçmişini listeler (sayfalama ile)
   */
  async getAllHistory(
    page: number = 1,
    limit: number = 50,
    filters?: {
      reportType?: ReportType;
      templateId?: string;
      clusterId?: string;
      projectId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ reports: ReportHistoryDocument[]; total: number; page: number; totalPages: number }> {
    const query: any = {};

    if (filters?.reportType) {
      query.reportType = filters.reportType;
    }
    if (filters?.templateId) {
      query.templateId = filters.templateId;
    }
    if (filters?.clusterId) {
      query["filters.clusterId"] = filters.clusterId;
    }
    if (filters?.projectId) {
      query["filters.projectId"] = filters.projectId;
    }
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      ReportHistoryModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ReportHistoryModel.countDocuments(query).exec(),
    ]);

    return {
      reports,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Belirli bir rapor geçmişini getirir
   */
  async getHistoryById(id: string): Promise<ReportHistoryDocument | null> {
    return ReportHistoryModel.findById(id).exec();
  }

  /**
   * Rapor geçmişini siler
   */
  async deleteHistory(id: string): Promise<boolean> {
    const result = await ReportHistoryModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * İstatistikleri getirir
   */
  async getStatistics(): Promise<{
    totalReports: number;
    reportsByType: Record<ReportType, number>;
    reportsByTemplate: Array<{ templateId: string; templateName?: string; count: number }>;
    recentReports: ReportHistoryDocument[];
  }> {
    const [totalReports, reportsByType, reportsByTemplate, recentReports] = await Promise.all([
      ReportHistoryModel.countDocuments().exec(),
      ReportHistoryModel.aggregate([
        {
          $group: {
            _id: "$reportType",
            count: { $sum: 1 },
          },
        },
      ]).exec(),
      ReportHistoryModel.aggregate([
        {
          $match: { templateId: { $exists: true, $ne: null } },
        },
        {
          $group: {
            _id: { templateId: "$templateId", templateName: "$templateName" },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 10,
        },
      ]).exec(),
      ReportHistoryModel.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .exec(),
    ]);

    const reportsByTypeMap: Record<string, number> = {};
    reportsByType.forEach((item: any) => {
      reportsByTypeMap[item._id] = item.count;
    });

    return {
      totalReports,
      reportsByType: reportsByTypeMap as Record<ReportType, number>,
      reportsByTemplate: reportsByTemplate.map((item: any) => ({
        templateId: item._id.templateId,
        templateName: item._id.templateName,
        count: item.count,
      })),
      recentReports,
    };
  }
}

