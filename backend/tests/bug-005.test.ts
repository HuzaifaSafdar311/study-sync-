import { describe, it } from 'node:test';
import assert from 'node:assert';
import { authService } from '../src/modules/auth/auth.service';
import { toSafeUser } from '../src/utils/safeUser';
import prisma from '../src/config/database';
import { hashPassword } from '../src/utils/hasher';

function scanForForbiddenKeys(obj: any, path: string = ''): string[] {
  const violations: string[] = [];
  if (!obj || typeof obj !== 'object') return violations;

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (key === 'passwordHash') {
      violations.push(`Found forbidden key "${key}" at ${currentPath}`);
    }
    // refreshToken must never leak in the user profile or payload
    if (key === 'refreshToken' && path.includes('user')) {
      violations.push(`Found forbidden key "${key}" inside user object at ${currentPath}`);
    }
    if (value && typeof value === 'object') {
      violations.push(...scanForForbiddenKeys(value, currentPath));
    }
  }
  return violations;
}

describe('BUG-005: Never Return refreshToken or passwordHash from Auth and User Endpoints', () => {
  it('toSafeUser utility must strip passwordHash, refreshToken, and OTP codes', () => {
    const rawUser = {
      id: 'user-123',
      email: 'student@example.com',
      fullName: 'Test Student',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakeHash',
      refreshToken: '$argon2id$v=19$m=65536,t=3,p=4$fakeRefreshHash',
      verificationOtp: '$argon2id$fakeOtp',
      otpExpiresAt: new Date(),
      role: 'student',
    };

    const safe = toSafeUser(rawUser);
    assert.strictEqual((safe as any).passwordHash, undefined, 'passwordHash must be stripped');
    assert.strictEqual((safe as any).refreshToken, undefined, 'refreshToken must be stripped');
    assert.strictEqual((safe as any).verificationOtp, undefined, 'verificationOtp must be stripped');
    assert.strictEqual((safe as any).otpExpiresAt, undefined, 'otpExpiresAt must be stripped');
    assert.strictEqual(safe?.id, 'user-123');
    assert.strictEqual(safe?.email, 'student@example.com');
  });

  it('should not leak refreshToken or passwordHash in authService.login user response', async () => {
    const testEmail = `bug005-${Date.now()}@example.com`;
    const password = 'TestSecurePassword123!';
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        email: testEmail,
        fullName: 'Bug 005 User',
        passwordHash,
        role: 'student',
        isVerified: true,
      } as any,
    });

    const result = await authService.login({
      email: testEmail,
      password: password,
    });

    assert.ok(result, 'Login must succeed');
    assert.ok(result.user, 'User object must be returned');

    const violations = scanForForbiddenKeys(result);
    assert.strictEqual(
      violations.length,
      0,
      `Response contains forbidden sensitive fields: ${violations.join(', ')}`
    );
  });
});
