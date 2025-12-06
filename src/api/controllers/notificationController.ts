import { Request, Response, NextFunction } from "express";
import { NotificationGroupingService } from "../../services/notificationGroupingService";
import { NotificationSeverity } from "../../persistence/notificationGroup.model";

export class NotificationController {
  private groupingService: NotificationGroupingService;

  constructor() {
    this.groupingService = new NotificationGroupingService();
  }

  /**
   * Aktif bildirimleri listeler
   */
  listActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const severity = req.query.severity as NotificationSeverity | undefined;
      const notifications = await this.groupingService.getActiveNotifications(
        limit,
        severity
      );
      res.json(notifications);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Bildirimi onaylandı olarak işaretler
   */
  acknowledge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const notification = await this.groupingService.acknowledgeNotification(id);
      if (!notification) {
        return res.status(404).json({ error: "Bildirim bulunamadı" });
      }
      res.json(notification);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Bildirimi reddedilmiş olarak işaretler
   */
  dismiss = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const notification = await this.groupingService.dismissNotification(id);
      if (!notification) {
        return res.status(404).json({ error: "Bildirim bulunamadı" });
      }
      res.json(notification);
    } catch (err) {
      next(err);
    }
  };
}

