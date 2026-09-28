import { describe, it } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { authGuard } from '../src/middleware/authGuard';
import {
  generateDownloadToken,
  verifyAndConsumeDownloadToken,
  downloadAuthGuard,
} from '../src/utils/downloadToken';

describe('SEC-002: Disallow ?token= in General Routes and Require Signed Single-Use Download Tokens', () => {
  it('should REJECT ?token= in general authGuard requests', async () => {
    const validToken = jwt.sign(
      { userId: 'test-user-123', role: 'student' },
      config.jwt.accessSecret,
      { expiresIn: '15m' }
    );

    let nextCalled = false;
    let statusCode = 200;

    const req: any = {
      headers: {},
      cookies: {},
      query: { token: validToken },
      path: '/api/auth/me',
    };

    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };

    await authGuard(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, 'authGuard must reject query.token on general routes');
    assert.strictEqual(statusCode, 401);
  });

  it('should still allow Authorization header in general authGuard requests', async () => {
    const validToken = jwt.sign(
      { userId: 'test-user-123', role: 'student' },
      config.jwt.accessSecret,
      { expiresIn: '15m' }
    );

    let nextCalled = false;
    const req: any = {
      headers: { authorization: `Bearer ${validToken}` },
      cookies: {},
      query: {},
    };
    const res: any = {
      status() { return this; },
      json() { return this; },
    };

    await authGuard(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, 'authGuard must accept Authorization header');
    assert.strictEqual(req.userId, 'test-user-123');
  });

  it('should generate and verify a single-use download token bound to userId and jobId', () => {
    const userId = 'user-abc-123';
    const jobId = 'job-xyz-789';

    const token = generateDownloadToken(userId, jobId, 300);
    assert.ok(token, 'Token must be generated');

    // First consumption must succeed
    const firstUse = verifyAndConsumeDownloadToken(token, jobId);
    assert.ok(firstUse, 'First use must succeed');
    assert.strictEqual(firstUse?.userId, userId);
    assert.strictEqual(firstUse?.jobId, jobId);

    // Second consumption must fail (single-use enforcement)
    const secondUse = verifyAndConsumeDownloadToken(token, jobId);
    assert.strictEqual(secondUse, null, 'Second consumption must fail because token is single-use');
  });

  it('should reject single-use download token if jobId does not match', () => {
    const token = generateDownloadToken('user-1', 'job-alpha', 300);
    const result = verifyAndConsumeDownloadToken(token, 'job-beta');
    assert.strictEqual(result, null, 'Token must be bound to specific jobId');
  });

  it('should allow download with valid ticket and reject on reuse in downloadAuthGuard', async () => {
    const userId = 'user-test-download';
    const jobId = 'job-456';
    const token = generateDownloadToken(userId, jobId, 300);

    let nextCount = 0;
    let statusCode = 200;

    const createReq = () => ({
      headers: {},
      cookies: {},
      params: { id: jobId },
      query: { token },
    } as any);

    const createRes = () => ({
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    } as any);

    // First attempt: should succeed
    const req1 = createReq();
    const res1 = createRes();
    await downloadAuthGuard(req1, res1, () => {
      nextCount++;
    });
    assert.strictEqual(nextCount, 1);
    assert.strictEqual(req1.userId, userId);

    // Second attempt: must be rejected with 403 (already consumed)
    const req2 = createReq();
    const res2 = createRes();
    await downloadAuthGuard(req2, res2, () => {
      nextCount++;
    });
    assert.strictEqual(nextCount, 1, 'Second attempt must not call next');
    assert.strictEqual(statusCode, 403, 'Second attempt must return 403 forbidden');
  });
});
