import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { encryptApiKey, decryptApiKey, decryptApiKeyWithReEncrypt } from '../src/utils/encryption';
import { validateStartupEnv } from '../src/config';

describe('SEC-001: BYOK Master Key and Fallback Decryption', () => {
  it('should read BYOK_ENCRYPTION_SECRET environment variable', () => {
    process.env.BYOK_ENCRYPTION_SECRET = 'my_new_super_secret_byok_key_2026';
    delete process.env.ENCRYPTION_MASTER_KEY;

    // Encrypt with new env set
    const encrypted = encryptApiKey('sk-ant-test-api-key-12345');
    assert.ok(encrypted.encryptedData);

    // Decrypt must work with BYOK_ENCRYPTION_SECRET
    const decrypted = decryptApiKey(encrypted.encryptedData, encrypted.iv, encrypted.authTag);
    assert.strictEqual(decrypted, 'sk-ant-test-api-key-12345');
  });

  it('should fall back to old secret if data was encrypted with old key and produce reEncrypted payload', () => {
    // Encrypt something directly with old fallback key
    const oldSecret = 'studysync_enterprise_master_key_default_32b!';
    const oldKey = crypto.createHash('sha256').update(oldSecret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', oldKey, iv);
    let enc = cipher.update('sk-ant-legacy-key-99999', 'utf8', 'hex');
    enc += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    // Set BYOK_ENCRYPTION_SECRET to a new distinct key
    process.env.BYOK_ENCRYPTION_SECRET = 'new_distinct_master_key_for_test';

    // Must still decrypt using fallback and trigger migration
    const result = decryptApiKeyWithReEncrypt(enc, iv.toString('hex'), tag);
    assert.strictEqual(result.decryptedKey, 'sk-ant-legacy-key-99999');
    assert.strictEqual(result.isMigrated, true);
    assert.ok(result.reEncrypted);

    // Verify reEncrypted payload can be decrypted with new primary key
    const reDecrypted = decryptApiKey(result.reEncrypted.encryptedData, result.reEncrypted.iv, result.reEncrypted.authTag);
    assert.strictEqual(reDecrypted, 'sk-ant-legacy-key-99999');
  });

  it('should refuse to start in production if master key is missing', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalByok = process.env.BYOK_ENCRYPTION_SECRET;
    const originalMaster = process.env.ENCRYPTION_MASTER_KEY;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.BYOK_ENCRYPTION_SECRET;
      delete process.env.ENCRYPTION_MASTER_KEY;

      assert.throws(
        () => {
          validateStartupEnv();
        },
        /Missing required environment variables:.*BYOK_ENCRYPTION_SECRET/
      );
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalByok) process.env.BYOK_ENCRYPTION_SECRET = originalByok;
      if (originalMaster) process.env.ENCRYPTION_MASTER_KEY = originalMaster;
    }
  });
});
