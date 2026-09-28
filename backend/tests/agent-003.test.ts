import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { resolveSafePath, getCourseWorkspaceDir, fileTools } from '../src/modules/ai/tools/file.tools';

describe('AGENT-003: resolveSafePath Sibling Prefix & Symlink Containment', () => {
  const courseAlpha = 'agent003_course_alpha';
  const courseAlphaExtended = 'agent003_course_alpha_extended';

  it('must REJECT sibling prefix collision where folder name starts with same prefix', async () => {
    const wsAlpha = getCourseWorkspaceDir(courseAlpha);
    const wsExt = getCourseWorkspaceDir(courseAlphaExtended);

    // Put a secret in the extended directory
    const secretFile = path.join(wsExt, 'confidential_exam.txt');
    fs.writeFileSync(secretFile, 'TOP_SECRET_EXAM_PAPER', 'utf-8');

    // Attempt to access from courseAlpha using relative traversal
    const siblingRelative = `../${path.basename(wsExt)}/confidential_exam.txt`;

    let errorThrown = false;
    try {
      resolveSafePath(courseAlpha, siblingRelative);
    } catch (err: any) {
      errorThrown = true;
      assert.ok(err.message.includes('Access denied'));
    }

    assert.strictEqual(
      errorThrown,
      true,
      'resolveSafePath must throw on sibling directory prefix collision'
    );

    // Also verify via fileTools.view
    const viewRes = await fileTools.view(courseAlpha, siblingRelative);
    assert.strictEqual(viewRes.success, false);
    assert.ok(viewRes.error?.includes('Access denied'));
  });

  it('must REJECT directory traversal escaping via ../', async () => {
    let errorThrown = false;
    try {
      resolveSafePath(courseAlpha, '../../package.json');
    } catch (err: any) {
      errorThrown = true;
      assert.ok(err.message.includes('Access denied'));
    }
    assert.strictEqual(errorThrown, true);
  });

  it('must REJECT symlinks pointing outside the workspace directory', () => {
    const wsAlpha = getCourseWorkspaceDir(courseAlpha);
    const outsideTarget = path.resolve(wsAlpha, '..', 'agent003_outside_secret.txt');
    fs.writeFileSync(outsideTarget, 'OUTSIDE_WORKSPACE_SECRET', 'utf-8');

    const symlinkPath = path.join(wsAlpha, 'symlink_escape.txt');
    try {
      if (fs.existsSync(symlinkPath)) fs.unlinkSync(symlinkPath);
      try {
        fs.symlinkSync(outsideTarget, symlinkPath);
      } catch {
        fs.symlinkSync(outsideTarget, symlinkPath, 'file');
      }
    } catch {
      // If OS environment does not permit creating symlinks without elevation, skip symlink creation check
      return;
    }

    let errorThrown = false;
    try {
      resolveSafePath(courseAlpha, 'symlink_escape.txt');
    } catch (err: any) {
      errorThrown = true;
      assert.ok(err.message.includes('Access denied'));
    }

    assert.strictEqual(
      errorThrown,
      true,
      'resolveSafePath must reject symlinks pointing outside workspace'
    );
  });

  it('must ALLOW valid safe paths inside workspace directory', () => {
    const safeFile = resolveSafePath(courseAlpha, 'study_guide.txt');
    const wsAlpha = getCourseWorkspaceDir(courseAlpha);
    const realWs = fs.realpathSync(wsAlpha);
    assert.ok(safeFile.startsWith(realWs));
  });
});
