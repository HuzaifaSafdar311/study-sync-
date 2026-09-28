import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import redis from '../../config/redis';

// In-memory revocation registry: tokenKey -> expiration timestamp (ms)
const inMemoryRevokedTokens = new Map<string, number>();

// Periodic memory cleaner
setInterval(() => {
  const now = Date.now();
  for (const [key, expMs] of inMemoryRevokedTokens.entries()) {
    if (expMs <= now) {
      inMemoryRevokedTokens.delete(key);
    }
  }
}, 60 * 1000).unref();

function getTokenIdentifier(token: string): { key: string; expSeconds: number } {
  try {
    const decoded: any = jwt.decode(token);
    const jti = decoded?.jti;
    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = typeof decoded?.exp === 'number' ? decoded.exp : nowSec + 12 * 3600;
    const remainingSeconds = Math.max(60, expSec - nowSec);

    if (jti) {
      return { key: `admin_revoked:${jti}`, expSeconds: remainingSeconds };
    }
  } catch {
    // If token cannot be decoded, hash the raw token
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { key: `admin_revoked:${hash}`, expSeconds: 12 * 3600 };
}

/**
 * Revokes an admin token immediately.
 * Persists in Redis (if online) and in-memory registry.
 */
export async function revokeAdminToken(token: string): Promise<void> {
  if (!token || typeof token !== 'string') return;

  const { key, expSeconds } = getTokenIdentifier(token.trim());
  const expMs = Date.now() + expSeconds * 1000;

  // 1. Store in memory
  inMemoryRevokedTokens.set(key, expMs);

  // 2. Store in Redis if connected
  try {
    if (redis.status === 'ready') {
      await redis.setex(key, expSeconds, '1');
    }
  } catch (err) {
    console.warn('[AdminRevocation] Failed to set revocation key in Redis:', err);
  }
}

/**
 * Checks if an admin token has been revoked.
 */
export async function isAdminTokenRevoked(token: string): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const { key } = getTokenIdentifier(token.trim());

  // 1. Check in-memory first
  const memExp = inMemoryRevokedTokens.get(key);
  if (memExp) {
    if (memExp > Date.now()) {
      return true;
    } else {
      inMemoryRevokedTokens.delete(key);
    }
  }

  // 2. Check Redis if connected
  try {
    if (redis.status === 'ready') {
      const exists = await redis.exists(key);
      if (exists) {
        return true;
      }
    }
  } catch (err) {
    console.warn('[AdminRevocation] Redis check failed:', err);
  }

  return false;
}
