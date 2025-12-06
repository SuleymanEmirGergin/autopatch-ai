import { Request, Response, NextFunction } from "express";
import { RiskBudgetService } from "../../services/riskBudgetService";
import { NotificationService } from "../../services/notificationService";
import { config } from "../../config";

export class RiskBudgetController {
  private riskBudgetService: RiskBudgetService;

  constructor() {
    const notificationService =
      config.notifications.email.enabled ||
      config.notifications.webhook.enabled ||
      config.notifications.slack?.enabled ||
      config.notifications.teams?.enabled
        ? new NotificationService(config.notifications)
        : undefined;

    this.riskBudgetService = new RiskBudgetService(notificationService);
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clusterId = req.query.clusterId as string | undefined;
      const projectId = req.query.projectId as string | undefined;
      const budgets = await this.riskBudgetService.listBudgets(clusterId, projectId);
      res.json(budgets);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const budgets = await this.riskBudgetService.listBudgets();
      const budget = budgets.find((b) => b._id.toString() === id);
      if (!budget) {
        return res.status(404).json({ error: "Risk budget bulunamadı" });
      }
      res.json(budget);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const budget = await this.riskBudgetService.createBudget(req.body);
      res.status(201).json(budget);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const budget = await this.riskBudgetService.updateBudget(id, req.body);
      if (!budget) {
        return res.status(404).json({ error: "Risk budget bulunamadı" });
      }
      res.json(budget);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deleted = await this.riskBudgetService.deleteBudget(id);
      if (!deleted) {
        return res.status(404).json({ error: "Risk budget bulunamadı" });
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  check = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const status = await this.riskBudgetService.checkBudget(id);
      if (!status) {
        return res.status(404).json({ error: "Risk budget bulunamadı veya devre dışı" });
      }
      res.json(status);
    } catch (err) {
      next(err);
    }
  };

  checkAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statuses = await this.riskBudgetService.checkAllBudgets();
      res.json(statuses);
    } catch (err) {
      next(err);
    }
  };
}

