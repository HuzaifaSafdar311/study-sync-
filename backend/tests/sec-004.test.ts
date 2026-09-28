import { describe, it } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import express, { Response } from 'express';
import { config } from '../src/config';
import adminRouter from '../src/modules/admin/admin.routes';
import { adminAuthGuard, AdminAuthRequest } from '../src/middleware/adminAuthGuard';

describe('SEC-004: Admin Logout Token Invalidation', () => {
  it('should invalidate admin token upon logout and reject subsequent requests with 401', async () => {
    const adminToken = jwt.sign(
      {
        adminId: 'admin-uuid-1234',
        username: 'superadmin',
        role: 'superadmin',
        type: 'admin_session',
      },
      config.adminJwt.secret,
      { expiresIn: '12h' }
    );

    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    // Step 1: Admin calls logout
    const logoutReq: any = {
      method: 'POST',
      url: '/api/admin/auth/logout',
      headers: { authorization: `Bearer ${adminToken}` },
      body: {},
    };

    let logoutStatus = 0;
    await new Promise<void>((resolve) => {
      const res: any = {
        statusCode: 200,
        status(code: number) { this.statusCode = code; logoutStatus = code; return this; },
        json() { logoutStatus = this.statusCode; resolve(); },
        setHeader() { return this; },
      };
      (app as any).handle(logoutReq, res, () => resolve());
    });

    // Step 2: Admin attempts to use the SAME token to access a protected route
    let meStatus = 0;
    let meCalled = false;
    const meReq: any = {
      headers: { authorization: `Bearer ${adminToken}` },
    };
    const meRes: any = {
      statusCode: 200,
      status(code: number) { this.statusCode = code; meStatus = code; return this; },
      json() { meStatus = this.statusCode; },
    };

    await adminAuthGuard(meReq, meRes, () => {
      meCalled = true;
    });

    // In old code: logout was a no-op, so meCalled is true and meStatus is 200!
    // In new code: meCalled MUST be false and meStatus MUST be 401 (token revoked)!
    assert.strictEqual(meCalled, false, 'Revoked token must not be allowed by adminAuthGuard');
    assert.strictEqual(meStatus, 401, 'adminAuthGuard must return 401 for revoked token');
  });
});
