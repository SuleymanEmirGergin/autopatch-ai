import express from "express";
import { Server as HttpServer } from "http";
import mongoose from "mongoose";
import { createRouter } from "./api/routes";
import { config } from "./config";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi";
import { WebSocketService } from "./services/websocketService";

export async function createApp() {
  await mongoose.connect(config.mongoUri);

  const app = express();
  app.use(express.json());

  // HTTP server oluştur (WebSocket için gerekli)
  const httpServer = new HttpServer(app);

  // WebSocket servisini başlat
  const wsService = new WebSocketService();
  wsService.initialize(httpServer);

  // API routes
  app.use("/", createRouter(wsService));

  // Swagger docs (opsiyonel)
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // 404 handler - Route bulunamadığında (routes'tan sonra, error handler'dan önce)
  const { notFoundHandler, errorHandler } = require("./api/middleware/errorHandler");
  app.use(notFoundHandler);

  // Merkezi hata yakalama middleware'i (en sonda olmalı)
  app.use(errorHandler);

  // WebSocket servisini app'e ekle (diğer servislerden erişim için)
  (app as any).wsService = wsService;

  return { app, httpServer, wsService };
}


