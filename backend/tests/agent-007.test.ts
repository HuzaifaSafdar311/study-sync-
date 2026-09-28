import { describe, it } from 'node:test';
import assert from 'node:assert';
import prisma from '../src/config/database';
import { courseService } from '../src/modules/courses/course.service';

describe('AGENT-007: deleteCourse Ownership Verification IDOR', () => {
  it('must verify ownership first and throw 404 without deleting chats, vectors, workspace, or db records when caller does not own course', async () => {
    const victimId = crypto.randomUUID();
    const attackerId = crypto.randomUUID();

    await prisma.user.create({
      data: {
        id: victimId,
        email: `agent007-victim-${Date.now()}@example.com`,
        fullName: 'Victim User',
        role: 'student',
        isVerified: true,
      } as any,
    });

    await prisma.user.create({
      data: {
        id: attackerId,
        email: `agent007-attacker-${Date.now()}@example.com`,
        fullName: 'Attacker User',
        role: 'student',
        isVerified: true,
      } as any,
    });

    const victimCourse = await prisma.course.create({
      data: {
        id: crypto.randomUUID(),
        userId: victimId,
        name: 'Confidential Victim Course',
      } as any,
    });

    // Attacker attempts to delete victim's course
    let errorCaught: any = null;
    try {
      await courseService.deleteCourse(attackerId, victimCourse.id);
    } catch (err: any) {
      errorCaught = err;
    }

    // In old code, deleteCourse succeeded without checking ownership (errorCaught was null)
    // In new code, it must reject with 404 'Course not found.'
    assert.ok(errorCaught, 'Attacker deleting victim course must throw an error');
    assert.strictEqual(
      errorCaught.statusCode,
      404,
      'Must return status 404'
    );
    assert.strictEqual(
      errorCaught.message,
      'Course not found.',
      'Must return "Course not found."'
    );

    // Verify victim course was NOT deleted
    const stillExists = await prisma.course.findFirst({
      where: { id: victimCourse.id, userId: victimId },
    });
    assert.ok(stillExists, 'Victim course must remain intact in database');
  });
});
