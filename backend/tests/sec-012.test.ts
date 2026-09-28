import { describe, it } from 'node:test';
import assert from 'node:assert';
import { authService } from '../src/modules/auth/auth.service';
import { adminAuthService } from '../src/modules/admin/admin.auth.service';
import prisma from '../src/config/database';
import { hashPassword } from '../src/utils/hasher';

describe('SEC-012 & BUG-004: Strict Admin Login Isolation and Mandatory Security Passphrase', () => {
  it('must NOT return adminToken when logging in via student authService.login', async () => {
    let err: any = null;
    try {
      await authService.login({
        email: 'admin@studysync.com',
        password: 'AdminPassword123!',
      });
    } catch (e: any) {
      err = e;
    }

    // Either user not found or regular student invalid credentials, but NEVER adminToken
    assert.ok(err, 'Student login for admin email must not succeed without student account');
    assert.strictEqual(err.statusCode, 401);
  });

  it('must REJECT admin login if securityPassphrase is missing (hard failure)', async () => {
    const adminId = crypto.randomUUID();
    const passwordHash = await hashPassword('StrongPassword123!');
    const passphraseHash = await hashPassword('SecurePassphrase999!');

    await prisma.adminAccount.create({
      data: {
        id: adminId,
        username: `admin_sec012_${Date.now()}`,
        email: `admin-sec012-${Date.now()}@studysync.com`,
        passwordHash,
        securityPassphrase: passphraseHash,
        fullName: 'Admin Test',
        role: 'superadmin',
        isActive: true,
      } as any,
    });

    let err: any = null;
    try {
      await adminAuthService.login({
        identifier: `admin-sec012-${Date.now()}@studysync.com`,
        password: 'StrongPassword123!',
        // securityPassphrase omitted!
      } as any);
    } catch (e: any) {
      err = e;
    }

    assert.ok(err, 'Admin login without securityPassphrase must throw');
    assert.strictEqual(err.statusCode, 401);
    assert.ok(err.message.includes('passphrase is required') || err.message.includes('Invalid admin'));
  });
});
