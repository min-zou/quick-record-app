import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  GitHubSyncError,
  classifyGitHubStatus,
  encodePath,
  getMissingSettings,
  isConflictError,
  normalizeSettings,
  normalizeRepositoryPullSettings,
  recordFileRelativePath,
  repositoryFileRelativePath,
  userMessageFromError
} from '../src/github.js';
import { markdownFromRecord, normalizeRootPath, recordFromMarkdown, recordPath } from '../src/markdown.js';

const tests = [
  ['record markdown round-trips with frontmatter', () => {
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
  }],
  ['record paths are stable and conflict resistant', () => {
    const path = recordPath({
      id: 'rec_abcdef123456',
      createdAt: '2026-05-04T22:13:01+08:00',
      deviceId: 'dev_9988776655'
    }, '/Vault Inbox/');

    assert.equal(path, 'Vault Inbox/records/2026/05/04/20260504-221301-dev99887-recabcde.md');
  }],
  ['root path normalization removes empty path parts', () => {
    assert.equal(normalizeRootPath('/QuickRecord//Inbox/'), 'QuickRecord/Inbox');
    assert.equal(normalizeRootPath(''), 'QuickRecord');
  }],
  ['github settings default branch and root path', () => {
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
  }],
  ['github content paths are encoded per segment', () => {
    assert.equal(
      encodePath('Quick Record/records/2026/05/04/a b.md'),
      'Quick%20Record/records/2026/05/04/a%20b.md'
    );
  }],
  ['github pulled files are written relative to the configured root path', () => {
    assert.equal(
      recordFileRelativePath('QuickRecord/records/2026/05/04/a.md', 'QuickRecord'),
      'records/2026/05/04/a.md'
    );
    assert.equal(
      recordFileRelativePath('Vault Inbox/records/2026/05/04/a b.md', '/Vault Inbox/'),
      'records/2026/05/04/a b.md'
    );
  }],
  ['repository pull settings normalize source paths and file extensions', () => {
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
  }],
  ['github settings report missing fields', () => {
    assert.deepEqual(
      getMissingSettings({ owner: 'octo', repo: '', branch: 'main', token: '' }),
      ['repo', 'token']
    );
  }],
  ['github status codes map to actionable sync errors', () => {
    assert.deepEqual(classifyGitHubStatus(401), {
      code: 'bad_token',
      message: 'GitHub token 无效或已过期，请重新生成 token。'
    });
    assert.equal(classifyGitHubStatus(404).code, 'not_found');
    assert.equal(classifyGitHubStatus(409).code, 'conflict');
    assert.equal(
      classifyGitHubStatus(403, 'API rate limit exceeded', new Headers({ 'x-ratelimit-remaining': '0' })).code,
      'rate_limit'
    );
  }],
  ['github conflict errors are identifiable and user safe', () => {
    const error = new GitHubSyncError({
      code: 'conflict',
      status: 409,
      message: '远端文件发生冲突，已保留本地待同步记录。'
    });

    assert.equal(isConflictError(error), true);
    assert.equal(userMessageFromError(error), '远端文件发生冲突，已保留本地待同步记录。');
  }],
  ['pwa deployment assets referenced by manifest and service worker exist', () => {
    assert.equal(existsSync('.nojekyll'), true);

    const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.scope, '.');
    assert.ok(Array.isArray(manifest.icons));
    assert.ok(manifest.icons.length >= 2);

    for (const icon of manifest.icons) {
      assert.ok(icon.src.startsWith('./assets/'));
      assert.equal(existsSync(icon.src.slice(2)), true, `${icon.src} should exist`);
    }

    for (const screenshot of manifest.screenshots || []) {
      assert.equal(existsSync(screenshot.src.slice(2)), true, `${screenshot.src} should exist`);
    }

    const sw = readFileSync('sw.js', 'utf8');
    const assetBlock = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
    assert.ok(assetBlock, 'service worker should define ASSETS');

    const assets = [...assetBlock[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
    assert.ok(assets.includes('./manifest.webmanifest'));
    assert.ok(assets.includes('./assets/icon-192.png'));
    assert.ok(assets.includes('./assets/icon-512.png'));

    for (const asset of assets) {
      if (asset === './' || asset === './index.html') {
        continue;
      }
      assert.equal(existsSync(asset.slice(2)), true, `${asset} should exist`);
    }
  }]
];

let passed = 0;

for (const [name, fn] of tests) {
  try {
    await fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

if (process.exitCode) {
  process.exit();
}

console.log(`${passed}/${tests.length} tests passed`);
