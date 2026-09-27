import fs from 'fs';
import path from 'path';
import prisma from '../../config/database';

const baseDir = process.env.VERCEL ? '/tmp' : process.cwd();
const SYSTEM_USAGE_FILE = path.resolve(baseDir, 'system_chat_usage.json');

export const MAX_SYSTEM_CHAT_MESSAGES = 3;

interface UserUsageRecord {
  count: number;
  lastUsedAt: string;
}

class SystemQuotaService {
  private cache: Map<string, UserUsageRecord> = new Map();
  private loaded: boolean = false;

  private loadFromDisk() {
    if (this.loaded) return;
    try {
      if (fs.existsSync(SYSTEM_USAGE_FILE)) {
        const raw = fs.readFileSync(SYSTEM_USAGE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (typeof data === 'object' && data !== null) {
          for (const [k, v] of Object.entries(data)) {
            if (typeof v === 'number') {
              this.cache.set(k, { count: v, lastUsedAt: new Date().toISOString() });
            } else if (typeof v === 'object' && v !== null && typeof (v as any).count === 'number') {
              this.cache.set(k, {
                count: (v as any).count,
                lastUsedAt: (v as any).lastUsedAt || new Date().toISOString(),
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[SystemQuotaService] Error loading system_chat_usage.json:', err);
    }
    this.loaded = true;
  }

  private saveToDisk() {
    try {
      const obj: Record<string, UserUsageRecord> = {};
      for (const [k, v] of this.cache.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(SYSTEM_USAGE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[SystemQuotaService] Error saving system_chat_usage.json:', err);
    }
  }

  /**
   * Checks whether the user has active BYOK configured with at least one verified API key.
   */
  async isByokActive(userId: string): Promise<{ isByok: boolean; activeProvider?: string }> {
    if (!userId) return { isByok: false };

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          aiProviderPreference: true,
          activeByokProvider: true,
        },
      });

      if (user?.aiProviderPreference === 'byok') {
        const keyRecord = await prisma.userApiKey.findFirst({
          where: {
            userId,
            isValid: true,
          },
        });

        if (keyRecord && keyRecord.encryptedData) {
          return {
            isByok: true,
            activeProvider: (user.activeByokProvider as string) || (keyRecord.provider as string),
          };
        }
      }
    } catch (err) {
      console.warn('[SystemQuotaService] Error inspecting user BYOK status:', err);
    }

    return { isByok: false };
  }

  /**
   * Retrieves the current system message count for a user.
   */
  getSystemUsageCount(userId: string): number {
    this.loadFromDisk();
    return this.cache.get(userId)?.count || 0;
  }

  /**
   * Increments the user's system message count by 1 and persists it.
   */
  incrementSystemUsage(userId: string): { count: number; limit: number; remaining: number } {
    this.loadFromDisk();
    const current = this.cache.get(userId)?.count || 0;
    const newCount = current + 1;
    this.cache.set(userId, {
      count: newCount,
      lastUsedAt: new Date().toISOString(),
    });
    this.saveToDisk();

    return {
      count: newCount,
      limit: MAX_SYSTEM_CHAT_MESSAGES,
      remaining: Math.max(0, MAX_SYSTEM_CHAT_MESSAGES - newCount),
    };
  }

  /**
   * Resets usage for a user (e.g. testing or admin reset).
   */
  resetSystemUsage(userId: string) {
    this.loadFromDisk();
    this.cache.delete(userId);
    this.saveToDisk();
  }

  /**
   * Returns all recorded system usage
   */
  getAllUsage(): Map<string, UserUsageRecord> {
    this.loadFromDisk();
    return this.cache;
  }

  /**
   * Evaluates if the user is allowed to send a message using system API.
   * If BYOK is active, quota is unlimited.
   * If not BYOK, user can only send up to MAX_SYSTEM_CHAT_MESSAGES (3).
   */
  async checkSystemQuota(userId: string): Promise<{
    allowed: boolean;
    isByok: boolean;
    activeProvider?: string;
    count: number;
    limit: number;
    remaining: number;
    requiresApiKey: boolean;
  }> {
    const byokStatus = await this.isByokActive(userId);
    if (byokStatus.isByok) {
      return {
        allowed: true,
        isByok: true,
        activeProvider: byokStatus.activeProvider,
        count: 0,
        limit: Infinity,
        remaining: Infinity,
        requiresApiKey: false,
      };
    }

    const count = this.getSystemUsageCount(userId);
    const limit = MAX_SYSTEM_CHAT_MESSAGES;
    const remaining = Math.max(0, limit - count);
    const allowed = count < limit;

    return {
      allowed,
      isByok: false,
      count,
      limit,
      remaining,
      requiresApiKey: !allowed,
    };
  }
}

export const systemQuotaService = new SystemQuotaService();
