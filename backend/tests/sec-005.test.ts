import { describe, it } from 'node:test';
import assert from 'node:assert';
import redis from '../src/config/redis';
import { toolsProcessingLimiter, voiceLimiter, generalLimiter } from '../src/middleware/rateLimit';

describe('SEC-005: Rate Limiters Must Never Fail Open When Redis Is Offline', () => {
  it('should enforce in-memory rate limiting for toolsProcessingLimiter when Redis is offline', async () => {
    // Ensure Redis is offline or simulated as not ready
    const originalStatus = redis.status;
    (redis as any).status = 'end'; // Simulate Redis disconnected

    try {
      let blockedCount = 0;
      let lastStatus = 200;

      // toolsProcessingLimiter has limit 10 per 5 mins
      // Make 12 rapid requests from same IP
      for (let i = 1; i <= 12; i++) {
        const req: any = {
          ip: '10.0.0.99',
          socket: { remoteAddress: '10.0.0.99' },
          headers: {},
        };

        let statusCode = 200;
        const res: any = {
          setHeader() { return this; },
          status(code: number) { statusCode = code; return this; },
          json() { return this; },
        };

        let nextCalled = false;
        await toolsProcessingLimiter(req, res, () => {
          nextCalled = true;
        });

        if (statusCode === 429) {
          blockedCount++;
          lastStatus = 429;
        }
      }

      // In old code, fallbackToMemory was false, so it failed open (next called all 12 times, blockedCount is 0)!
      // In new code, requests 11 and 12 MUST be blocked with 429!
      assert.ok(blockedCount >= 2, `toolsProcessingLimiter must block requests exceeding limit when Redis is down (blocked: ${blockedCount})`);
      assert.strictEqual(lastStatus, 429);
    } finally {
      (redis as any).status = originalStatus;
    }
  });

  it('should enforce in-memory rate limiting for voiceLimiter when Redis is offline', async () => {
    const originalStatus = redis.status;
    (redis as any).status = 'end';

    try {
      let blockedCount = 0;

      // voiceLimiter has limit 10 per minute
      for (let i = 1; i <= 12; i++) {
        const req: any = {
          ip: '10.0.0.88',
          socket: { remoteAddress: '10.0.0.88' },
          headers: {},
        };

        let statusCode = 200;
        const res: any = {
          setHeader() { return this; },
          status(code: number) { statusCode = code; return this; },
          json() { return this; },
        };

        await voiceLimiter(req, res, () => {});

        if (statusCode === 429) {
          blockedCount++;
        }
      }

      assert.ok(blockedCount >= 2, `voiceLimiter must block requests exceeding limit when Redis is down (blocked: ${blockedCount})`);
    } finally {
      (redis as any).status = originalStatus;
    }
  });
});
