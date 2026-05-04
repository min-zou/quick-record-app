import { shortId } from './ids.js';

const FRONTMATTER = '---';

export function toLocalIso(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const pad = value => String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
    ':',
    pad(date.getSeconds()),
    sign,
    pad(Math.floor(abs / 60)),
    ':',
    pad(abs % 60)
  ].join('');
}

export function recordPath(record, rootPath = 'QuickRecord') {
  const stamp = String(record.createdAt || '').slice(0, 19);
  const safeStamp = stamp.replace(/[-:T]/g, '');
  const datePart = safeStamp.slice(0, 8);
  const timePart = safeStamp.slice(8, 14);
  const year = datePart.slice(0, 4) || '0000';
  const month = datePart.slice(4, 6) || '00';
  const day = datePart.slice(6, 8) || '00';
  const stampPrefix = `${year}${month}${day}-${timePart || '000000'}`;
  const root = normalizeRootPath(rootPath);
  const file = `${stampPrefix}-${shortId(record.deviceId)}-${shortId(record.id)}.md`;
  return `${root}/records/${year}/${month}/${day}/${file}`;
}

export function normalizeRootPath(rootPath = 'QuickRecord') {
  return String(rootPath || 'QuickRecord')
    .replace(/\\/g, '/')
    .split('/')
    .map(part => part.trim())
    .filter(Boolean)
    .join('/') || 'QuickRecord';
}

export function markdownFromRecord(record) {
  const metadata = {
    id: record.id,
    created: record.createdAt,
    updated: record.updatedAt || record.createdAt,
    device: record.deviceId,
    source: 'quick-record',
    tags: record.tags?.length ? record.tags : ['inbox']
  };

  const frontmatter = Object.entries(metadata)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');

  return `${FRONTMATTER}\n${frontmatter}\n${FRONTMATTER}\n\n${record.content.trim()}\n`;
}

export function recordFromMarkdown(markdown, fallback = {}) {
  const text = String(markdown || '');
  if (!text.startsWith(`${FRONTMATTER}\n`)) {
    return null;
  }

  const end = text.indexOf(`\n${FRONTMATTER}`, FRONTMATTER.length + 1);
  if (end === -1) {
    return null;
  }

  const rawFrontmatter = text.slice(FRONTMATTER.length + 1, end);
  const rawContent = text.slice(end + FRONTMATTER.length + 2).replace(/^\n/, '');
  const metadata = parseFrontmatter(rawFrontmatter);

  if (metadata.source !== 'quick-record' || !metadata.id) {
    return null;
  }

  return {
    id: metadata.id,
    content: rawContent.replace(/\n$/, ''),
    createdAt: metadata.created,
    updatedAt: metadata.updated || metadata.created,
    deviceId: metadata.device || 'unknown',
    tags: Array.isArray(metadata.tags) ? metadata.tags : ['inbox'],
    syncStatus: fallback.syncStatus || 'synced',
    githubPath: fallback.githubPath || null,
    githubSha: fallback.githubSha || null
  };
}

function parseFrontmatter(raw) {
  const result = {};

  for (const line of raw.split('\n')) {
    const index = line.indexOf(':');
    if (index === -1) {
      continue;
    }

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!key) {
      continue;
    }

    try {
      result[key] = JSON.parse(value);
    } catch {
      result[key] = value;
    }
  }

  return result;
}
