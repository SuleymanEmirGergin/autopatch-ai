import { Request, Response, NextFunction } from "express";
import { RiskAllowlistRepository } from "../../persistence/riskAllowlist.repository";
import { AuditService } from "../../services/auditService";

const auditService = new AuditService();

const repo = new RiskAllowlistRepository();

export class AllowlistController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await repo.listAll();
      res.json(items);
    } catch (err) {
      next(err);
    }
  };

  upsert = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName, ignoredRiskFactors, note } = req.body;
      if (!imageName || !Array.isArray(ignoredRiskFactors)) {
        return res
          .status(400)
          .json({ message: "imageName ve ignoredRiskFactors zorunludur" });
      }
      const doc = await repo.upsert(imageName, ignoredRiskFactors, note);

      await auditService.log({
        action: doc._id ? "ALLOWLIST_UPDATED" : "ALLOWLIST_CREATED",
        resourceType: "allowlist",
        resourceId: imageName,
        details: { ignoredRiskFactors, note },
      });

      res.status(200).json(doc);
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;
      await repo.remove(imageName);

      await auditService.log({
        action: "ALLOWLIST_DELETED",
        resourceType: "allowlist",
        resourceId: imageName,
      });

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}


