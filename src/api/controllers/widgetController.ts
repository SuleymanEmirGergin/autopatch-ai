import { Request, Response, NextFunction } from "express";
import { WidgetService } from "../../services/widgetService";
import { CreateWidgetPayload } from "../../services/widgetService";

export class WidgetController {
  private widgetService: WidgetService;

  constructor() {
    this.widgetService = new WidgetService();
  }

  /**
   * Tüm widget'ları listeler
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers["x-user-id"] as string | undefined;
      const widgets = await this.widgetService.getAllWidgets(userId);
      res.json(widgets);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Widget oluşturur
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers["x-user-id"] as string | undefined;
      const payload: CreateWidgetPayload = req.body;
      const widget = await this.widgetService.createWidget(payload, userId);
      res.status(201).json(widget);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Widget günceller
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.headers["x-user-id"] as string | undefined;
      const updates: Partial<CreateWidgetPayload> = req.body;
      const widget = await this.widgetService.updateWidget(id, updates, userId);
      if (!widget) {
        return res.status(404).json({ error: "Widget bulunamadı" });
      }
      res.json(widget);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Widget siler
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.headers["x-user-id"] as string | undefined;
      const deleted = await this.widgetService.deleteWidget(id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Widget bulunamadı" });
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * Widget pozisyonlarını toplu günceller
   */
  updatePositions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers["x-user-id"] as string | undefined;
      const positions: Array<{
        id: string;
        x: number;
        y: number;
        w: number;
        h: number;
        order: number;
      }> = req.body.positions;

      await this.widgetService.updateWidgetPositions(positions, userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Widget için veri döner
   */
  getData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.headers["x-user-id"] as string | undefined;
      const widgets = await this.widgetService.getAllWidgets(userId);
      const widget = widgets.find((w) => w._id.toString() === id);

      if (!widget) {
        return res.status(404).json({ error: "Widget bulunamadı" });
      }

      const data = await this.widgetService.getWidgetData(widget);
      res.json(data);
    } catch (err) {
      next(err);
    }
  };
}

