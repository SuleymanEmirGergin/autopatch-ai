import { Request, Response, NextFunction } from "express";
import { DependencyGraphService } from "../../services/dependencyGraphService";
import { MongoImageRiskRepository } from "../../persistence/imageRisk.repository";

export class DependencyController {
  private readonly graphService = new DependencyGraphService();
  private readonly imageRepo = new MongoImageRiskRepository();

  getGraph = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const images = await this.imageRepo.findAll();
      const graph = this.graphService.buildGraph(images);
      res.json(graph);
    } catch (err) {
      next(err);
    }
  };

  getImageDependencies = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { imageName } = req.params;
      const decoded = decodeURIComponent(imageName);
      const images = await this.imageRepo.findAll();
      const dependencies = this.graphService.getImageDependencies(
        decoded,
        images
      );
      res.json(dependencies);
    } catch (err) {
      next(err);
    }
  };
}

