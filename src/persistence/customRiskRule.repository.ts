import {
  CustomRiskRuleModel,
  CustomRiskRuleDocument,
} from "./customRiskRule.model";

export class CustomRiskRuleRepository {
  async findAll(): Promise<CustomRiskRuleDocument[]> {
    return CustomRiskRuleModel.find({ enabled: true })
      .sort({ priority: 1, createdAt: -1 })
      .exec();
  }

  async findAllIncludingDisabled(): Promise<CustomRiskRuleDocument[]> {
    return CustomRiskRuleModel.find()
      .sort({ priority: 1, createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<CustomRiskRuleDocument | null> {
    return CustomRiskRuleModel.findById(id).exec();
  }

  async create(rule: Omit<CustomRiskRuleDocument, "_id" | "createdAt" | "updatedAt">): Promise<CustomRiskRuleDocument> {
    return CustomRiskRuleModel.create(rule);
  }

  async update(
    id: string,
    updates: Partial<CustomRiskRuleDocument>
  ): Promise<CustomRiskRuleDocument | null> {
    updates.updatedAt = new Date();
    return CustomRiskRuleModel.findByIdAndUpdate(id, updates, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await CustomRiskRuleModel.findByIdAndDelete(id).exec();
  }

  async toggleEnabled(id: string): Promise<CustomRiskRuleDocument | null> {
    const rule = await CustomRiskRuleModel.findById(id).exec();
    if (!rule) return null;
    rule.enabled = !rule.enabled;
    rule.updatedAt = new Date();
    return rule.save();
  }
}

