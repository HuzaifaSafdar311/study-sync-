import { describe, it } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import toolsRouter from '../src/modules/tools/tools.routes';

describe('UI-001 Backend 2: /api/tools/health Accessible to Students and Sanitized', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/tools', toolsRouter);

  const studentToken = jwt.sign(
    { userId: 'student-id-456', role: 'student' },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );

  it('authenticated student must be allowed to call GET /api/tools/health with 200', async () => {
    const req: any = {
      method: 'GET',
      url: '/api/tools/health',
      headers: { authorization: `Bearer ${studentToken}` },
    };

    let statusCode = 0;
    let body: any = null;

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
          body = data;
          resolve();
        },
        setHeader() { return this; },
      };
      (app as any).handle(req, res, () => resolve());
    });

    assert.strictEqual(statusCode, 200, `Student should receive 200, got ${statusCode}`);
    assert.strictEqual(body?.success, true);
    assert.strictEqual(typeof body?.data?.libreOffice, 'boolean');
    assert.strictEqual(typeof body?.data?.ghostscript, 'boolean');

    // Must NOT leak paths or system binary locations
    assert.strictEqual(body?.data?.libreOfficePath, undefined, 'Must not expose libreOfficePath');
    assert.strictEqual(body?.data?.ghostscriptPath, undefined, 'Must not expose ghostscriptPath');
    assert.strictEqual(body?.data?.version, undefined, 'Must not expose version info');
    assert.strictEqual(body?.data?.env, undefined, 'Must not expose environment details');
  });

  it('unauthenticated request must be rejected with 401', async () => {
    const req: any = {
      method: 'GET',
      url: '/api/tools/health',
      headers: {},
    };

    let statusCode = 0;
    await new Promise<void>((resolve) => {
      const res: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          statusCode = code;
          return this;
        },
        json() {
          statusCode = this.statusCode;
          resolve();
        },
        setHeader() { return this; },
      };
      (app as any).handle(req, res, () => resolve());
    });

    assert.strictEqual(statusCode, 401);
  });
});
