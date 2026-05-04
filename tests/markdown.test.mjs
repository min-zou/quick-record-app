import test from 'node:test';
import assert from 'node:assert/strict';
import { markdownFromRecord, normalizeRootPath, recordFromMarkdown, recordPath } from '../src/markdown.js';

test('record markdown round-trips with frontmatter', () => {
  const record = {
    id: 'rec_abc123',
    content: 'Line one\nLine two',
    createdAt: '2026-05-04T22:13:01+08:00',
    updatedAt: '2026-05-04T22:13:01+08:00',
    deviceId: 'dev_device123',
    tags: ['inbox'],
    syncStatus: 'pending'
  };

  const markdown = markdownFromRecord(record);
  const parsed = recordFromMarkdown(markdown, {
    githubPath: 'QuickRecord/records/2026/05/04/example.md',
    githubSha: 'sha123'
  });

  assert.equal(parsed.id, record.id);
  assert.equal(parsed.content, record.content);
  assert.equal(parsed.createdAt, record.createdAt);
  assert.equal(parsed.deviceId, record.deviceId);
  assert.equal(parsed.githubSha, 'sha123');
  assert.deepEqual(parsed.tags, ['inbox']);
});

test('record paths are stable and conflict resistant', () => {
  const path = recordPath({
    id: 'rec_abcdef123456',
    createdAt: '2026-05-04T22:13:01+08:00',
    deviceId: 'dev_9988776655'
  }, '/Vault Inbox/');

  assert.equal(path, 'Vault Inbox/records/2026/05/04/20260504-221301-dev99887-recabcde.md');
});

test('root path normalization removes empty path parts', () => {
  assert.equal(normalizeRootPath('/QuickRecord//Inbox/'), 'QuickRecord/Inbox');
  assert.equal(normalizeRootPath(''), 'QuickRecord');
});
