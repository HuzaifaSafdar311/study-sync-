import { describe, it } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { adminAuthGuard } from '../src/middleware/adminAuthGuard';
import { authGuard, requireRole } from '../src/middleware/authGuard';

describe('UI-001 Backend 1: Status Codes & Error Codes', () => {
  const studentToken = jwt.sign(
    { userId: 'student-user-123', role: 'student' },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );

  const expiredStudentToken = jwt.sign(
    { userId: 'student-user-123', role: 'student' },
    config.jwt.accessSecret,
    { expiresIn: '-1s' }
  );

  it('adminAuthGuard: student token must return 403 FORBIDDEN, not 401', async () => {
    const req: any = {
      headers: { authorization: `Bearer ${studentToken}` },
      cookies: {},
    };

    let statusCode = 0;
    let body: any = null;
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        body = data;
        return this;
      },
    };

    let nextCalled = false;
    await adminAuthGuard(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, 'Next must not be called for student token in adminAuthGuard');
    assert.strictEqual(statusCode, 403, `Expected 403 FORBIDDEN for student token, got ${statusCode}`);
    assert.strictEqual(body?.code, 'FORBIDDEN');
    assert.strictEqual(body?.success, false);
  });

  it('adminAuthGuard: missing token must return 401 UNAUTHENTICATED', async () => {
    const req: any = { headers: {}, cookies: {} };
    let statusCode = 0;
    let body: any = null;
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        body = data;
        return this;
      },
    };

    await adminAuthGuard(req, res, () => {});
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(body?.code, 'UNAUTHENTICATED');
  });

  it('authGuard: expired token must return 401 with code TOKEN_EXPIRED', async () => {
    const req: any = {
      headers: { authorization: `Bearer ${expiredStudentToken}` },
      cookies: {},
    };

    let statusCode = 0;
    let body: any = null;
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        body = data;
        return this;
      },
    };

    await authGuard(req, res, () => {});
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(body?.code, 'TOKEN_EXPIRED');
  });

  it('requireRole: mismatching role must return 403 FORBIDDEN', async () => {
    const guard = requireRole('teacher', 'admin');
    const req: any = { userRole: 'student' };
    let statusCode = 0;
    let body: any = null;
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        body = data;
        return this;
      },
    };

    guard(req, res, () => {});
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(body?.code, 'FORBIDDEN');
  });
});
