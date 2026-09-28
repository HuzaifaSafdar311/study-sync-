import { describe, it } from 'node:test';
import assert from 'node:assert';
import prisma from '../src/config/database';
import { courseService } from '../src/modules/courses/course.service';

describe('AGENT-006: queryCourseRAG Cross-User Course Isolation', () => {
  it('must strictly enforce course ownership and return 404 when querying another user course', async () => {
    const user1Id = crypto.randomUUID();
    const user2Id = crypto.randomUUID();

    await prisma.user.create({
      data: {
        id: user1Id,
        email: `agent006-u1-${Date.now()}@example.com`,
        fullName: 'User One',
        role: 'student',
        isVerified: true,
      } as any,
    });

    await prisma.user.create({
      data: {
        id: user2Id,
        email: `agent006-u2-${Date.now()}@example.com`,
        fullName: 'User Two',
        role: 'student',
        isVerified: true,
      } as any,
    });

    const user1Course = await prisma.course.create({
      data: {
        id: crypto.randomUUID(),
        userId: user1Id,
        name: 'User 1 Confidential Course',
      } as any,
    });

    // User 2 attempts to query User 1's course
    let errorCaught: any = null;
    try {
      await courseService.queryCourseRAG(
        user2Id,
        user1Course.id,
        'Give me the confidential course notes'
      );
    } catch (err: any) {
      errorCaught = err;
    }

    // In old code, fallback to findUnique caused the course to be resolved (error was NOT 404 'Course not found.')
    // In new code, it must reject immediately with 404 'Course not found.'
    assert.ok(errorCaught, 'Querying another user course must throw an error');
    assert.strictEqual(
      errorCaught.statusCode,
      404,
      'Status code must be 404 (not 403 or 200)'
    );
    assert.strictEqual(
      errorCaught.message,
      'Course not found.',
      'Must return "Course not found."'
    );
  });
});
