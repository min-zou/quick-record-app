import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePath, normalizeSettings } from '../src/github.js';

test('github settings default branch and root path', () => {
  const settings = normalizeSettings({
    owner: '  octo ',
    repo: ' notes ',
    token: ' token '
  });

  assert.equal(settings.owner, 'octo');
  assert.equal(settings.repo, 'notes');
  assert.equal(settings.branch, 'main');
  assert.equal(settings.rootPath, 'QuickRecord');
  assert.equal(settings.token, 'token');
});

test('github content paths are encoded per segment', () => {
  assert.equal(
    encodePath('Quick Record/records/2026/05/04/a b.md'),
    'Quick%20Record/records/2026/05/04/a%20b.md'
  );
});
