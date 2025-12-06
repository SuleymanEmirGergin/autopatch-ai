import { Request, Response, NextFunction } from "express";
import { ApiTokenModel } from "../../persistence/apiToken.model";

/**
 * Basit RBAC modeli:
 * - ADMIN_API_KEY  -> role: "admin"
 * - READONLY_API_KEY -> role: "readonly"
 *
 * Geliştirme ortamında hiçbir key tanımlı değilse, tüm istekler "admin" gibi kabul edilir.
 */

export type UserRole = "admin" | "readonly";

declare module "express-serve-static-core" {
  interface Request {
    userRole?: UserRole;
  }
}

export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers["x-api-key"];
  const adminKey = process.env.ADMIN_API_KEY;
  const readonlyKey = process.env.READONLY_API_KEY;

  // Geliştirme modu: hiç key konfigüre edilmemişse herkese izin ver
  if (!adminKey && !readonlyKey) {
    req.userRole = "admin";
    return next();
  }

  if (!apiKey || typeof apiKey !== "string") {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Valid X-API-Key header required",
    });
  }

  // 1) Env tabanlı statik anahtarlar
  if (adminKey && apiKey === adminKey) {
    req.userRole = "admin";
    return next();
  }

  if (readonlyKey && apiKey === readonlyKey) {
    req.userRole = "readonly";
    return next();
  }

  try {
    // 2) Dinamik API token'ları (MongoDB)
    const tokenDoc = await ApiTokenModel.findOne({ token: apiKey }).exec();

    if (!tokenDoc) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid API key",
      });
    }

    if (tokenDoc.expiresAt && tokenDoc.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "API token expired",
      });
    }

    // lastUsedAt'i async olarak güncelle (isteği bekletmemek için fire-and-forget)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ApiTokenModel.updateOne(
      { _id: tokenDoc._id },
      { $set: { lastUsedAt: new Date() } }
    ).exec();

    req.userRole = tokenDoc.role;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Belirli role sahip olmayı zorunlu kılan middleware.
 * Örneğin sadece admin'lerin erişebileceği endpoint'ler için kullanılır.
 */
export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User role not resolved",
      });
    }

    if (req.userRole !== role) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Required role: ${role}`,
      });
    }

    return next();
  };
}
