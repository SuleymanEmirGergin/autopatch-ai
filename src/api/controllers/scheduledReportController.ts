import { Request, Response, NextFunction } from "express";
import {
  ScheduledReportModel,
  ScheduledReportDocument,
  ScheduleFrequency,
} from "../../persistence/scheduledReport.model";
import { ReportType } from "../../services/pdfService";
import { ComplianceStandard } from "../../persistence/compliance.model";

export interface CreateScheduledReportPayload {
  name: string;
  description?: string;
  reportType: ReportType;
  complianceStandard?: ComplianceStandard;
  filters?: {
    riskLevel?: string;
    namespace?: string;
    clusterId?: string;
    projectId?: string;
  };
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone?: string;
  recipients: string[];
  enabled?: boolean;
}

export class ScheduledReportController {
  /**
   * Tüm scheduled report'ları listeler
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reports = await ScheduledReportModel.find().sort({ createdAt: -1 }).exec();
      res.json(reports);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Belirli bir scheduled report'u getirir
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const report = await ScheduledReportModel.findById(id).exec();
      if (!report) {
        return res.status(404).json({ error: "Scheduled report bulunamadı" });
      }
      res.json(report);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Yeni scheduled report oluşturur
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload: CreateScheduledReportPayload = req.body;

      // Validation
      if (!payload.name || !payload.reportType || !payload.frequency || !payload.time || !payload.recipients?.length) {
        return res.status(400).json({
          error: "name, reportType, frequency, time ve recipients alanları gereklidir",
        });
      }

      // Time format validation (HH:MM)
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(payload.time)) {
        return res.status(400).json({ error: "time formatı HH:MM olmalıdır (örn: 09:00)" });
      }

      const report = await ScheduledReportModel.create({
        ...payload,
        enabled: payload.enabled !== undefined ? payload.enabled : true,
      });

      // ScheduledReportService'e bildir (yeniden zamanlama için)
      // Bu kısım server.ts'de yapılacak

      res.status(201).json(report);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Scheduled report'u günceller
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates: Partial<CreateScheduledReportPayload> = req.body;

      const report = await ScheduledReportModel.findByIdAndUpdate(id, updates, {
        new: true,
      }).exec();

      if (!report) {
        return res.status(404).json({ error: "Scheduled report bulunamadı" });
      }

      // ScheduledReportService'e bildir (yeniden zamanlama için)
      const scheduledReportService = (req.app as any).scheduledReportService as any;
      if (scheduledReportService && typeof scheduledReportService.scheduleReport === "function") {
        scheduledReportService.scheduleReport(report).catch((err: any) => {
          console.error(`[ScheduledReports] Report güncellenemedi: ${report.name}`, err);
        });
      }

      res.json(report);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Scheduled report'u siler
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const report = await ScheduledReportModel.findByIdAndDelete(id).exec();

      if (!report) {
        return res.status(404).json({ error: "Scheduled report bulunamadı" });
      }

      // ScheduledReportService'e bildir (cron job'ı durdur)
      const scheduledReportService = (req.app as any).scheduledReportService as any;
      if (scheduledReportService && typeof scheduledReportService.stopReport === "function") {
        scheduledReportService.stopReport(report._id.toString()).catch((err: any) => {
          console.error(`[ScheduledReports] Report durdurulamadı: ${report.name}`, err);
        });
      }

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * Scheduled report'u manuel olarak çalıştırır
   */
  runNow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const report = await ScheduledReportModel.findById(id).exec();

      if (!report) {
        return res.status(404).json({ error: "Scheduled report bulunamadı" });
      }

      // ScheduledReportService'e bildir (manuel çalıştırma için)
      // Bu kısım server.ts'de yapılacak
      // Şimdilik basit bir response döndürüyoruz

      res.json({
        message: "Rapor çalıştırma işlemi başlatıldı",
        reportId: report._id.toString(),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Scheduled report'u aktif/pasif yapar
   */
  toggleEnabled = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const report = await ScheduledReportModel.findById(id).exec();

      if (!report) {
        return res.status(404).json({ error: "Scheduled report bulunamadı" });
      }

      report.enabled = !report.enabled;
      await report.save();

      // ScheduledReportService'e bildir
      const scheduledReportService = (req.app as any).scheduledReportService as any;
      if (scheduledReportService) {
        if (report.enabled && typeof scheduledReportService.scheduleReport === "function") {
          scheduledReportService.scheduleReport(report).catch((err: any) => {
            console.error(`[ScheduledReports] Report aktif edilemedi: ${report.name}`, err);
          });
        } else if (!report.enabled && typeof scheduledReportService.stopReport === "function") {
          scheduledReportService.stopReport(report._id.toString()).catch((err: any) => {
            console.error(`[ScheduledReports] Report durdurulamadı: ${report.name}`, err);
          });
        }
      }

      res.json(report);
    } catch (err) {
      next(err);
    }
  };
}

