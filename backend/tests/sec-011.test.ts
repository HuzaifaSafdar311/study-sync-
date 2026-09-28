import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

describe('SEC-011: OTP Timing Attack Mitigation with Constant-Time Comparison', () => {
  it('must return true for identical strings using timingSafeEqual', () => {
    assert.strictEqual(constantTimeEqual('123456', '123456'), true);
    assert.strictEqual(constantTimeEqual('998877', '998877'), true);
  });

  it('must return false for mismatched strings without leaking timing or throwing on length mismatch', () => {
    assert.strictEqual(constantTimeEqual('123456', '123457'), false);
    assert.strictEqual(constantTimeEqual('123456', '12345'), false);
    assert.strictEqual(constantTimeEqual('123456', '1234567'), false);
  });
});
