import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * SEC-013 Regression — Hardcoded email domain role override removed.
 *
 * Old code:
 *   if (user.email && user.email.toLowerCase().includes('arham.solution.me')) {
 *     user.role = 'student';
 *   }
 *
 * That block is gone. This test confirms the service module no longer contains
 * the string 'arham.solution.me' anywhere in its source.
 */
describe('SEC-013: No hardcoded email-domain role override', () => {
  it('auth.service.ts must not contain the arham.solution.me hardcoded domain override', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = path.resolve(import.meta.dirname ?? __dirname, '../src/modules/auth/auth.service.ts');
    const content = fs.readFileSync(src, 'utf8');
    assert.equal(
      content.includes('arham.solution.me'),
      false,
      'Hardcoded email domain role override must be removed from auth.service.ts',
    );
  });

  it('no file in src/ must override user.role based on email domain string matching', async () => {
    const { execSync } = await import('node:child_process');
    let output = '';
    try {
      output = execSync('grep -r "arham.solution.me" src/', {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
    } catch {
      // grep returns exit code 1 when no matches — that's the success condition
      output = '';
    }
    assert.equal(
      output.trim(),
      '',
      `'arham.solution.me' must not appear in any source file, found: ${output.trim()}`,
    );
  });
});
