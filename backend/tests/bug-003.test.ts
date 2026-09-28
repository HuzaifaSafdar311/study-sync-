import { describe, it } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { authGuard, AuthRequest } from '../src/middleware/authGuard';
import { courseService } from '../src/modules/courses/course.service';
import prisma from '../src/config/database';

describe('BUG-003: Remove personal-user fallback and reject tokens with no userId', () => {
  it('authGuard must reject any token with no userId claim with 401', async () => {
    // Generate valid JWT signed with correct secret, but omitting userId claim
    const tokenWithoutUserId = jwt.sign({ role: 'student' }, config.jwt.accessSecret, {
      expiresIn: '15m',
    });

    const req: any = {
      headers: { authorization: `Bearer ${tokenWithoutUserId}` },
      cookies: {},
    };

    let statusCode: number | null = null;
    let jsonBody: any = null;
    let nextCalled = false;

    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        jsonBody = body;
        return this;
      },
    };

    const next = () => {
      nextCalled = true;
    };

    await authGuard(req as AuthRequest, res, next);

    // In old code: nextCalled was TRUE (token without userId was accepted and req.userId was undefined)
    // In new code: must reject with 401 and error message
    assert.strictEqual(nextCalled, false, 'authGuard must not call next() for token without userId claim');
    assert.strictEqual(statusCode, 401, 'Must reject with 401');
    assert.strictEqual(jsonBody?.success, false);
    assert.strictEqual(jsonBody?.message, 'Invalid token: missing userId claim.');
  });

  it('getCourses must not return other users courses when given personal-user', async () => {
    const realUserId = crypto.randomUUID();
    await prisma.user.create({
      data: {
        id: realUserId,
        email: `bug003-owner-${Date.now()}@example.com`,
        fullName: 'Real User',
        role: 'student',
        isVerified: true,
      } as any,
    });

    const realUserCourse = await prisma.course.create({
      data: {
        id: crypto.randomUUID(),
        userId: realUserId,
        name: 'Private Course for Real User Only',
      } as any,
    });

    const coursesForPersonal = await courseService.getCourses('personal-user');
    const leaked = coursesForPersonal.some((c: any) => c.id === realUserCourse.id);

    // In old code, leaked was TRUE because getCourses fell back to findMany() returning all courses!
    // In new code, leaked must be FALSE.
    assert.strictEqual(leaked, false, 'getCourses must never return other users courses');
  });
});
