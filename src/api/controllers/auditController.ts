import { Request, Response, NextFunction } from "express";
import { AuditService } from "../../services/auditService";
import { AuditAction } from "../../persistence/auditLog.model";

export class AuditController {
  constructor(
    private readonly auditService: AuditService = new AuditService()
  ) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const action = req.query.action as AuditAction | undefined;
      const resourceType = req.query.resourceType as string | undefined;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      const result = await this.auditService.getAllLogs(page, limit, {
        action,
        resourceType,
        startDate,
        endDate,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getByAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { action } = req.params;
      const limit = Number(req.query.limit) || 100;

      const logs = await this.auditService.getLogsByAction(
        action as AuditAction,
        limit
      );

      res.json(logs);
    } catch (err) {
      next(err);
    }
  };

  getByResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resourceType, resourceId } = req.params;
      const limit = Number(req.query.limit) || 100;

      const logs = await this.auditService.getLogsByResource(
        resourceType,
        resourceId,
        limit
      );

      res.json(logs);
    } catch (err) {
      next(err);
    }
  };
}

