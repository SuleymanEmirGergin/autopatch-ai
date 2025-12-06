import { Request, Response, NextFunction } from "express";
import {
  WebhookSubscriptionModel,
  WebhookSubscriptionDocument,
} from "../../persistence/webhookSubscription.model";
import { WebhookEventService } from "../../services/webhookEventService";

export class WebhookController {
  private webhookEventService: WebhookEventService;

  constructor() {
    this.webhookEventService = new WebhookEventService();
  }

  /**
   * Tüm webhook subscription'ları listeler
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscriptions = await WebhookSubscriptionModel.find().exec();
      res.json(subscriptions);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Belirli bir subscription'ı getirir
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const subscription = await WebhookSubscriptionModel.findById(id).exec();
      if (!subscription) {
        return res.status(404).json({ error: "Webhook subscription bulunamadı" });
      }
      res.json(subscription);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Yeni webhook subscription oluşturur
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await WebhookSubscriptionModel.create(req.body);
      res.status(201).json(subscription);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Webhook subscription'ı günceller
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const subscription = await WebhookSubscriptionModel.findByIdAndUpdate(
        id,
        req.body,
        { new: true }
      ).exec();
      if (!subscription) {
        return res.status(404).json({ error: "Webhook subscription bulunamadı" });
      }
      res.json(subscription);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Webhook subscription'ı siler
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const subscription = await WebhookSubscriptionModel.findByIdAndDelete(id).exec();
      if (!subscription) {
        return res.status(404).json({ error: "Webhook subscription bulunamadı" });
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * Test webhook gönderir
   */
  test = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.webhookEventService.sendTestWebhook(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

