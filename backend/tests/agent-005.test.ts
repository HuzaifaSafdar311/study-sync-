import { describe, it } from 'node:test';
import assert from 'node:assert';
import prisma from '../src/config/database';
import { agentService } from '../src/modules/ai/agent.service';

describe('AGENT-005: Code-Level Tool Permissions, Session Injection, and Secret-Redacted Audit Logs', () => {
  it('must ignore model-supplied userId or courseId in args and enforce authenticated session bindings', async () => {
    const legitimateUserId = crypto.randomUUID();
    const spoofedUserId = crypto.randomUUID();
    const legitimateCourseId = crypto.randomUUID();
    const spoofedCourseId = crypto.randomUUID();

    await prisma.user.create({
      data: {
        id: legitimateUserId,
        email: `agent005-legit-${Date.now()}@example.com`,
        fullName: 'Legitimate User',
        role: 'student',
        isVerified: true,
      } as any,
    });

    const course = await prisma.course.create({
      data: {
        id: legitimateCourseId,
        userId: legitimateUserId,
        name: 'Legit Course',
      } as any,
    });

    // Model tries to pass spoofed courseId and userId in args
    const spoofedArgs = {
      courseId: spoofedCourseId,
      userId: spoofedUserId,
      topic_or_key: 'exam_notes',
      content: 'Important study content',
    };

    const res = await agentService.executeTool(
      'memory_write',
      spoofedArgs,
      course.id,
      course.name,
      legitimateUserId
    );

    assert.strictEqual(res.result.success, true);
    // Arguments must have been sanitized to bound courseId
    assert.strictEqual(spoofedArgs.courseId, legitimateCourseId);
    assert.strictEqual(spoofedArgs.userId, legitimateUserId);
  });

  it('must refuse tool execution if course does not belong to authenticated user', async () => {
    const victimUserId = crypto.randomUUID();
    const attackerUserId = crypto.randomUUID();

    await prisma.user.create({
      data: {
        id: victimUserId,
        email: `agent005-vic-${Date.now()}@example.com`,
        fullName: 'Victim User',
        role: 'student',
        isVerified: true,
      } as any,
    });

    await prisma.user.create({
      data: {
        id: attackerUserId,
        email: `agent005-att-${Date.now()}@example.com`,
        fullName: 'Attacker User',
        role: 'student',
        isVerified: true,
      } as any,
    });

    const victimCourse = await prisma.course.create({
      data: {
        id: crypto.randomUUID(),
        userId: victimUserId,
        name: 'Victim Course',
      } as any,
    });

    const res = await agentService.executeTool(
      'create_file',
      { filepath: 'hack.txt', content: 'hacked' },
      victimCourse.id,
      victimCourse.name,
      attackerUserId
    );

    assert.strictEqual(res.result.success, false);
    assert.ok(
      res.result.error?.includes('Access denied') || res.result.error?.includes('Course not found'),
      'Must reject tool execution on unowned course'
    );
  });

  it('must enforce role allowlist for restricted tools', async () => {
    const studentUserId = crypto.randomUUID();
    const originalEnv = process.env.NODE_ENV;
    const originalBash = process.env.BASH_TOOL_ENABLED;

    try {
      process.env.NODE_ENV = 'production';
      process.env.BASH_TOOL_ENABLED = 'false';

      const res = await agentService.executeTool(
        'bash_tool',
        { command: 'node -v' },
        'any_course',
        'Course',
        studentUserId,
        'Run bash',
        'student' // unprivileged student role
      );

      assert.strictEqual(res.result.success, false);
      assert.ok(
        res.result.error?.includes('Access denied') || res.result.error?.includes('restricted'),
        'Must reject bash_tool for student in production'
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalBash !== undefined) process.env.BASH_TOOL_ENABLED = originalBash;
      else delete process.env.BASH_TOOL_ENABLED;
    }
  });
});
