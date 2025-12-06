import { io, Socket } from "socket.io-client";
import { ImageRisk } from "./api";

// Nginx reverse proxy üzerinden WebSocket'e erişim
// Client-side'da window.location.origin kullan (nginx üzerinden)
// Server-side'da direkt backend'e eriş
const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    // Client-side: nginx üzerinden (window.location.origin = http://localhost:8080)
    return window.location.origin;
  }
  // Server-side: direkt backend
  return process.env.BACKEND_URL || "http://localhost:5000";
};

const BACKEND_URL = getBackendUrl();

export interface ScanCompleteEvent {
  scanId: string;
  imagesScanned: number;
  highOrCriticalCount: number;
  completedAt: string;
}

export interface NewRiskDetectedEvent {
  image: ImageRisk;
  isNew: boolean;
}

export interface ScanStatusEvent {
  status: "RUNNING" | "COMPLETED" | "FAILED";
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
}

export interface NotificationEvent {
  message: string;
  type: "info" | "warning" | "error" | "success";
  timestamp: string;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    // Client-side'da window.location.origin kullan (nginx üzerinden)
    // Server-side'da direkt backend'e eriş
    const socketUrl = typeof window !== "undefined" 
      ? window.location.origin 
      : (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:5000");

    this.socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on("connect", () => {
      console.log("[WebSocket] Connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", () => {
      console.log("[WebSocket] Disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error);
      this.reconnectAttempts++;
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onScanComplete(callback: (event: ScanCompleteEvent) => void): void {
    if (this.socket) {
      this.socket.on("scan:complete", callback);
    }
  }

  onNewRisk(callback: (event: NewRiskDetectedEvent) => void): void {
    if (this.socket) {
      this.socket.on("risk:new", callback);
    }
  }

  onScanStatus(callback: (event: ScanStatusEvent) => void): void {
    if (this.socket) {
      this.socket.on("scan:status", callback);
    }
  }

  onNotification(callback: (event: NotificationEvent) => void): void {
    if (this.socket) {
      this.socket.on("notification", callback);
    }
  }

  onImageUpdate(callback: (image: ImageRisk) => void): void {
    if (this.socket) {
      this.socket.on("image:update", callback);
    }
  }

  onConnected(callback: (data: { message: string; timestamp: string }) => void): void {
    if (this.socket) {
      this.socket.on("connected", callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();

