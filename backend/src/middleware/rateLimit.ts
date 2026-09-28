
import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';

interface RateLimitOptions {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string;  // Redis key prefix
  message?: string;    // Custom error message
  fallbackToMemory?: boolean; // When true, enforce in-memory rate limits if Redis is offline
}

// In-memory store for fallback rate limiting
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup expired memory entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of inMemoryStore.entries()) {
    if (v.resetAt <= now) {
      inMemoryStore.delete(k);
    }
  }
}, 60 * 1000).unref();

/**
 * Redis-backed rate limiter middleware with optional in-memory fallback.
 * Uses sliding window counter approach for accurate rate limiting.
 */
export const rateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    keyPrefix = 'rl',
    message = 'Too many requests — please try again in a moment.',
    fallbackToMemory = false,
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  const enforceMemoryRateLimit = (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();
    const entry = inMemoryStore.get(key);

    if (!entry || entry.resetAt <= now) {
      inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    entry.count += 1;
    const remaining = Math.max(0, maxRequests - entry.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (entry.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        success: false,
        message,
        retryAfter,
      });
      return;
    }

    return next();
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (redis.status !== 'ready') {
      if (fallbackToMemory) {
        return enforceMemoryRateLimit(req, res, next);
      }
      next();
      return;
    }
    try {
      const identifier = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${keyPrefix}:${identifier}`;

      const current = await redis.incr(key);

      if (current === 1) {
        // First request in this window — set the TTL
        await redis.expire(key, windowSeconds);
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      if (current > maxRequests) {
        const ttl = await redis.ttl(key);
        res.setHeader('Retry-After', ttl);
        res.status(429).json({
          success: false,
          message,
          retryAfter: ttl,
        });
        return;
      }

      next();
    } catch (error) {
      if (fallbackToMemory) {
        console.warn('[RateLimit] Redis error, falling back to in-memory rate limiting:', (error as any)?.message);
        return enforceMemoryRateLimit(req, res, next);
      }
      // If Redis is down and fallback is disabled, allow the request through (fail-open)
      console.error('[RateLimit] Redis error, failing open:', error);
      next();
    }
  };
};

// Pre-configured rate limiters
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 100,
  keyPrefix: 'rl:general',
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 5,
  keyPrefix: 'rl:auth',
  message: 'Too many login attempts — please wait a minute before trying again.',
  fallbackToMemory: true,
});

export const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 10,
  keyPrefix: 'rl:voice',
  message: 'Voice capture rate limit reached — please wait before recording again.',
});

export const toolsProcessingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  maxRequests: 10,          // Max 10 CPU-heavy conversions/compressions per 5 mins
  keyPrefix: 'rl:tools',
  message: 'Document processing rate limit reached — please wait a few minutes before submitting new jobs.',
});

export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyPrefix: 'rl:admin_auth',
  message: 'Too many admin authentication attempts. For security reasons, please wait before trying again.',
  fallbackToMemory: true,
});

