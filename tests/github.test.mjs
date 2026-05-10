import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodePath,
  normalizeRepositoryPullSettings,
  normalizeSettings,
  recordFileRelativePath,
  repositoryFileRelativePath
} from '../src/github.js';

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

test('github pulled files are written relative to the configured root path', () => {
  assert.equal(
    recordFileRelativePath('QuickRecord/records/2026/05/04/a.md', 'QuickRecord'),
    'records/2026/05/04/a.md'
  );
  assert.equal(
    recordFileRelativePath('Vault Inbox/records/2026/05/04/a b.md', '/Vault Inbox/'),
    'records/2026/05/04/a b.md'
  );
});

test('repository pull settings normalize source paths and file extensions', () => {
  const settings = normalizeRepositoryPullSettings({
    owner: ' octo ',
    repo: ' docs ',
    branch: '',
    sourcePath: '/notes//inbox/',
    fileExtensions: '.md, txt MD',
    token: ' token '
  });

  assert.equal(settings.owner, 'octo');
  assert.equal(settings.repo, 'docs');
  assert.equal(settings.branch, 'main');
  assert.equal(settings.sourcePath, 'notes/inbox');
  assert.deepEqual(settings.fileExtensions, ['.md', '.txt']);
  assert.equal(settings.token, 'token');
  assert.equal(repositoryFileRelativePath('notes/inbox/a/b.md', 'notes/inbox'), 'a/b.md');
});
