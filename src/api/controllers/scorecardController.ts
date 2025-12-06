import { Request, Response, NextFunction } from "express";
import { SecurityScorecardService } from "../../services/securityScorecardService";
import { MongoImageRiskRepository } from "../../persistence/imageRisk.repository";

export class ScorecardController {
  private readonly scorecardService = new SecurityScorecardService();
  private readonly imageRepo = new MongoImageRiskRepository();

  getImageScorecard = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { imageName } = req.params;
      const decoded = decodeURIComponent(imageName);
      const image = await this.imageRepo.findByImageName(decoded);

      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      const scorecard = this.scorecardService.generateScorecard(image);
      res.json(scorecard);
    } catch (err) {
      next(err);
    }
  };
}

