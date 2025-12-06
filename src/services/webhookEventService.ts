import axios, { AxiosError } from "axios";
import crypto from "crypto";
import {
  WebhookSubscriptionModel,
  WebhookSubscriptionDocument,
  WebhookEventType,
} from "../persistence/webhookSubscription.model";
import {
  WebhookDeliveryModel,
  WebhookDeliveryDocument,
} from "../persistence/webhookDelivery.model";

export interface WebhookEvent {
  type: string;
  timestamp: string;
  data: Record<string, any>;
}

export class WebhookEventService {
  /**
   * Event'i tüm aktif webhook subscription'larına gönderir
   */
  async emitEvent(event: WebhookEvent): Promise<void> {
    // İlgili subscription'ları bul
    const subscriptions = await WebhookSubscriptionModel.find({
      enabled: true,
      active: true,
      $or: [
        { events: "*" },
        { events: event.type },
      ],
    }).exec();

    // Her subscription için delivery oluştur
    for (const subscription of subscriptions) {
      await this.deliverToSubscription(subscription, event);
    }
  }

  /**
   * Event'i belirli bir subscription'a gönderir
   */
  private async deliverToSubscription(
    subscription: WebhookSubscriptionDocument,
    event: WebhookEvent
  ): Promise<void> {
    // Payload oluştur
    const payload = {
      event: event.type,
      timestamp: event.timestamp,
      data: event.data,
    };

    // HMAC signature ekle (eğer secret varsa)
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "AutoPatch-AI-Webhook/1.0",
      "X-Webhook-Event": event.type,
      "X-Webhook-Timestamp": event.timestamp,
      ...(subscription.headers || {}),
    };

    if (subscription.secret) {
      const signature = this.generateSignature(
        JSON.stringify(payload),
        subscription.secret
      );
      headers["X-Webhook-Signature"] = signature;
    }

    // Delivery kaydı oluştur
    const delivery = await WebhookDeliveryModel.create({
      subscriptionId: subscription._id.toString(),
      eventType: event.type,
      payload,
      status: "pending",
      attempts: 0,
      maxAttempts: subscription.maxRetries,
      scheduledAt: new Date(),
    });

    // Delivery'yi gerçekleştir
    await this.executeDelivery(subscription, delivery, payload, headers);
  }

  /**
   * Webhook delivery'yi gerçekleştirir (retry logic ile)
   */
  private async executeDelivery(
    subscription: WebhookSubscriptionDocument,
    delivery: WebhookDeliveryDocument,
    payload: any,
    headers: Record<string, string>
  ): Promise<void> {
    try {
      delivery.attempts += 1;
      delivery.status = "retrying";

      const response = await axios.post(subscription.url, payload, {
        headers,
        timeout: 10000, // 10 saniye timeout
        validateStatus: (status) => status >= 200 && status < 300,
      });

      // Başarılı delivery
      delivery.status = "delivered";
      delivery.deliveredAt = new Date();
      delivery.responseStatus = response.status;
      delivery.responseBody = JSON.stringify(response.data).substring(0, 500); // İlk 500 karakter
      await delivery.save();

      // Subscription istatistiklerini güncelle
      await this.updateSubscriptionStats(subscription, true);

    } catch (error: any) {
      const axiosError = error as AxiosError;
      delivery.status = "failed";
      delivery.responseStatus = axiosError.response?.status;
      delivery.errorMessage = error.message?.substring(0, 500);

      // Retry kontrolü
      if (
        delivery.attempts < delivery.maxAttempts &&
        subscription.retryEnabled
      ) {
        // Retry zamanla
        const retryDelay = subscription.retryIntervalMs * delivery.attempts;
        delivery.nextRetryAt = new Date(Date.now() + retryDelay);
        delivery.status = "retrying";
      } else {
        // Maksimum retry aşıldı, başarısız olarak işaretle
        await this.updateSubscriptionStats(subscription, false);
      }

      await delivery.save();
    }
  }

  /**
   * Subscription istatistiklerini günceller
   */
  private async updateSubscriptionStats(
    subscription: WebhookSubscriptionDocument,
    success: boolean
  ): Promise<void> {
    subscription.totalDeliveries += 1;
    subscription.lastDeliveryAt = new Date();

    if (success) {
      subscription.successfulDeliveries += 1;
      subscription.lastDeliveryStatus = "success";
      subscription.active = true; // Başarılı delivery varsa aktif
      subscription.lastDeliveryError = undefined;
    } else {
      subscription.failedDeliveries += 1;
      subscription.lastDeliveryStatus = "failed";
      
      // Çok fazla başarısız delivery varsa inactive yap
      if (subscription.failedDeliveries > 10) {
        subscription.active = false;
      }
    }

    await subscription.save();
  }

  /**
   * HMAC signature oluşturur
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
  }

  /**
   * Bekleyen retry'ları işler
   */
  async processRetries(): Promise<void> {
    const now = new Date();
    const pendingDeliveries = await WebhookDeliveryModel.find({
      status: "retrying",
      nextRetryAt: { $lte: now },
      attempts: { $lt: 3 }, // Maksimum 3 deneme
    })
      .limit(50) // Her seferinde maksimum 50 delivery işle
      .exec();

    for (const delivery of pendingDeliveries) {
      const subscription = await WebhookSubscriptionModel.findById(
        delivery.subscriptionId
      ).exec();

      if (subscription && subscription.enabled && subscription.active) {
        await this.executeDelivery(
          subscription,
          delivery,
          delivery.payload,
          subscription.headers || {}
        );
      }
    }
  }

  /**
   * Test webhook gönderir
   */
  async sendTestWebhook(
    subscriptionId: string
  ): Promise<{ success: boolean; message: string }> {
    const subscription = await WebhookSubscriptionModel.findById(
      subscriptionId
    ).exec();

    if (!subscription) {
      return { success: false, message: "Subscription bulunamadı" };
    }

    const testEvent: WebhookEvent = {
      type: "test",
      timestamp: new Date().toISOString(),
      data: {
        message: "Bu bir test webhook'udur",
        subscriptionId: subscription._id.toString(),
        subscriptionName: subscription.name,
      },
    };

    try {
      await this.deliverToSubscription(subscription, testEvent);
      return { success: true, message: "Test webhook gönderildi" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

