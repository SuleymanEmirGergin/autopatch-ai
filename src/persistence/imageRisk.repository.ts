import { ImageRiskModel, ImageRiskDocument } from "./imageRisk.model";
import { ImageRiskResult } from "../risk/riskEngine";

export interface ImageRiskRepository {
  upsertMany(results: ImageRiskResult[]): Promise<ImageRiskDocument[]>;
  findAll(clusterId?: string, projectId?: string): Promise<ImageRiskDocument[]>;
  findByImageName(imageName: string, clusterId?: string): Promise<ImageRiskDocument | null>;
  findTop(limit: number, prodOnly: boolean, clusterId?: string, projectId?: string): Promise<ImageRiskDocument[]>;
  findByRepositoryBase(baseName: string, clusterId?: string, projectId?: string): Promise<ImageRiskDocument[]>;
}

export class MongoImageRiskRepository implements ImageRiskRepository {
  async upsertMany(
    results: ImageRiskResult[]
  ): Promise<ImageRiskDocument[]> {
    const docs: ImageRiskDocument[] = [];

    for (const result of results) {
      const query: any = { imageName: result.imageName };
      if (result.clusterId) {
        query.clusterId = result.clusterId;
      }

      const doc = await ImageRiskModel.findOneAndUpdate(
        query,
        {
          $set: {
            riskScore: result.riskScore,
            riskLevel: result.riskLevel,
            lastScannedAt: result.lastScannedAt,
            pods: result.pods,
            riskFactors: result.riskFactors,
            clusterId: result.clusterId,
            projectId: result.projectId,
          },
        },
        {
          new: true,
          upsert: true,
        }
      ).exec();

      if (doc) {
        docs.push(doc);
      }
    }

    return docs;
  }

  async findAll(clusterId?: string, projectId?: string): Promise<ImageRiskDocument[]> {
    const query: any = {};
    if (clusterId) query.clusterId = clusterId;
    if (projectId) query.projectId = projectId;
    return ImageRiskModel.find(query).sort({ imageName: 1 }).exec();
  }

  async findByImageName(
    imageName: string,
    clusterId?: string
  ): Promise<ImageRiskDocument | null> {
    const query: any = { imageName };
    if (clusterId) query.clusterId = clusterId;
    return ImageRiskModel.findOne(query).exec();
  }

  async findTop(
    limit: number,
    prodOnly: boolean,
    clusterId?: string,
    projectId?: string
  ): Promise<ImageRiskDocument[]> {
    const query: any = {};
    if (prodOnly) {
      query["pods.namespace"] = { $regex: /^prod/i };
    }
    if (clusterId) query.clusterId = clusterId;
    if (projectId) query.projectId = projectId;

    return ImageRiskModel.find(query)
      .sort({ riskScore: -1 })
      .limit(limit)
      .exec();
  }

  async findByRepositoryBase(
    baseName: string,
    clusterId?: string,
    projectId?: string
  ): Promise<ImageRiskDocument[]> {
    // baseName'e göre tüm tag'leri bul (regex ile)
    // Örnek: "registry.example.com/app" -> "registry.example.com/app:*"
    const regex = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(:.*)?$`);
    const query: any = { imageName: regex };
    if (clusterId) query.clusterId = clusterId;
    if (projectId) query.projectId = projectId;
    return ImageRiskModel.find(query)
      .sort({ imageName: 1 })
      .exec();
  }
}


