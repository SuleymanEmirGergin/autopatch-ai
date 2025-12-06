import { Request, Response, NextFunction } from "express";
import { CustomRiskRuleRepository } from "../../persistence/customRiskRule.repository";
import { AuditService } from "../../services/auditService";

const auditService = new AuditService();

export class CustomRuleController {
  constructor(
    private readonly ruleRepo: CustomRiskRuleRepository = new CustomRiskRuleRepository()
  ) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeDisabled = req.query.includeDisabled === "true";
      const rules = includeDisabled
        ? await this.ruleRepo.findAllIncludingDisabled()
        : await this.ruleRepo.findAll();
      res.json(rules);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const rule = await this.ruleRepo.findById(id);
      if (!rule) {
        return res.status(404).json({ message: "Rule not found" });
      }
      res.json(rule);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        description,
        enabled,
        condition,
        riskScore,
        riskFactor,
        priority,
      } = req.body;

      if (!name || !condition || riskScore === undefined || !riskFactor) {
        return res.status(400).json({
          message: "name, condition, riskScore, and riskFactor are required",
        });
      }

      const rule = await this.ruleRepo.create({
        name,
        description,
        enabled: enabled !== undefined ? enabled : true,
        condition,
        riskScore,
        riskFactor,
        priority: priority || 100,
      } as any);

      await auditService.log({
        action: "CUSTOM_RULE_CREATED",
        resourceType: "customRule",
        resourceId: rule._id.toString(),
        details: { name, riskScore, riskFactor },
      });

      res.status(201).json(rule);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const rule = await this.ruleRepo.update(id, updates);
      if (!rule) {
        return res.status(404).json({ message: "Rule not found" });
      }

      await auditService.log({
        action: "CUSTOM_RULE_UPDATED",
        resourceType: "customRule",
        resourceId: id,
        details: updates,
      });

      res.json(rule);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.ruleRepo.delete(id);

      await auditService.log({
        action: "CUSTOM_RULE_DELETED",
        resourceType: "customRule",
        resourceId: id,
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  toggleEnabled = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const rule = await this.ruleRepo.toggleEnabled(id);
      if (!rule) {
        return res.status(404).json({ message: "Rule not found" });
      }

      await auditService.log({
        action: "CUSTOM_RULE_TOGGLED",
        resourceType: "customRule",
        resourceId: id,
        details: { enabled: rule.enabled },
      });

      res.json(rule);
    } catch (err) {
      next(err);
    }
  };
}

