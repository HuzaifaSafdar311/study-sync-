import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('BUG-001: No Duplicate Routes in course.routes.ts', () => {
  it('course.routes.ts must not have duplicate GET /:id/tasks definitions', () => {
    const filePath = path.resolve(__dirname, '../src/modules/courses/course.routes.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    // Count occurrences of router.get('/:id/tasks'
    const matches = content.match(/router\.get\(\s*['"]\/:id\/tasks['"]/g);
    assert.strictEqual(
      matches ? matches.length : 0,
      1,
      'There must be exactly one GET /:id/tasks route handler defined'
    );
  });
});
