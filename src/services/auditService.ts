import { AuditLogModel, AuditLogDocument, AuditAction } from "../persistence/auditLog.model";

export interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  userIp?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
}

export class AuditService {
  /**
   * Audit log kaydı oluşturur
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await AuditLogModel.create({
        ...entry,
        timestamp: new Date(),
      });
    } catch (error) {
      // Audit log hatası uygulamayı durdurmamalı
      console.error("[AuditService] Log kaydedilemedi:", error);
    }
  }

  /**
   * Belirli bir action için logları getirir
   */
  async getLogsByAction(
    action: AuditAction,
    limit = 100
  ): Promise<AuditLogDocument[]> {
    return AuditLogModel.find({ action })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Belirli bir resource için logları getirir
   */
  async getLogsByResource(
    resourceType: string,
    resourceId: string,
    limit = 100
  ): Promise<AuditLogDocument[]> {
    return AuditLogModel.find({ resourceType, resourceId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Tüm logları getirir (sayfalama ile)
   */
  async getAllLogs(
    page = 1,
    limit = 50,
    filters?: {
      action?: AuditAction;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ logs: AuditLogDocument[]; total: number; page: number; totalPages: number }> {
    const query: any = {};

    if (filters?.action) {
      query.action = filters.action;
    }
    if (filters?.resourceType) {
      query.resourceType = filters.resourceType;
    }
    if (filters?.startDate || filters?.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      AuditLogModel.countDocuments(query).exec(),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Belirli bir tarih aralığındaki logları getirir
   */
  async getLogsByDateRange(
    startDate: Date,
    endDate: Date,
    limit = 1000
  ): Promise<AuditLogDocument[]> {
    return AuditLogModel.find({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
}

