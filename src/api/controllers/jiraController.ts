import { Request, Response, NextFunction } from "express";
import { JiraService, CreateJiraTicketRequest } from "../../services/jiraService";
import { config } from "../../config";

export class JiraController {
  private jiraService: JiraService;

  constructor() {
    this.jiraService = new JiraService(config.jira || { enabled: false });
  }

  createTicket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request: CreateJiraTicketRequest = req.body;

      // Validasyon
      if (!request.imageName || !request.riskScore || !request.riskLevel) {
        return res.status(400).json({
          success: false,
          error: "imageName, riskScore ve riskLevel gereklidir",
        });
      }

      const result = await this.jiraService.createTicket(request);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

