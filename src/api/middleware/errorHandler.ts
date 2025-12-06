import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, code || "VALIDATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", code?: string) {
    super(`${resource} bulunamadı`, 404, code || "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Yetkisiz erişim", code?: string) {
    super(message, 401, code || "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Bu işlem için yetkiniz yok", code?: string) {
    super(message, 403, code || "FORBIDDEN");
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 409, code || "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Çok fazla istek gönderildi", code?: string) {
    super(message, 429, code || "RATE_LIMIT_EXCEEDED");
  }
}

/**
 * Merkezi hata yakalama middleware'i
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // AppError ise statusCode'u kullan
  if (err instanceof AppError) {
    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational !== false;

    // Log operational olmayan hatalar
    if (!isOperational) {
      console.error("[ERROR]", {
        message: err.message,
        stack: err.stack,
        code: err.code,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn("[OPERATIONAL_ERROR]", {
        message: err.message,
        code: err.code,
        path: req.path,
        method: req.method,
        statusCode,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code || "UNKNOWN_ERROR",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      },
    });
  }

  // Mongoose validation hatası
  if (err.name === "ValidationError") {
    const mongooseError = err as any;
    const errors = Object.values(mongooseError.errors || {}).map(
      (e: any) => e.message
    );
    return res.status(400).json({
      success: false,
      error: {
        message: "Validation hatası",
        code: "VALIDATION_ERROR",
        details: errors,
      },
    });
  }

  // Mongoose duplicate key hatası
  if ((err as any).code === 11000) {
    return res.status(409).json({
      success: false,
      error: {
        message: "Bu kayıt zaten mevcut",
        code: "DUPLICATE_KEY",
      },
    });
  }

  // Mongoose cast hatası (geçersiz ObjectId vb.)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: {
        message: "Geçersiz ID formatı",
        code: "INVALID_ID",
      },
    });
  }

  // Beklenmeyen hatalar için genel handler
  console.error("[UNEXPECTED_ERROR]", {
    message: err.message,
    stack: err.stack,
    name: err.name,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === "production" 
        ? "Bir hata oluştu" 
        : err.message,
      code: "INTERNAL_SERVER_ERROR",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
}

/**
 * Async handler wrapper - async route handler'larındaki hataları yakalar
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler - Route bulunamadığında
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route bulunamadı: ${req.method} ${req.path}`,
      code: "ROUTE_NOT_FOUND",
    },
  });
}

