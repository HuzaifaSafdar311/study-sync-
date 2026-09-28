import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hashPassword } from '../src/utils/hasher';
import { adminAuthService } from '../src/modules/admin/admin.auth.service';

describe('SEC-017: Admin Security Passphrase Argon2id Hashing & Constant-Time Verification', () => {
  it('should support Argon2id hashed securityPassphrase on admin login', async () => {
    // In old code, admin.auth.service line 69 did:
    // securityPassphrase.trim() !== account.securityPassphrase.trim()
    // It could NOT verify Argon2id hashed passphrases!
    const passphrasePlain = 'SuperSecretPassphrase!2026';
    const passphraseHash = await hashPassword(passphrasePlain);

    // Call verifyPassphrase or test the service with hashed passphrase
    const { verifyPassphrase } = await import('../src/modules/admin/admin.auth.service');
    assert.ok(typeof verifyPassphrase === 'function', 'verifyPassphrase function must be exported');

    const result = await verifyPassphrase(passphraseHash, passphrasePlain);
    assert.strictEqual(result.valid, true, 'Argon2id hashed passphrase must verify correctly');
    assert.strictEqual(result.needsRehash, false);

    const wrongResult = await verifyPassphrase(passphraseHash, 'WrongPassphrase');
    assert.strictEqual(wrongResult.valid, false, 'Invalid passphrase must fail');
  });

  it('should verify legacy plaintext passphrases with constant-time equality and flag for rehash', async () => {
    const { verifyPassphrase } = await import('../src/modules/admin/admin.auth.service');
    const legacyPlaintext = 'OldPlaintextPassphrase999';

    const result = await verifyPassphrase(legacyPlaintext, legacyPlaintext);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.needsRehash, true, 'Legacy plaintext must be flagged for re-hashing to Argon2id');

    const wrongResult = await verifyPassphrase(legacyPlaintext, 'WrongPlaintext');
    assert.strictEqual(wrongResult.valid, false);
  });
});
