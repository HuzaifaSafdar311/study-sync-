import { describe, it } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import adminRouter from '../src/modules/admin/admin.routes';

describe('BUG-002: Admin Logout Unauthenticated Request Guard', () => {
  it('should reject unauthenticated POST /api/admin/auth/logout with 401', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    // Call logout without any admin credentials
    const req: any = {
      method: 'POST',
      url: '/api/admin/auth/logout',
      headers: {},
      body: {},
    };

    let statusCode = 200;
    let responseBody: any = null;

    await new Promise<void>((resolve) => {
      const res: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          statusCode = code;
          return this;
        },
        json(data: any) {
          statusCode = this.statusCode;
          responseBody = data;
          resolve();
        },
        setHeader() { return this; },
      };
      (app as any).handle(req, res, () => resolve());
    });

    assert.strictEqual(
      statusCode,
      401,
      `Unauthenticated logout must be rejected with 401, got ${statusCode}`
    );
    assert.strictEqual(responseBody?.success, false);
  });
});
