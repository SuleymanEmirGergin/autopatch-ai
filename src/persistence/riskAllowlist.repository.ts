import { RiskAllowlistModel, RiskAllowlistDocument } from "./riskAllowlist.model";

export class RiskAllowlistRepository {
  async getIgnoredFactorsForImage(imageName: string): Promise<string[]> {
    const doc = await RiskAllowlistModel.findOne({ imageName })
      .select({ ignoredRiskFactors: 1 })
      .lean()
      .exec();
    return doc?.ignoredRiskFactors ?? [];
  }

  async listAll(): Promise<RiskAllowlistDocument[]> {
    return RiskAllowlistModel.find().sort({ imageName: 1 }).exec();
  }

  async upsert(
    imageName: string,
    ignoredRiskFactors: string[],
    note?: string
  ): Promise<RiskAllowlistDocument> {
    const doc = await RiskAllowlistModel.findOneAndUpdate(
      { imageName },
      { $set: { ignoredRiskFactors, note } },
      { upsert: true, new: true }
    ).exec();
    if (!doc) {
      throw new Error("Failed to upsert allowlist entry");
    }
    return doc;
  }

  async remove(imageName: string): Promise<void> {
    await RiskAllowlistModel.deleteOne({ imageName }).exec();
  }
}


