import { Request, Response, NextFunction } from "express";
import { AutoActionService } from "../../services/autoActionService";

export class AutoActionController {
  private service: AutoActionService;

  constructor() {
    this.service = new AutoActionService();
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clusterId, projectId } = req.query;
      const policies = await this.service.listPolicies(
        clusterId as string | undefined,
        projectId as string | undefined
      );
      res.json(policies);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const policy = await this.service.createPolicy(req.body);
      res.status(201).json(policy);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const policy = await this.service.updatePolicy(id, req.body);
      if (!policy) {
        return res.status(404).json({ error: "Policy bulunamadı" });
      }
      res.json(policy);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deleted = await this.service.deletePolicy(id);
      if (!deleted) {
        return res.status(404).json({ error: "Policy bulunamadı" });
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  execute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { maxActions, dryRunOverride } = req.body || {};
      const result = await this.service.executePolicy(id, { maxActions, dryRunOverride });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}


