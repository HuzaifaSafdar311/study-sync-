import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('SEC-014: No Redundant Bare-Path Route Dual-Mounting in server.ts', () => {
  it('server.ts must not mount routers directly on bare root paths without /api prefix', () => {
    const serverPath = path.resolve(__dirname, '../src/server.ts');
    const content = fs.readFileSync(serverPath, 'utf8');

    const bareMounts = [
      "app.use('/auth',",
      "app.use('/tasks',",
      "app.use('/voice',",
      "app.use('/notifications',",
      "app.use('/courses',",
      "app.use('/whatsapp',",
      "app.use('/user/keys',",
      "app.use('/admin',",
      "app.use('/tools',",
    ];

    for (const bare of bareMounts) {
      assert.strictEqual(
        content.includes(bare),
        false,
        `server.ts must not contain bare-path mount: ${bare}`
      );
    }

    // Verify all primary routes remain mounted with /api prefix
    const apiMounts = [
      "app.use('/api/auth',",
      "app.use('/api/tasks',",
      "app.use('/api/voice',",
      "app.use('/api/notifications',",
      "app.use('/api/courses',",
      "app.use('/api/whatsapp',",
      "app.use('/api/user/keys',",
      "app.use('/api/admin',",
      "app.use('/api/tools',",
    ];

    for (const api of apiMounts) {
      assert.strictEqual(
        content.includes(api),
        true,
        `server.ts must contain API mount: ${api}`
      );
    }
  });
});
