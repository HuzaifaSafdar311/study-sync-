import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import toolsRoutes from '../src/modules/tools/tools.routes';
import { registerToolJob } from '../src/modules/tools/tools.queue';

describe('SEC-009: Tools Job Status Endpoint Authentication and Ownership Guard', () => {
  let server: http.Server;
  let baseUrl: string;

  const user1Id = 'user_sec009_1';
  const user2Id = 'user_sec009_2';
  const job1Id = 'job_sec009_1';

  let user1Token: string;
  let user2Token: string;

  before(async () => {
    user1Token = jwt.sign({ userId: user1Id, role: 'student' }, config.jwt.accessSecret, { expiresIn: '1h' });
    user2Token = jwt.sign({ userId: user2Id, role: 'student' }, config.jwt.accessSecret, { expiresIn: '1h' });

    registerToolJob({
      id: job1Id,
      userId: user1Id,
      type: 'convert',
      status: 'pending',
      originalName: 'test.docx',
      inputPath: 'test.docx',
      originalSize: 500,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/tools', toolsRoutes);

    await new Promise<void>((resolve) => {
      server = testApp.listen(0, '127.0.0.1', () => {
        const addr: any = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) server.close();
  });

  it('must REJECT unauthenticated requests to GET /api/tools/jobs/:id with 401', async () => {
    const res = await fetch(`${baseUrl}/api/tools/jobs/${job1Id}`);
    assert.strictEqual(res.status, 401);
  });

  it('must REJECT requests from non-owner user with 404', async () => {
    const res = await fetch(`${baseUrl}/api/tools/jobs/${job1Id}`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.strictEqual(res.status, 404);
  });

  it('must ALLOW authenticated owner to check job status with 200', async () => {
    const res = await fetch(`${baseUrl}/api/tools/jobs/${job1Id}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data?.status, 'pending');
  });
});
