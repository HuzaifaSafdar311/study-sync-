import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

describe('SEC-007: Cryptographically Secure OTP Generation', () => {
  it('must generate 6-digit numeric OTPs within [100000, 999999] using crypto.randomInt', () => {
    for (let i = 0; i < 100; i++) {
      const otp = crypto.randomInt(100000, 1000000).toString();
      assert.strictEqual(otp.length, 6);
      const num = parseInt(otp, 10);
      assert.ok(num >= 100000 && num <= 999999);
    }
  });
});
