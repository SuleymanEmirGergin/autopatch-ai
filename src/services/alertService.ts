import { ImageRiskResult } from "../risk/riskEngine";
import { AlertRuleModel, AlertRuleDocument } from "../persistence/alertRule.model";
import { NotificationService } from "./notificationService";

export class AlertService {
  constructor(private readonly notificationService?: NotificationService) {}

  /**
   * Scan sonuçlarını alert rule'larına göre kontrol eder ve gerekirse bildirim gönderir.
   */
  async checkAlerts(scanResults: ImageRiskResult[]): Promise<void> {
    if (!this.notificationService) {
      return; // Notification service yoksa alert gönderilemez
    }

    const rules = await AlertRuleModel.find({ enabled: true }).exec();

    for (const rule of rules) {
      const matchingImages = this.filterMatchingImages(scanResults, rule);

      if (matchingImages.length > 0) {
        await this.triggerAlert(rule, matchingImages);
      }
    }
  }

  private filterMatchingImages(
    results: ImageRiskResult[],
    rule: AlertRuleDocument
  ): ImageRiskResult[] {
    return results.filter((img) => {
      const cond = rule.conditions;

      // Risk level kontrolü
      if (cond.riskLevel && img.riskLevel !== cond.riskLevel) {
        return false;
      }

      // Min risk score kontrolü
      if (cond.minRiskScore && img.riskScore < cond.minRiskScore) {
        return false;
      }

      // Prod only kontrolü
      if (cond.prodOnly) {
        const hasProdPod = img.pods.some((p) => {
          const ns = p.namespace.toLowerCase();
          return ns === "prod" || ns.startsWith("prod-");
        });
        if (!hasProdPod) {
          return false;
        }
      }

      // Namespace kontrolü
      if (cond.namespace) {
        const hasNamespace = img.pods.some(
          (p) => p.namespace === cond.namespace
        );
        if (!hasNamespace) {
          return false;
        }
      }

      return true;
    });
  }

  private async triggerAlert(
    rule: AlertRuleDocument,
    matchingImages: ImageRiskResult[]
  ): Promise<void> {
    if (!this.notificationService) {
      return;
    }

    // Alert'i tetiklenmiş olarak işaretle
    rule.lastTriggeredAt = new Date();
    await rule.save();

    // Bildirim gönder
    if (rule.notificationChannels.email || rule.notificationChannels.webhook) {
      // NotificationService'i kullanarak bildirim gönder
      // Burada özel bir alert mesajı oluşturabiliriz
      await this.notificationService.notifyHighRiskImages(matchingImages);
    }
  }
}

