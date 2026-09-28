import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileTools } from '../src/modules/ai/tools/file.tools';

describe('AGENT-002: bash_tool Execution Bounds, Memory Cap, Output Cap, and Timeout Kill', () => {
  const testCourseId = 'agent002_test_course';

  it('must terminate timed-out processes promptly with process kill', async () => {
    const sleepCmd = process.platform === 'win32'
      ? 'node -e "setTimeout(() => console.log(\'done\'), 4000)"'
      : 'sleep 4';

    const start = Date.now();
    const res = await fileTools.bashTool(testCourseId, sleepCmd, 400);
    const duration = Date.now() - start;

    assert.strictEqual(res.success, false);
    assert.ok(
      duration < 2000,
      `Command must be killed promptly on timeout (took ${duration}ms)`
    );
  });

  it('must enforce output size cap of 256KB and reject buffer overruns', async () => {
    // Generate 500KB of output (exceeding 256KB maxBuffer)
    const largeOutputCmd = 'node -e "process.stdout.write(\'A\'.repeat(500 * 1024))"';
    const res = await fileTools.bashTool(testCourseId, largeOutputCmd);

    assert.strictEqual(res.success, false);
    assert.ok(
      res.error?.includes('maxBuffer') || (res.stderr && res.stderr.length > 0) || res.exitCode !== 0,
      'Buffer overrun must be caught and rejected'
    );
  });

  it('must allow commands producing output within the 256KB limit', async () => {
    const safeOutputCmd = 'node -e "process.stdout.write(\'B\'.repeat(32 * 1024))"'; // 32KB
    const res = await fileTools.bashTool(testCourseId, safeOutputCmd);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stdout?.length, 32 * 1024);
  });
});
