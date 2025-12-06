/**
 * Rate Limiting Middleware
 * DoS ve brute force saldırılarına karşı koruma
 */

import { Request, Response, NextFunction } from "express";
import { RateLimitError } from "./errorHandler";

// Basit in-memory rate limiter (production'da Redis kullanılmalı)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Rate limiter middleware
 * @param windowMs - Zaman penceresi (milisaniye)
 * @param maxRequests - Maksimum istek sayısı
 * @param keyGenerator - Rate limit key'i oluşturma fonksiyonu
 */
export function rateLimiter(
  windowMs: number = 60000, // 1 dakika
  maxRequests: number = 100,
  keyGenerator: (req: Request) => string = (req) => {
    // Varsayılan: IP + endpoint
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const endpoint = req.path;
    return `${ip}:${endpoint}`;
  }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Eski kayıtları temizle
    if (store[key] && store[key].resetTime < now) {
      delete store[key];
    }

    // Yeni kayıt oluştur veya güncelle
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    // Rate limit kontrolü
    if (store[key].count >= maxRequests) {
      const resetIn = Math.ceil((store[key].resetTime - now) / 1000);
      res.setHeader("X-RateLimit-Limit", String(maxRequests));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(store[key].resetTime));
      res.setHeader("Retry-After", String(resetIn));
      
      return next(
        new RateLimitError(
          `Rate limit aşıldı. ${resetIn} saniye sonra tekrar deneyin.`
        )
      );
    }

    // İsteği say
    store[key].count++;

    // Response header'ları ekle
    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(maxRequests - store[key].count));
    res.setHeader("X-RateLimit-Reset", String(store[key].resetTime));

    next();
  };
}

/**
 * Image creation için özel rate limiter
 * Daha sıkı limitler (DoS önleme)
 */
export function imageCreationRateLimiter() {
  return rateLimiter(
    60000, // 1 dakika
    10, // Maksimum 10 image ekleme isteği
    (req) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const apiKey = req.headers["x-api-key"] as string || "anonymous";
      return `image-creation:${ip}:${apiKey}`;
    }
  );
}

/**
 * Bulk image creation için özel rate limiter
 * Çok daha sıkı limitler
 */
export function bulkImageCreationRateLimiter() {
  return rateLimiter(
    60000, // 1 dakika
    3, // Maksimum 3 bulk isteği
    (req) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const apiKey = req.headers["x-api-key"] as string || "anonymous";
      return `bulk-image-creation:${ip}:${apiKey}`;
    }
  );
}

