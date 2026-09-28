import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileTools, getCourseWorkspaceDir } from '../src/modules/ai/tools/file.tools';

describe('AGENT-001: bash_tool Environment Isolation & Production Sandbox Gating', () => {
  const testCourseId = 'agent001_test_course';

  it('must NOT leak host process.env secrets into executed commands', async () => {
    process.env.AGENT001_SECRET_TOKEN = 'secret_token_never_leak_98765';

    const cmd = 'node -e "const e = process[\'e\'+\'nv\']; console.log(e.AGENT001_SECRET_TOKEN || \'UNDEFINED_SECRET\')"';
    const res = await fileTools.bashTool(testCourseId, cmd);

    assert.strictEqual(res.success, true);
    assert.strictEqual(
      res.stdout,
      'UNDEFINED_SECRET',
      'Host environment secrets must NOT be visible inside child process'
    );
  });

  it('must disable bash_tool in production unless BASH_TOOL_ENABLED=true', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalBashFlag = process.env.BASH_TOOL_ENABLED;

    try {
      process.env.NODE_ENV = 'production';
      process.env.BASH_TOOL_ENABLED = 'false';

      const res = await fileTools.bashTool(testCourseId, 'node -v');
      assert.strictEqual(res.success, false);
      assert.ok(
        res.error?.includes('disabled in production') || res.error?.includes('BASH_TOOL_ENABLED'),
        'Must reject execution in production when BASH_TOOL_ENABLED is false'
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalBashFlag !== undefined) {
        process.env.BASH_TOOL_ENABLED = originalBashFlag;
      } else {
        delete process.env.BASH_TOOL_ENABLED;
      }
    }
  });

  it('must allow bash_tool execution when BASH_TOOL_ENABLED=true even in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalBashFlag = process.env.BASH_TOOL_ENABLED;

    try {
      process.env.NODE_ENV = 'production';
      process.env.BASH_TOOL_ENABLED = 'true';

      const res = await fileTools.bashTool(testCourseId, 'node -e "console.log(\'sandbox-ok\')"');
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.stdout, 'sandbox-ok');
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalBashFlag !== undefined) {
        process.env.BASH_TOOL_ENABLED = originalBashFlag;
      } else {
        delete process.env.BASH_TOOL_ENABLED;
      }
    }
  });
});
