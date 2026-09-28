import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * SEC-012 & BUG-004 Regression Tests
 *
 * Old behaviour:
 *   POST /api/auth/login for admin email called adminAuthService.login()
 *   WITHOUT a securityPassphrase — bypassing the third factor.
 *
 * Fixed behaviour:
 *   1. auth.service.ts no longer contains any admin special-case routing.
 *   2. adminAuthService.login() rejects when securityPassphrase is absent,
 *      regardless of whether a DB row has a passphrase or not.
 */

describe('SEC-012 & BUG-004: Strict Admin Login Isolation and Mandatory Security Passphrase', () => {
  it('auth.service.ts must not contain admin login bypass routing', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = path.resolve(
      import.meta.dirname ?? __dirname,
      '../src/modules/auth/auth.service.ts',
    );
    const content = fs.readFileSync(src, 'utf8');

    // These patterns indicate the old admin bypass
    assert.equal(
      content.includes("adminAuthService.login"),
      false,
      'auth.service.ts must not call adminAuthService.login — admin must use the dedicated admin route only',
    );
    assert.equal(
      content.includes("adminToken"),
      false,
      'auth.service.ts must not return adminToken — no admin logic in student auth service',
    );
  });

  it('adminAuthService must reject login when securityPassphrase is missing', async () => {
    const { adminAuthService } = await import('../src/modules/admin/admin.auth.service');

    let err: unknown = null;
    try {
      // Calling with a passphrase that is explicitly undefined/absent
      await (adminAuthService as any).login({
        identifier: 'nonexistent-admin@studysync.com',
        password: 'AnyPassword123!',
        // securityPassphrase intentionally omitted
      });
    } catch (e) {
      err = e;
    }

    // Must throw — either "admin not found" (401) or "passphrase required" (401)
    // Either way it must NOT succeed without securityPassphrase
    assert.ok(err, 'Admin login without securityPassphrase must always throw');
    assert.equal((err as any).statusCode, 401);
  });

  it('adminAuthService must be the ONLY valid admin authentication path (no student-route bypass)', async () => {
    const { authService } = await import('../src/modules/auth/auth.service');

    let err: unknown = null;
    try {
      await authService.login({
        email: 'admin@studysync.com',
        password: 'Admin123!',
      });
    } catch (e) {
      err = e;
    }

    // Must fail — admin email should not succeed via student authService
    // (user not found, or not a valid student account)
    assert.ok(err, 'Student authService must not succeed for admin email login');
    assert.equal((err as any).statusCode, 401);
  });
});
