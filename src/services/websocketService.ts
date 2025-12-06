import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { ImageRiskResult } from "../risk/riskEngine";

export interface ScanCompleteEvent {
  scanId: string;
  imagesScanned: number;
  highOrCriticalCount: number;
  completedAt: Date;
}

export interface NewRiskDetectedEvent {
  image: ImageRiskResult;
  isNew: boolean;
}

export class WebSocketService {
  private io: SocketIOServer | null = null;

  initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*", // Production'da daha güvenli yapılmalı
        methods: ["GET", "POST"],
      },
      path: "/socket.io",
    });

    this.io.on("connection", (socket: Socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);

      socket.on("disconnect", () => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      });

      // Client'a bağlantı onayı gönder
      socket.emit("connected", {
        message: "Connected to AutoPatch AI WebSocket",
        timestamp: new Date().toISOString(),
      });
    });

    console.log("[WebSocket] WebSocket service initialized");
  }

  /**
   * Scan tamamlandığında tüm client'lara bildirim gönder
   */
  broadcastScanComplete(event: ScanCompleteEvent): void {
    if (!this.io) {
      console.warn("[WebSocket] Server not initialized, cannot broadcast");
      return;
    }

    this.io.emit("scan:complete", event);
    console.log(`[WebSocket] Broadcasted scan complete: ${event.scanId}`);
  }

  /**
   * Yeni riskli image tespit edildiğinde bildirim gönder
   */
  broadcastNewRisk(event: NewRiskDetectedEvent): void {
    if (!this.io) {
      console.warn("[WebSocket] Server not initialized, cannot broadcast");
      return;
    }

    this.io.emit("risk:new", event);
    console.log(`[WebSocket] Broadcasted new risk: ${event.image.imageName}`);
  }

  /**
   * Scan durumu güncellemesi gönder
   */
  broadcastScanStatus(status: {
    status: "RUNNING" | "COMPLETED" | "FAILED";
    startedAt: Date;
    finishedAt?: Date;
    errorMessage?: string;
  }): void {
    if (!this.io) {
      return;
    }

    this.io.emit("scan:status", status);
  }

  /**
   * Image güncellemesi gönder
   */
  broadcastImageUpdate(image: ImageRiskResult): void {
    if (!this.io) {
      return;
    }

    this.io.emit("image:update", image);
  }

  /**
   * Genel bildirim gönder
   */
  broadcastNotification(message: string, type: "info" | "warning" | "error" | "success" = "info"): void {
    if (!this.io) {
      return;
    }

    this.io.emit("notification", {
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Belirli bir client'a mesaj gönder
   */
  sendToClient(socketId: string, event: string, data: any): void {
    if (!this.io) {
      return;
    }

    this.io.to(socketId).emit(event, data);
  }

  /**
   * Bağlı client sayısını döndür
   */
  getConnectedClients(): number {
    if (!this.io) {
      return 0;
    }

    return this.io.sockets.sockets.size;
  }
}

