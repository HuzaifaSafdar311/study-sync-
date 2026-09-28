import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('SEC-016: Warning Logged on DB Blocked-User Check Failure in AuthGuard', () => {
  it('authGuard.ts must log a warning with userId when DB check fails open', () => {
    const authGuardPath = path.resolve(__dirname, '../src/middleware/authGuard.ts');
    const content = fs.readFileSync(authGuardPath, 'utf8');

    // The vulnerability was: silently swallowing catch block with no logging
    // Required fix: console.warn with clear identifier and decoded.userId
    assert.strictEqual(
      content.includes('[AuthGuard] DB blocked-user check failed — failing open for userId:'),
      true,
      'authGuard must log a warning alerting operators when DB blocked-user check fails open'
    );
  });
});
