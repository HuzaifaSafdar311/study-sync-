import crypto from 'crypto';
import { config } from '../config';

/**
 * Military-grade AES-256-GCM Encryption Utility for User BYOK API Keys.
 * Provides confidentiality (256-bit encryption) and integrity (Auth Tag verification).
 */

export interface EncryptedPayload {
  encryptedData: string; // hex
  iv: string;            // hex (16 bytes)
  authTag: string;       // hex (16 bytes)
}

export interface DecryptResult {
  decryptedKey: string;
  isMigrated: boolean;
  reEncrypted?: EncryptedPayload;
}

// Derive primary 32-byte key from environment
function getPrimaryMasterKey(): Buffer {
  const rawSecret = process.env.BYOK_ENCRYPTION_SECRET?.trim()
    || process.env.ENCRYPTION_MASTER_KEY?.trim()
    || config.jwt.accessSecret
    || 'studysync_enterprise_master_key_default_32b!';
  return crypto.createHash('sha256').update(rawSecret).digest();
}

// Derive legacy/fallback keys to ensure stored keys survive migrations
function getFallbackKeys(): Buffer[] {
  const keys: Buffer[] = [];
  const primarySecret = process.env.BYOK_ENCRYPTION_SECRET?.trim();

  if (process.env.ENCRYPTION_MASTER_KEY?.trim() && process.env.ENCRYPTION_MASTER_KEY.trim() !== primarySecret) {
    keys.push(crypto.createHash('sha256').update(process.env.ENCRYPTION_MASTER_KEY.trim()).digest());
  }

  if (config?.jwt?.accessSecret && config.jwt.accessSecret !== primarySecret) {
    keys.push(crypto.createHash('sha256').update(config.jwt.accessSecret).digest());
  }

  const legacyDefault = 'studysync_enterprise_master_key_default_32b!';
  if (legacyDefault !== primarySecret) {
    keys.push(crypto.createHash('sha256').update(legacyDefault).digest());
  }

  return keys;
}

/**
 * Encrypts an API key string using AES-256-GCM with a unique 16-byte random IV.
 */
export function encryptApiKey(plainKey: string): EncryptedPayload {
  if (!plainKey || typeof plainKey !== 'string') {
    throw new Error('API key to encrypt must be a non-empty string.');
  }

  const key = getPrimaryMasterKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload back to the plain API key string.
 * Supports transparent fallback to legacy keys and produces a re-encrypted payload if migrated.
 */
export function decryptApiKeyWithReEncrypt(encryptedData: string, iv: string, authTag: string): DecryptResult {
  if (!encryptedData || !iv || !authTag) {
    throw new Error('Invalid encrypted payload: missing encryptedData, iv, or authTag.');
  }

  const ivBuf = Buffer.from(iv, 'hex');
  const tagBuf = Buffer.from(authTag, 'hex');

  // 1. Attempt decryption using primary master key
  const primaryKey = getPrimaryMasterKey();
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', primaryKey, ivBuf);
    decipher.setAuthTag(tagBuf);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return { decryptedKey: decrypted, isMigrated: false };
  } catch {
    // 2. Attempt decryption using fallback keys (e.g., prior to secret rotation)
    const fallbackKeys = getFallbackKeys();
    for (const fbKey of fallbackKeys) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', fbKey, ivBuf);
        decipher.setAuthTag(tagBuf);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        // Legacy key succeeded — re-encrypt using active primary key for persistence
        const reEncrypted = encryptApiKey(decrypted);
        return {
          decryptedKey: decrypted,
          isMigrated: true,
          reEncrypted,
        };
      } catch {
        // Continue to next fallback
      }
    }

    throw new Error('Failed to decrypt API key: invalid ciphertext, auth tag, or unknown encryption key.');
  }
}

/**
 * Standard decryption wrapper returning just the decrypted plaintext key.
 */
export function decryptApiKey(encryptedData: string, iv: string, authTag: string): string {
  return decryptApiKeyWithReEncrypt(encryptedData, iv, authTag).decryptedKey;
}

/**
 * Generates a safe masked preview of an API key for display on the frontend.
 * Never leaks the full key secret.
 * Example: "AIzaSy...4X9Q" or "sk-proj...7b9Z"
 */
export function maskApiKey(plainKey: string): string {
  if (!plainKey) return '••••••••';
  const trimmed = plainKey.trim();
  if (trimmed.length <= 8) return '••••••••';
  if (trimmed.startsWith('sk-proj-')) {
    return `sk-proj-...${trimmed.slice(-4)}`;
  }
  if (trimmed.startsWith('gsk_')) {
    return `gsk_...${trimmed.slice(-4)}`;
  }
  const prefix = trimmed.slice(0, 6);
  const suffix = trimmed.slice(-4);
  return `${prefix}...${suffix}`;
}
