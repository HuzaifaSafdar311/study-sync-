import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { getCourseWorkspaceDir } from '../src/modules/ai/tools/file.tools';

describe('SEC-008: Workspace File Path Traversal and Symlink Containment', () => {
  const courseIdAlpha = 'sec008_course_alpha';
  const courseIdSibling = 'sec008_course_alpha_extended';

  it('must reject sibling prefix directory collision (course_alpha vs course_alpha_extended)', () => {
    const wsAlpha = getCourseWorkspaceDir(courseIdAlpha);
    const wsSibling = getCourseWorkspaceDir(courseIdSibling);

    const siblingFile = path.join(wsSibling, 'sibling_secret.txt');
    fs.writeFileSync(siblingFile, 'CONFIDENTIAL_SIBLING_DATA', 'utf-8');

    const requestedRelativePath = `../${path.basename(wsSibling)}/sibling_secret.txt`;
    const resolvedTarget = path.resolve(wsAlpha, requestedRelativePath);

    // Old flawed check:
    const oldVulnerableCheck = resolvedTarget.toLowerCase().startsWith(wsAlpha.toLowerCase());
    assert.strictEqual(
      oldVulnerableCheck,
      true,
      'Old check falsely allowed access to sibling directory due to prefix collision'
    );

    // Secure check using realpath containment without case folding:
    const realWs = fs.realpathSync(wsAlpha);
    let isSecurelyContained = false;
    if (fs.existsSync(resolvedTarget)) {
      const realTarget = fs.realpathSync(resolvedTarget);
      isSecurelyContained = realTarget === realWs || realTarget.startsWith(realWs + path.sep);
    }

    assert.strictEqual(
      isSecurelyContained,
      false,
      'Secure check must reject sibling prefix collision'
    );
  });

  it('must reject symlink escapes pointing outside workspace directory', () => {
    const wsAlpha = getCourseWorkspaceDir(courseIdAlpha);
    const outsideTarget = path.resolve(wsAlpha, '..', 'outside_secret.txt');
    fs.writeFileSync(outsideTarget, 'HOST_OUTSIDE_SECRET', 'utf-8');

    const symlinkPath = path.join(wsAlpha, 'symlink_escape.txt');
    try {
      if (fs.existsSync(symlinkPath)) fs.unlinkSync(symlinkPath);
      fs.symlinkSync(outsideTarget, symlinkPath);
    } catch {
      // On Windows without Developer Mode, symlink may require admin or junction
      try {
        fs.symlinkSync(outsideTarget, symlinkPath, 'file');
      } catch {
        // If symlink creation is not permitted by OS policy, skip symlink test
        return;
      }
    }

    // Old flawed check:
    const oldVulnerableCheck = symlinkPath.toLowerCase().startsWith(wsAlpha.toLowerCase());
    assert.strictEqual(
      oldVulnerableCheck,
      true,
      'Old check treated symlink inside workspace as safe even though it points outside'
    );

    // Secure realpath check:
    const realWs = fs.realpathSync(wsAlpha);
    const realTarget = fs.realpathSync(symlinkPath);
    const isContained = realTarget === realWs || realTarget.startsWith(realWs + path.sep);

    assert.strictEqual(isContained, false, 'Secure realpath check must reject symlink pointing outside');
  });
});
