import { RiskBudgetModel, RiskBudgetDocument } from "../persistence/riskBudget.model";
import { ImageRiskRepository, MongoImageRiskRepository } from "../persistence/imageRisk.repository";
import { NotificationService } from "./notificationService";

export interface RiskBudgetStatus {
  budget: RiskBudgetDocument;
  isExceeded: boolean;
  exceededFields: string[];
  utilization: {
    critical: number; // 0-100 yüzde
    high: number;
    medium: number;
    totalRiskScore: number;
  };
}

export class RiskBudgetService {
  private repository: ImageRiskRepository;

  constructor(private notificationService?: NotificationService) {
    this.repository = new MongoImageRiskRepository();
  }

  /**
   * Tüm risk budget'larını listeler
   */
  async listBudgets(clusterId?: string, projectId?: string): Promise<RiskBudgetDocument[]> {
    const query: any = {};
    if (clusterId) query.clusterId = clusterId;
    if (projectId) query.projectId = projectId;
    return RiskBudgetModel.find(query).exec();
  }

  /**
   * Yeni bir risk budget oluşturur
   */
  async createBudget(data: Partial<RiskBudgetDocument>): Promise<RiskBudgetDocument> {
    const budget = await RiskBudgetModel.create(data);
    // İlk kontrolü yap
    await this.checkBudget(budget._id.toString());
    return budget;
  }

  /**
   * Risk budget'ı günceller
   */
  async updateBudget(
    id: string,
    data: Partial<RiskBudgetDocument>
  ): Promise<RiskBudgetDocument | null> {
    const budget = await RiskBudgetModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (budget) {
      await this.checkBudget(id);
    }
    return budget;
  }

  /**
   * Risk budget'ı siler
   */
  async deleteBudget(id: string): Promise<boolean> {
    const result = await RiskBudgetModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Belirli bir budget'ın durumunu kontrol eder ve günceller
   */
  async checkBudget(budgetId: string): Promise<RiskBudgetStatus | null> {
    const budget = await RiskBudgetModel.findById(budgetId).exec();
    if (!budget || !budget.enabled) {
      return null;
    }

    // Mevcut durumu hesapla
    const images = await this.repository.findAll(budget.clusterId, budget.projectId);
    
    const currentCritical = images.filter((img) => img.riskLevel === "CRITICAL").length;
    const currentHigh = images.filter((img) => img.riskLevel === "HIGH").length;
    const currentMedium = images.filter((img) => img.riskLevel === "MEDIUM").length;
    const currentTotalRiskScore = images.reduce((sum, img) => sum + img.riskScore, 0);

    // Budget'ı güncelle
    budget.currentCritical = currentCritical;
    budget.currentHigh = currentHigh;
    budget.currentMedium = currentMedium;
    budget.currentTotalRiskScore = currentTotalRiskScore;
    budget.lastCheckedAt = new Date();

    // Threshold kontrolü
    const exceededFields: string[] = [];
    if (budget.maxCritical !== null && currentCritical > budget.maxCritical) {
      exceededFields.push("CRITICAL");
    }
    if (budget.maxHigh !== null && currentHigh > budget.maxHigh) {
      exceededFields.push("HIGH");
    }
    if (budget.maxMedium !== null && currentMedium > budget.maxMedium) {
      exceededFields.push("MEDIUM");
    }
    if (budget.maxTotalRiskScore !== null && currentTotalRiskScore > budget.maxTotalRiskScore) {
      exceededFields.push("TOTAL_RISK_SCORE");
    }

    const isExceeded = exceededFields.length > 0;

    // Eğer yeni aşıldıysa ve alert açıksa bildirim gönder
    if (isExceeded && budget.alertOnExceed && !budget.exceededAt) {
      budget.exceededAt = new Date();
      await this.sendAlert(budget, exceededFields);
    } else if (!isExceeded) {
      budget.exceededAt = null;
    }

    await budget.save();

    // Utilization hesapla
    const utilization = {
      critical:
        budget.maxCritical !== null
          ? Math.min(100, (currentCritical / budget.maxCritical) * 100)
          : 0,
      high:
        budget.maxHigh !== null
          ? Math.min(100, (currentHigh / budget.maxHigh) * 100)
          : 0,
      medium:
        budget.maxMedium !== null
          ? Math.min(100, (currentMedium / budget.maxMedium) * 100)
          : 0,
      totalRiskScore:
        budget.maxTotalRiskScore !== null
          ? Math.min(100, (currentTotalRiskScore / budget.maxTotalRiskScore) * 100)
          : 0,
    };

    return {
      budget,
      isExceeded,
      exceededFields,
      utilization,
    };
  }

  /**
   * Tüm aktif budget'ları kontrol eder
   */
  async checkAllBudgets(): Promise<RiskBudgetStatus[]> {
    const budgets = await RiskBudgetModel.find({ enabled: true }).exec();
    const results: RiskBudgetStatus[] = [];

    for (const budget of budgets) {
      const status = await this.checkBudget(budget._id.toString());
      if (status) {
        results.push(status);
      }
    }

    return results;
  }

  /**
   * Budget aşıldığında alert gönderir
   */
  private async sendAlert(
    budget: RiskBudgetDocument,
    exceededFields: string[]
  ): Promise<void> {
    if (!this.notificationService) {
      return;
    }

    const message = `Risk Budget "${budget.name}" aşıldı!\n\n` +
      `Aşılan alanlar: ${exceededFields.join(", ")}\n` +
      `Mevcut durum:\n` +
      `- CRITICAL: ${budget.currentCritical}${budget.maxCritical !== null ? ` / ${budget.maxCritical}` : ""}\n` +
      `- HIGH: ${budget.currentHigh}${budget.maxHigh !== null ? ` / ${budget.maxHigh}` : ""}\n` +
      `- MEDIUM: ${budget.currentMedium}${budget.maxMedium !== null ? ` / ${budget.maxMedium}` : ""}\n` +
      `- Toplam Risk Skoru: ${budget.currentTotalRiskScore}${budget.maxTotalRiskScore !== null ? ` / ${budget.maxTotalRiskScore}` : ""}`;

    // Alert channel'lara göre gönder
    if (budget.alertChannels.includes("email")) {
      // Email gönderimi (NotificationService üzerinden)
      // Bu kısım NotificationService'e eklenebilir
    }

    if (budget.alertChannels.includes("slack")) {
      // Slack gönderimi
    }

    if (budget.alertChannels.includes("webhook")) {
      // Webhook gönderimi
    }
  }
}

