import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('SEC-015: Content Security Policy Not Disabled in Development', () => {
  it('server.ts must not disable contentSecurityPolicy in development', () => {
    const serverPath = path.resolve(__dirname, '../src/server.ts');
    const content = fs.readFileSync(serverPath, 'utf8');

    // The vulnerability pattern was: contentSecurityPolicy: config.isDev ? false : undefined
    assert.strictEqual(
      content.includes('contentSecurityPolicy: config.isDev ? false : undefined'),
      false,
      'server.ts must not completely disable CSP in development'
    );

    // SEC-015 fix requires reportOnly in dev
    assert.strictEqual(
      content.includes('reportOnly: true'),
      true,
      'server.ts must configure CSP with reportOnly: true in development'
    );
  });
});
