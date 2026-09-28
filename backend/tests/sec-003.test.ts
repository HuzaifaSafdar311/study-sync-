import { describe, it } from 'node:test';
import assert from 'node:assert';
import express, { Request, Response } from 'express';
import adminRouter from '../src/modules/admin/admin.routes';

describe('SEC-003: Admin Login Rate Limiting', () => {
  it('should block brute-force attempts on POST /api/admin/auth/login after 5 attempts', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    // Make 6 rapid requests to admin login with wrong credentials
    let blockedAtLeastOnce = false;
    let lastStatusCode = 0;

    for (let i = 1; i <= 6; i++) {
      let statusCode = 0;
      const req: any = {
        method: 'POST',
        url: '/api/admin/auth/login',
        headers: { 'x-forwarded-for': '192.168.1.100' },
        ip: '192.168.1.100',
        body: { identifier: 'admin', password: 'wrong', securityPassphrase: 'wrong' },
      };

      // Mock request/response execution through Express router stack
      await new Promise<void>((resolve) => {
        const res: any = {
          statusCode: 200,
          headers: {},
          setHeader(k: string, v: any) { this.headers[k] = v; return this; },
          status(code: number) { this.statusCode = code; statusCode = code; return this; },
          json(body: any) {
            statusCode = this.statusCode;
            lastStatusCode = statusCode;
            if (statusCode === 429) {
              blockedAtLeastOnce = true;
            }
            resolve();
          },
        };
        (app as any).handle(req, res, () => resolve());
      });
    }

    // In old code, all 6 requests return 401 and NONE return 429
    // In new code, 6th request MUST return 429!
    assert.strictEqual(blockedAtLeastOnce, true, 'Admin login must trigger 429 rate limit after 5 failed attempts');
    assert.strictEqual(lastStatusCode, 429);
  });
});
