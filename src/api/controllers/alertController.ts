import { Request, Response, NextFunction } from "express";
import { AlertRuleModel } from "../../persistence/alertRule.model";

export class AlertController {
  listRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rules = await AlertRuleModel.find().exec();
      res.json(rules);
    } catch (err) {
      next(err);
    }
  };

  createRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await AlertRuleModel.create(req.body);
      res.status(201).json(rule);
    } catch (err) {
      next(err);
    }
  };

  updateRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const rule = await AlertRuleModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });
      if (!rule) {
        return res.status(404).json({ message: "Alert rule not found" });
      }
      res.json(rule);
    } catch (err) {
      next(err);
    }
  };

  deleteRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await AlertRuleModel.findByIdAndDelete(id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}

