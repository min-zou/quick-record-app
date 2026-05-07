import { getAllRecords, getPendingRecords, saveRecord } from './db.js';
import { markdownFromRecord, normalizeRootPath, recordFromMarkdown, recordPath } from './markdown.js';

const API = 'https://api.github.com';

export class GitHubSyncError extends Error {
  constructor({ code, message, status = null, detail = '', retryAfter = null }) {
    super(message);
    this.name = 'GitHubSyncError';
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.retryAfter = retryAfter;
  }
}

export function normalizeSettings(settings) {
  return {
    owner: settings.owner?.trim() || '',
    repo: settings.repo?.trim() || '',
    branch: settings.branch?.trim() || 'main',
    rootPath: normalizeRootPath(settings.rootPath || 'QuickRecord'),
    token: settings.token?.trim() || ''
  };
}

export function validateSettings(settings) {
  const normalized = normalizeSettings(settings);
  const missing = getMissingSettings(normalized);

  if (missing.length > 0) {
    throw new GitHubSyncError({
      code: 'missing_settings',
      message: `GitHub 设置不完整：缺少 ${missing.join(', ')}。`
    });
  }

  return normalized;
}

export function getMissingSettings(settings) {
  const normalized = normalizeSettings(settings);
  return ['owner', 'repo', 'branch', 'token'].filter(key => !normalized[key]);
}

export function hasCompleteSettings(settings) {
  return getMissingSettings(settings).length === 0;
}

export async function syncWithGitHub(settings, onProgress = () => {}) {
  const normalized = validateSettings(settings);
  onProgress('正在拉取远端记录...');
  const pulled = await pullRecords(normalized);

  onProgress('正在推送本地记录...');
  const pushResult = await pushPendingRecords(normalized);

  return { pulled, ...pushResult };
}

export async function testGitHubConnection(settings) {
  const normalized = validateSettings(settings);
  const treeSha = await getBranchTreeSha(normalized);
  await listRecordFiles(normalized);

  // 检测写入权限：尝试写入一个测试文件然后删除
  // 如果 token 只有 Read 权限，这里会 403
  const testPath = `${normalized.rootPath}/.quick-record-write-test.md`;
  const testContent = '# write test\n';
  try {
    await putFile(normalized, testPath, testContent, null, 'Quick Record write permission test');
    // 写入成功，清理测试文件
    const testFile = await getFile(normalized, testPath);
    await deleteFile(normalized, testPath, testFile.sha, 'Remove write permission test file');
  } catch (error) {
    if (error.status === 403) {
      throw new GitHubSyncError({
        code: 'permission_denied',
        message: 'GitHub token 权限不足，请确认 Contents 权限为 Read and write。',
        detail: error.detail
      });
    }
    throw error;
  }

  return {
    ok: true,
    owner: normalized.owner,
    repo: normalized.repo,
    branch: normalized.branch,
    treeSha
  };
}

export async function pullRecords(settings) {
  const remoteFiles = await listRecordFiles(settings);
  const localRecords = await getAllRecords();
  const byPath = new Map(localRecords.map(record => [record.githubPath, record]));
  const byId = new Map(localRecords.map(record => [record.id, record]));
  let imported = 0;

  for (const file of remoteFiles) {
    const existing = byPath.get(file.path);
    if (existing?.githubSha === file.sha) {
      continue;
    }

    const markdown = await getFileText(settings, file.path);
    const record = recordFromMarkdown(markdown, {
      githubPath: file.path,
      githubSha: file.sha,
      syncStatus: 'synced'
    });

    if (!record) {
      continue;
    }

    const current = byId.get(record.id);
    if (!current || current.githubSha !== file.sha) {
      await saveRecord({
        ...current,
        ...record,
        githubPath: file.path,
        githubSha: file.sha,
        syncStatus: current?.syncStatus === 'pending' ? 'pending' : 'synced',
        lastSyncError: current?.syncStatus === 'pending' ? current.lastSyncError || null : null,
        syncAttempts: current?.syncStatus === 'pending' ? current.syncAttempts || 0 : 0,
        remoteUpdatedAt: record.updatedAt
      });
      imported += 1;
    }
  }

  return imported;
}

export async function pushPendingRecords(settings) {
  const pending = await getPendingRecords();
  let pushed = 0;
  const errors = [];

  for (const record of pending) {
    const path = record.githubPath || recordPath(record, settings.rootPath);
    const markdown = markdownFromRecord({ ...record, githubPath: path });
    const attempts = Number(record.syncAttempts || 0) + 1;

    try {
      const result = await putFileWithConflictRetry(settings, {
        path,
        markdown,
        sha: record.githubSha,
        message: `Add quick record ${record.id}`
      });

      await saveRecord({
        ...record,
        githubPath: path,
        githubSha: result.content.sha,
        syncStatus: 'synced',
        lastSyncError: null,
        syncAttempts: 0,
        remoteUpdatedAt: new Date().toISOString()
      });
      pushed += 1;
    } catch (error) {
      const message = userMessageFromError(error);
      errors.push({ id: record.id, path, message, code: error.code || 'unknown' });
      await saveRecord({
        ...record,
        githubPath: path,
        syncStatus: 'pending',
        lastSyncError: message,
        syncAttempts: attempts
      });
    }
  }

  return { pushed, failed: errors.length, errors };
}

export async function listRecordFiles(settings) {
  const treeSha = await getBranchTreeSha(settings);
  const tree = await githubFetch(settings, `/repos/${settings.owner}/${settings.repo}/git/trees/${treeSha}?recursive=1`);
  const prefix = `${settings.rootPath}/records/`;

  return (tree.tree || [])
    .filter(item => item.type === 'blob' && item.path.startsWith(prefix) && item.path.endsWith('.md'))
    .map(item => ({ path: item.path, sha: item.sha }));
}

export async function getBranchTreeSha(settings) {
  const branch = await githubFetch(settings, `/repos/${settings.owner}/${settings.repo}/branches/${encodeURIComponent(settings.branch)}`);
  return branch.commit?.commit?.tree?.sha || branch.commit?.sha || settings.branch;
}

export async function getFileText(settings, path) {
  const file = await getFile(settings, path);
  return base64ToText(file.content || '');
}

export async function getFile(settings, path) {
  return githubFetch(settings, `/repos/${settings.owner}/${settings.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(settings.branch)}`);
}

export async function putFile(settings, path, text, sha, message) {
  const body = {
    message,
    content: textToBase64(text),
    branch: settings.branch
  };

  if (sha) {
    body.sha = sha;
  }

  return githubFetch(settings, `/repos/${settings.owner}/${settings.repo}/contents/${encodePath(path)}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

export async function deleteFile(settings, path, sha, message) {
  return githubFetch(settings, `/repos/${settings.owner}/${settings.repo}/contents/${encodePath(path)}`, {
    method: 'DELETE',
    body: JSON.stringify({
      message,
      sha,
      branch: settings.branch
    })
  });
}

async function putFileWithConflictRetry(settings, { path, markdown, sha, message }) {
  try {
    return await putFile(settings, path, markdown, sha, message);
  } catch (error) {
    if (!isConflictError(error)) {
      throw error;
    }

    await pullRecords(settings);
    const remoteSha = await getRemoteShaForRetry(settings, path);
    return putFile(settings, path, markdown, remoteSha || sha, `${message} after conflict retry`);
  }
}

async function getRemoteShaForRetry(settings, path) {
  try {
    const file = await getFile(settings, path);
    return file.sha || null;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function githubFetch(settings, path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${settings.token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw new GitHubSyncError({
      code: 'network',
      message: '无法连接 GitHub，请检查网络后重试。',
      detail: error.message
    });
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.message || detail;
    } catch {
      detail = response.statusText;
    }
    throw createGitHubError(response.status, detail, response.headers);
  }

  return response.json();
}

export function createGitHubError(status, detail = '', headers = null) {
  const classification = classifyGitHubStatus(status, detail, headers);
  return new GitHubSyncError({
    ...classification,
    status,
    detail,
    retryAfter: headers?.get?.('retry-after') || null
  });
}

export function classifyGitHubStatus(status, detail = '', headers = null) {
  const text = String(detail || '').toLowerCase();
  const remaining = headers?.get?.('x-ratelimit-remaining');

  if (status === 401) {
    return {
      code: 'bad_token',
      message: 'GitHub token 无效或已过期，请重新生成 token。'
    };
  }

  if (status === 403 && (remaining === '0' || text.includes('rate limit'))) {
    return {
      code: 'rate_limit',
      message: 'GitHub API 频率限制已触发，请稍后再同步。'
    };
  }

  if (status === 403) {
    return {
      code: 'permission_denied',
      message: 'GitHub token 权限不足，请确认 Contents 权限为 Read and write。'
    };
  }

  if (status === 404) {
    return {
      code: 'not_found',
      message: 'GitHub 仓库、分支或文件路径不存在，请检查 Owner、Repo 和 Branch。'
    };
  }

  if (status === 409) {
    return {
      code: 'conflict',
      message: '远端文件发生冲突，已保留本地待同步记录。'
    };
  }

  if (status === 422) {
    return {
      code: 'validation_failed',
      message: 'GitHub 拒绝了本次写入，请检查分支、路径和仓库权限。'
    };
  }

  return {
    code: 'github_error',
    message: `GitHub 请求失败（${status}）：${detail || '未知错误'}`
  };
}

export function isConflictError(error) {
  return error?.code === 'conflict' || error?.status === 409;
}

export function userMessageFromError(error) {
  if (error instanceof GitHubSyncError || error?.message) {
    return error.message;
  }
  return '同步失败，请稍后重试。';
}

export function encodePath(path) {
  return String(path)
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

export function textToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function base64ToText(base64) {
  const clean = String(base64 || '').replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
