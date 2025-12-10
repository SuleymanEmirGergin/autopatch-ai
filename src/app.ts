import http from "http";
import express, { Express } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createRouter } from "./api/routes";
import { WebSocketService } from "./services/websocketService";
import { config } from "./config";

dotenv.config();

/**
 * Uygulamayı ayağa kaldırır, MongoDB'ye bağlanır ve WebSocket'i hazırlar.
 * server.ts tarafından çağrılır.
 */
export async function createApp(): Promise<{
  app: Express;
  httpServer: http.Server;
  wsService: WebSocketService;
}> {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    config.mongoUri ||
    "mongodb://127.0.0.1:27017/autopatch-ai";

  console.log("🔌 MONGODB_URI =>", mongoUri);

  await mongoose.connect(mongoUri);
  console.log("✅ MongoDB connected");

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // Health endpoints
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/", (_req, res) => {
    res.json({ status: "ok" });
  });

  // API routes
  const wsService = new WebSocketService();
  const router = createRouter(wsService);
  app.use("/api", router);

  const httpServer = http.createServer(app);
  wsService.initialize(httpServer);

  return { app, httpServer, wsService };
}
