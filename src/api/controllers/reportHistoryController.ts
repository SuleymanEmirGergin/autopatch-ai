import { Request, Response, NextFunction } from "express";
import { ReportHistoryService, CreateReportHistoryPayload } from "../../services/reportHistoryService";
import { ReportType } from "../../persistence/reportHistory.model";

export class ReportHistoryController {
  private reportHistoryService: ReportHistoryService;

  constructor(reportHistoryService?: ReportHistoryService) {
    this.reportHistoryService = reportHistoryService || new ReportHistoryService();
  }

  /**
   * Tüm rapor geçmişini listeler
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const filters: any = {};
      if (req.query.reportType) {
        filters.reportType = req.query.reportType as ReportType;
      }
      if (req.query.templateId) {
        filters.templateId = req.query.templateId as string;
      }
      if (req.query.clusterId) {
        filters.clusterId = req.query.clusterId as string;
      }
      if (req.query.projectId) {
        filters.projectId = req.query.projectId as string;
      }
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const result = await this.reportHistoryService.getAllHistory(page, limit, filters);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Belirli bir rapor geçmişini getirir
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const history = await this.reportHistoryService.getHistoryById(id);
      if (!history) {
        return res.status(404).json({ error: "Rapor geçmişi bulunamadı" });
      }
      res.json(history);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Yeni rapor geçmişi kaydı oluşturur
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload: CreateReportHistoryPayload = req.body;
      
      if (!payload.reportType || !payload.fileName) {
        return res.status(400).json({ error: "reportType ve fileName alanları gereklidir" });
      }

      const history = await this.reportHistoryService.createHistory(payload);
      res.status(201).json(history);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Rapor geçmişini siler
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deleted = await this.reportHistoryService.deleteHistory(id);
      if (!deleted) {
        return res.status(404).json({ error: "Rapor geçmişi bulunamadı" });
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * İstatistikleri getirir
   */
  getStatistics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.reportHistoryService.getStatistics();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  };
}

