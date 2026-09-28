import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { AuthRequest } from '../middleware/authGuard';

// Single-use token tracking: jti -> expiration timestamp in ms
const consumedTokens = new Map<string, number>();

function cleanupConsumedTokens(): void {
  const now = Date.now();
  for (const [jti, expMs] of consumedTokens.entries()) {
    if (expMs < now) {
      consumedTokens.delete(jti);
    }
  }
}

/**
 * Generates a short-lived (5 min), single-use signed download ticket bound to userId and jobId.
 */
export function generateDownloadToken(userId: string, jobId: string, expiresInSeconds: number = 300): string {
  cleanupConsumedTokens();
  const jti = crypto.randomUUID();
  return jwt.sign(
    {
      type: 'download_ticket',
      userId,
      jobId,
      jti,
    },
    config.jwt.accessSecret,
    { expiresIn: expiresInSeconds }
  );
}

/**
 * Verifies and consumes a single-use signed download token.
 * Returns decoded payload if valid and not yet consumed; null otherwise.
 */
export function verifyAndConsumeDownloadToken(
  token: string,
  expectedJobId: string
): { userId: string; jobId: string } | null {
  cleanupConsumedTokens();
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as {
      type: string;
      userId: string;
      jobId: string;
      jti: string;
      exp: number;
    };

    if (payload.type !== 'download_ticket') {
      return null;
    }

    if (payload.jobId !== expectedJobId) {
      return null;
    }

    if (consumedTokens.has(payload.jti)) {
      // Already consumed — single-use violation
      return null;
    }

    // Mark as consumed
    const expMs = (payload.exp || Math.floor(Date.now() / 1000) + 300) * 1000;
    consumedTokens.set(payload.jti, expMs);

    return { userId: payload.userId, jobId: payload.jobId };
  } catch {
    return null;
  }
}

/**
 * Middleware: Specifically for download endpoints.
 * Accepts session auth (cookie/header) OR short-lived single-use signed download link bound to jobId.
 */
export const downloadAuthGuard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let sessionToken = req.cookies?.accessToken;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7).trim();
    } else if (authHeader) {
      sessionToken = authHeader.trim();
    }

    // 1. If standard session authentication is provided, verify it
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, config.jwt.accessSecret) as {
          userId: string;
          role: string;
        };
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        return next();
      } catch {
        // Fall through to query token check if session is invalid
      }
    }

    // 2. If query token is provided, verify it strictly as a single-use download ticket
    const queryToken = req.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      const jobId = String(req.params.id || req.params.jobId || req.query.jobId || '');
      const validTicket = verifyAndConsumeDownloadToken(queryToken.trim(), jobId);

      if (validTicket) {
        req.userId = validTicket.userId;
        req.userRole = 'student';
        return next();
      }

      res.status(403).json({
        success: false,
        message: 'Download link is invalid, expired, or has already been used.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Authentication required to download this resource.',
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Download authentication error.',
    });
  }
};
