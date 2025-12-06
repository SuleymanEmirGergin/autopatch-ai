import { Request, Response, NextFunction } from "express";
import { AuditService } from "../../services/auditService";
import { AuditAction } from "../../persistence/auditLog.model";

const auditService = new AuditService();

/**
 * Request'ten IP adresini çıkarır
 */
function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    (req.headers["x-real-ip"] as string) ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

/**
 * Audit log middleware'i - Her request'i loglar
 */
export function auditMiddleware(action: AuditAction, resourceType?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Response'u intercept et
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // İşlem başarılıysa logla
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId =
          req.params.id ||
          req.params.imageName ||
          req.body?.imageName ||
          req.body?.id;

        auditService
          .log({
            action,
            userIp: getClientIp(req),
            resourceType: resourceType || req.route?.path,
            resourceId,
            details: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
            },
          })
          .catch((err) => {
            console.error("[AuditMiddleware] Log kaydedilemedi:", err);
          });
      }

      return originalJson(body);
    };

    next();
  };
}

