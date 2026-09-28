import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isOriginAllowed } from '../src/config/cors';

describe('SEC-010: Explicit CORS Origin Allowlist From Environment', () => {
  it('must REJECT arbitrary *.vercel.app subdomains (e.g. attacker-subdomain.vercel.app)', () => {
    assert.strictEqual(isOriginAllowed('https://malicious-phishing-site.vercel.app'), false);
    assert.strictEqual(isOriginAllowed('https://attacker.vercel.app'), false);
  });

  it('must REJECT arbitrary domains containing localhost as substring', () => {
    assert.strictEqual(isOriginAllowed('http://localhost.evil.com'), false);
    assert.strictEqual(isOriginAllowed('http://evil-localhost:8080'), false);
  });

  it('must ALLOW configured env origins (e.g. from ALLOWED_ORIGINS) and default localhost', () => {
    const originalEnv = process.env.ALLOWED_ORIGINS;
    try {
      process.env.ALLOWED_ORIGINS = 'https://studysync-tan.vercel.app,https://custom-production.app';
      assert.strictEqual(isOriginAllowed('https://studysync-tan.vercel.app'), true);
      assert.strictEqual(isOriginAllowed('https://custom-production.app'), true);
      assert.strictEqual(isOriginAllowed('http://localhost:5173'), true);
      assert.strictEqual(isOriginAllowed('http://localhost:3000'), true);
      assert.strictEqual(isOriginAllowed(undefined), true);
    } finally {
      process.env.ALLOWED_ORIGINS = originalEnv;
    }
  });
});
