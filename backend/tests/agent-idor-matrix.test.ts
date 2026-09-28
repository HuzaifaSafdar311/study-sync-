import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import prisma from '../src/config/database';
import taskRoutes from '../src/modules/tasks/task.routes';
import courseRoutes from '../src/modules/courses/course.routes';
import toolsRoutes from '../src/modules/tools/tools.routes';
import { courseService } from '../src/modules/courses/course.service';
import { registerToolJob } from '../src/modules/tools/tools.queue';
import { getCourseWorkspaceDir } from '../src/modules/ai/tools/file.tools';
import { generateDownloadToken } from '../src/utils/downloadToken';

describe('AGENT-IDOR: Cross-User Resource Isolation Matrix (Assert 404 on unowned resources)', () => {
  let server: http.Server;
  let baseUrl: string;

  const userA_id = crypto.randomUUID();
  const userB_id = crypto.randomUUID();

  let userAToken: string;
  let userBToken: string;

  let courseA: any;
  let taskA: any;
  const jobAId = `idor_job_${crypto.randomUUID()}`;

  before(async () => {
    // 1. Create User A and User B
    await prisma.user.create({
      data: {
        id: userA_id,
        email: `idor-user-a-${Date.now()}@example.com`,
        fullName: 'Victim User A',
        role: 'student',
        isVerified: true,
      } as any,
    });

    await prisma.user.create({
      data: {
        id: userB_id,
        email: `idor-user-b-${Date.now()}@example.com`,
        fullName: 'Attacker User B',
        role: 'student',
        isVerified: true,
      } as any,
    });

    userAToken = jwt.sign(
      { userId: userA_id, role: 'student' },
      config.jwt.accessSecret,
      { expiresIn: '1h' }
    );

    userBToken = jwt.sign(
      { userId: userB_id, role: 'student' },
      config.jwt.accessSecret,
      { expiresIn: '1h' }
    );

    // 2. Create User A's resources
    courseA = await prisma.course.create({
      data: {
        id: crypto.randomUUID(),
        userId: userA_id,
        name: 'User A Confidential Course',
      } as any,
    });

    taskA = await prisma.task.create({
      data: {
        id: crypto.randomUUID(),
        userId: userA_id,
        courseId: courseA.id,
        title: 'User A Secret Task',
        deadline: new Date(Date.now() + 86400000),
      } as any,
    });

    // Register a tool job for User A
    registerToolJob({
      id: jobAId,
      userId: userA_id,
      type: 'compress',
      status: 'done',
      originalName: 'secret.pdf',
      inputPath: 'storage/tools_temp/input/secret.pdf',
      resultPath: 'storage/tools_temp/output/secret.pdf',
      originalSize: 1024,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    });

    // Create a workspace file for Course A
    const wsDir = getCourseWorkspaceDir(courseA.id);
    if (!fs.existsSync(wsDir)) {
      fs.mkdirSync(wsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(wsDir, 'notes.txt'), 'CONFIDENTIAL_NOTES_OF_USER_A', 'utf-8');

    // Create chat history for Course A
    courseService.addAssistantSystemMessage(courseA.id, 'Welcome to User A course');

    // 3. Start local ephemeral Express test server
    const testApp = express();
    testApp.use(express.json());
    testApp.use(cookieParser());
    testApp.use('/api/tasks', taskRoutes);
    testApp.use('/api/courses', courseRoutes);
    testApp.use('/api/tools', toolsRoutes);

    await new Promise<void>((resolve) => {
      server = testApp.listen(0, '127.0.0.1', () => {
        const addr: any = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      server.close();
    }
    try {
      await prisma.task.deleteMany({ where: { id: taskA.id } });
      await prisma.course.deleteMany({ where: { id: courseA.id } });
      await prisma.user.deleteMany({ where: { id: { in: [userA_id, userB_id] } } });
    } catch {}
  });

  const bAuth = () => ({ Authorization: `Bearer ${userBToken}` });

  // ─── 1. TASKS ROUTE IDOR MATRIX ───────────────────────────────────────────
  it('GET /api/tasks/:id: User B must get 404 on User A task', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/${taskA.id}`, { headers: bAuth() });
    assert.strictEqual(res.status, 404);
  });

  it('PATCH /api/tasks/:id: User B must get 404 when updating User A task', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/${taskA.id}`, {
      method: 'PATCH',
      headers: { ...bAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Tampered' }),
    });
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/tasks/:id: User B must get 404 when deleting User A task', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/${taskA.id}`, {
      method: 'DELETE',
      headers: bAuth(),
    });
    assert.strictEqual(res.status, 404);
  });

  // ─── 2. COURSES ROUTE IDOR MATRIX ─────────────────────────────────────────
  it('GET /api/courses/:id/tasks: User B must get 404 on User A course tasks', async () => {
    const res = await fetch(`${baseUrl}/api/courses/${courseA.id}/tasks`, { headers: bAuth() });
    assert.strictEqual(res.status, 404);
  });

  it('POST /api/courses/:id/materials: User B must get 404 on User A course', async () => {
    const res = await fetch(`${baseUrl}/api/courses/${courseA.id}/materials`, {
      method: 'POST',
      headers: { ...bAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Injected Note', content: 'Malicious Content' }),
    });
    assert.strictEqual(res.status, 404);
  });

  it('POST /api/courses/:id/upload: User B must get 404 on User A course upload', async () => {
    const formBoundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const formBody = [
      `--${formBoundary}`,
      'Content-Disposition: form-data; name="file"; filename="test.txt"',
      'Content-Type: text/plain',
      '',
      'Uploaded content payload',
      `--${formBoundary}--`,
    ].join('\r\n');

    const res = await fetch(`${baseUrl}/api/courses/${courseA.id}/upload`, {
      method: 'POST',
      headers: {
        ...bAuth(),
        'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
      },
      body: formBody,
    });
    assert.strictEqual(res.status, 404);
  });

  it('POST /api/courses/:id/chat: User B must get 404 on User A course chat', async () => {
    const formBoundary = '----WebKitFormBoundaryChat7MA4YWxkTrZu0gW';
    const formBody = [
      `--${formBoundary}`,
      'Content-Disposition: form-data; name="question"',
      '',
      'What are the secrets?',
      `--${formBoundary}--`,
    ].join('\r\n');

    const res = await fetch(`${baseUrl}/api/courses/${courseA.id}/chat`, {
      method: 'POST',
      headers: {
        ...bAuth(),
        'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
      },
      body: formBody,
    });
    assert.strictEqual(res.status, 404);
  });

  it('GET /api/courses/:id/chat/history: User B must get 404 on User A chat history', async () => {
    const res = await fetch(`${baseUrl}/api/courses/${courseA.id}/chat/history`, { headers: bAuth() });
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/courses/:id/chat/history: User B must get 404 when clearing User A chat history', async () => {
    const res = await fetch(`${baseUrl}/api/courses/${courseA.id}/chat/history`, {
      method: 'DELETE',
      headers: bAuth(),
    });
    assert.strictEqual(res.status, 404);
  });

  it('GET /api/courses/:id/workspace-file: User B must get 404 on User A workspace file', async () => {
    const res = await fetch(`${baseUrl}/api/courses/${courseA.id}/workspace-file?path=notes.txt`, {
      headers: bAuth(),
    });
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/courses/:id: User B must get 404 when deleting User A course', async () => {
    const res = await fetch(`${baseUrl}/api/courses/${courseA.id}`, {
      method: 'DELETE',
      headers: bAuth(),
    });
    assert.strictEqual(res.status, 404);
  });

  // ─── 3. TOOLS ROUTE IDOR MATRIX ───────────────────────────────────────────
  it('GET /api/tools/jobs/:id: User B must get 404 on User A tool job', async () => {
    const res = await fetch(`${baseUrl}/api/tools/jobs/${jobAId}`, { headers: bAuth() });
    assert.strictEqual(res.status, 404);
  });

  it('GET /api/tools/jobs/:id/download: User B must get 404 when trying to download User A job result', async () => {
    // Attempt download using User B's token
    const res = await fetch(`${baseUrl}/api/tools/jobs/${jobAId}/download`, { headers: bAuth() });
    assert.strictEqual(res.status, 404);
  });
});
