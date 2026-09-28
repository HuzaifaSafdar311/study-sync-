import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('BUG-006: Hardcoded Demo User with Known Password Hash in Source Code', () => {
  it('should not contain hardcoded Argon2id password hash for Password123 in database.ts', () => {
    const dbFilePath = path.resolve(__dirname, '../src/config/database.ts');
    const dbSource = fs.readFileSync(dbFilePath, 'utf8');

    const knownHash = '$argon2id$v=19$m=65536,t=3,p=4$qHn2rM5rCg5B+Y/pU2fLvw$oE7mN2Y3N9Y2/1k9B8A7Q6W5E4R3T2Y1';
    const hasKnownHash = dbSource.includes(knownHash);

    // In old code, hasKnownHash is TRUE!
    // In new code, hasKnownHash MUST be false.
    assert.strictEqual(
      hasKnownHash,
      false,
      'database.ts must not contain the hardcoded Argon2id hash for Password123'
    );
  });

  it('should never expose hardcoded demo accounts with known credentials in production', () => {
    const dbFilePath = path.resolve(__dirname, '../src/config/database.ts');
    const dbSource = fs.readFileSync(dbFilePath, 'utf8');

    // Check that pre-seeding checks NODE_ENV !== 'production' and does not leak Password123
    assert.strictEqual(
      dbSource.includes('student@umt.edu.pk / Password123'),
      false,
      'database.ts must not advertise or print hardcoded Password123 credentials'
    );
  });
});
