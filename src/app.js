import { getRecentRecords, saveRecord } from './db.js';
import {
  hasCompleteSettings,
  normalizeSettings,
  listRepositoryFiles,
  normalizeRepositoryPullSettings,
  pullRepositoryFiles,
  pullRecords,
  syncWithGitHub,
  testGitHubConnection,
  userMessageFromError
} from './github.js';
import { createId, getOrCreateDeviceId, shortId } from './ids.js';
import { recordPath, toLocalIso } from './markdown.js';

const SETTINGS_KEY = 'quick-record-github-settings';
const PULL_SETTINGS_KEY = 'quick-record-repo-pull-settings';
const deviceId = getOrCreateDeviceId();

const elements = {
  deviceLabel: document.querySelector('#deviceLabel'),
  contentInput: document.querySelector('#contentInput'),
  saveButton: document.querySelector('#saveButton'),
  saveHint: document.querySelector('#saveHint'),
  syncButton: document.querySelector('#syncButton'),
  toolsButton: document.querySelector('#toolsButton'),
  settingsButton: document.querySelector('#settingsButton'),
  refreshButton: document.querySelector('#refreshButton'),
  syncStatus: document.querySelector('#syncStatus'),
  recordsList: document.querySelector('#recordsList'),
  settingsDialog: document.querySelector('#settingsDialog'),
  ownerInput: document.querySelector('#ownerInput'),
  repoInput: document.querySelector('#repoInput'),
  branchInput: document.querySelector('#branchInput'),
  rootPathInput: document.querySelector('#rootPathInput'),
  tokenInput: document.querySelector('#tokenInput'),
  settingsStatus: document.querySelector('#settingsStatus'),
  testConnectionButton: document.querySelector('#testConnectionButton'),
  restoreRecordsButton: document.querySelector('#restoreRecordsButton'),
  saveSettingsButton: document.querySelector('#saveSettingsButton'),
  pullDialog: document.querySelector('#pullDialog'),
  pullOwnerInput: document.querySelector('#pullOwnerInput'),
  pullRepoInput: document.querySelector('#pullRepoInput'),
  pullBranchInput: document.querySelector('#pullBranchInput'),
  pullSourcePathInput: document.querySelector('#pullSourcePathInput'),
  pullFileExtensionsInput: document.querySelector('#pullFileExtensionsInput'),
  pullTokenInput: document.querySelector('#pullTokenInput'),
  pullStatus: document.querySelector('#pullStatus'),
  testPullButton: document.querySelector('#testPullButton'),
  pullToFolderButton: document.querySelector('#pullToFolderButton'),
};

elements.deviceLabel.textContent = `设备 ${shortId(deviceId, 10)}`;

elements.saveButton.addEventListener('click', saveCurrentRecord);
elements.syncButton.addEventListener('click', runSync);
elements.toolsButton.addEventListener('click', openPullTools);
elements.refreshButton.addEventListener('click', renderRecords);
elements.settingsButton.addEventListener('click', openSettings);
elements.testConnectionButton.addEventListener('click', testCurrentSettings);
elements.restoreRecordsButton.addEventListener('click', restoreRecordsFromCloud);
elements.testPullButton.addEventListener('click', testPullSettings);
elements.pullToFolderButton.addEventListener('click', pullToLocalFolder);
elements.saveSettingsButton.addEventListener('click', saveSettings);
elements.contentInput.addEventListener('input', updateSaveHint);
elements.contentInput.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    saveCurrentRecord();
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

updateSaveHint();
renderRecords();

if (!hasCompleteSettings(loadSettings())) {
  setStatus('请先完成 GitHub 同步设置');
  openSettings({ firstRun: true });
}

async function saveCurrentRecord() {
  const content = elements.contentInput.value.trim();
  if (!content) {
    setStatus('没有可保存的内容');
    return;
  }

  const now = toLocalIso();
  const record = {
    id: createId('rec'),
    content,
    createdAt: now,
    updatedAt: now,
    deviceId,
    tags: ['inbox'],
    syncStatus: 'pending',
    githubPath: null,
    githubSha: null,
    lastSyncError: null,
    syncAttempts: 0,
    remoteUpdatedAt: null
  };

  const settings = loadSettings();
  record.githubPath = recordPath(record, settings.rootPath);

  await saveRecord(record);
  elements.contentInput.value = '';
  updateSaveHint();
  setStatus('已保存到本地');
  await renderRecords();
}

async function runSync() {
  setBusy(true);
  try {
    const settings = loadSettings();
    const result = await syncWithGitHub(settings, setStatus);
    if (result.failed > 0) {
      const firstError = result.errors[0]?.message || '部分记录同步失败';
      setStatus(`同步完成：拉取 ${result.pulled} 条，推送 ${result.pushed} 条，失败 ${result.failed} 条。${firstError}`);
    } else {
      setStatus(`同步完成：拉取 ${result.pulled} 条，推送 ${result.pushed} 条`);
    }
    await renderRecords();
  } catch (error) {
    setStatus(userMessageFromError(error));
  } finally {
    setBusy(false);
  }
}

async function renderRecords() {
  const records = await getRecentRecords(80);
  elements.recordsList.replaceChildren(...records.map(record => renderRecord(record)));

  if (records.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = '还没有记录';
    elements.recordsList.append(empty);
  }
}

function renderRecord(record) {
  const item = document.createElement('li');
  item.className = 'record-item';

  const meta = document.createElement('div');
  meta.className = 'record-meta';

  const time = document.createElement('time');
  time.dateTime = record.createdAt;
  time.textContent = formatTime(record.createdAt);

  const state = document.createElement('span');
  const hasError = Boolean(record.lastSyncError);
  state.className = `sync-pill ${hasError ? 'failed' : record.syncStatus}`;
  state.textContent = record.syncStatus === 'synced' ? '已同步' : hasError ? '同步失败' : '待同步';

  const text = document.createElement('p');
  text.textContent = record.content;

  meta.append(time, state);
  item.append(meta, text);
  if (hasError) {
    const error = document.createElement('small');
    error.className = 'record-error';
    error.textContent = record.lastSyncError;
    item.append(error);
  }
  return item;
}

function openSettings({ firstRun = false } = {}) {
  const settings = loadSettings();
  elements.ownerInput.value = settings.owner;
  elements.repoInput.value = settings.repo;
  elements.branchInput.value = settings.branch;
  elements.rootPathInput.value = settings.rootPath;
  elements.tokenInput.value = settings.token;
  elements.settingsStatus.textContent = firstRun ? '首次使用需要完成同步设置' : '';
  if (!elements.settingsDialog.open) {
    elements.settingsDialog.showModal();
  }
}

function openPullTools() {
  const settings = loadPullSettings();
  elements.pullOwnerInput.value = settings.owner;
  elements.pullRepoInput.value = settings.repo;
  elements.pullBranchInput.value = settings.branch;
  elements.pullSourcePathInput.value = settings.sourcePath;
  elements.pullFileExtensionsInput.value = settings.fileExtensions.join(', ');
  elements.pullTokenInput.value = settings.token;
  elements.pullStatus.textContent = '';
  if (!elements.pullDialog.open) {
    elements.pullDialog.showModal();
  }
}

async function testCurrentSettings() {
  setSettingsBusy(true);
  try {
    const settings = readSettingsForm();
    await testGitHubConnection(settings);
    elements.settingsStatus.textContent = '连接成功';
  } catch (error) {
    elements.settingsStatus.textContent = userMessageFromError(error);
  } finally {
    setSettingsBusy(false);
  }
}

async function restoreRecordsFromCloud() {
  setSettingsBusy(true);
  try {
    const settings = readSettingsForm();
    elements.settingsStatus.textContent = '正在从云端恢复 Quick Record 记录...';
    const pulled = await pullRecords(settings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    elements.settingsStatus.textContent = `已恢复 ${pulled} 条 Quick Record 记录`;
    await renderRecords();
  } catch (error) {
    elements.settingsStatus.textContent = userMessageFromError(error);
  } finally {
    setSettingsBusy(false);
  }
}

async function saveSettings() {
  setSettingsBusy(true);
  const settings = readSettingsForm();

  try {
    await testGitHubConnection(settings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    elements.settingsStatus.textContent = '设置已保存，正在拉取远端记录...';
    const pulled = await pullRecords(settings);
    elements.settingsDialog.close();
    setStatus(`设置已保存，已拉取 ${pulled} 条远端记录`);
    await renderRecords();
  } catch (error) {
    elements.settingsStatus.textContent = userMessageFromError(error);
  } finally {
    setSettingsBusy(false);
  }
}

async function testPullSettings() {
  setPullBusy(true);
  try {
    const settings = readPullSettingsForm();
    const files = await listRepositoryFiles(settings);
    localStorage.setItem(PULL_SETTINGS_KEY, JSON.stringify(settings));
    elements.pullStatus.textContent = `读取成功：匹配 ${files.length} 个文件`;
  } catch (error) {
    elements.pullStatus.textContent = userMessageFromError(error);
  } finally {
    setPullBusy(false);
  }
}

async function pullToLocalFolder() {
  if (!('showDirectoryPicker' in window)) {
    elements.pullStatus.textContent = '当前浏览器不支持选择本地文件夹，请使用 Chrome 或 Edge。';
    return;
  }

  setPullBusy(true);
  try {
    const settings = readPullSettingsForm();
    const files = await listRepositoryFiles(settings);
    if (files.length === 0) {
      localStorage.setItem(PULL_SETTINGS_KEY, JSON.stringify(settings));
      elements.pullStatus.textContent = '没有匹配文件，请检查 GitHub Path 和 File Types。';
      return;
    }

    elements.pullStatus.textContent = '请选择本地文件夹...';
    const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    let written = 0;

    elements.pullStatus.textContent = '正在拉取远端文件...';
    await pullRepositoryFiles(settings, async file => {
      await writeTextFile(directoryHandle, file.relativePath, file.text);
      written += 1;
      if (written % 10 === 0) {
        elements.pullStatus.textContent = `正在写入本地文件夹... ${written}`;
      }
    });

    localStorage.setItem(PULL_SETTINGS_KEY, JSON.stringify(settings));
    elements.pullStatus.textContent = `已拉取 ${written} 个文件到 ${directoryHandle.name}`;
  } catch (error) {
    if (error?.name === 'AbortError') {
      elements.pullStatus.textContent = '已取消选择本地文件夹';
      return;
    }
    elements.pullStatus.textContent = userMessageFromError(error);
  } finally {
    setPullBusy(false);
  }
}

function readSettingsForm() {
  return normalizeSettings({
    owner: elements.ownerInput.value,
    repo: elements.repoInput.value,
    branch: elements.branchInput.value,
    rootPath: elements.rootPathInput.value,
    token: elements.tokenInput.value
  });
}

function readPullSettingsForm() {
  return normalizeRepositoryPullSettings({
    owner: elements.pullOwnerInput.value,
    repo: elements.pullRepoInput.value,
    branch: elements.pullBranchInput.value,
    sourcePath: elements.pullSourcePathInput.value,
    fileExtensions: elements.pullFileExtensionsInput.value,
    token: elements.pullTokenInput.value
  });
}

async function writeTextFile(rootHandle, relativePath, text) {
  const parts = getSafePathParts(relativePath);
  const fileName = parts.pop();
  let directoryHandle = rootHandle;

  for (const part of parts) {
    directoryHandle = await directoryHandle.getDirectoryHandle(part, { create: true });
  }

  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(text);
  } finally {
    await writable.close();
  }
}

function getSafePathParts(path) {
  const parts = String(path || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean);

  if (parts.length === 0 || parts.some(part => part === '.' || part === '..')) {
    throw new Error('远端文件路径不安全，已中止写入。');
  }

  return parts;
}

function loadSettings() {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
  } catch {
    return normalizeSettings({});
  }
}

function loadPullSettings() {
  try {
    return normalizeRepositoryPullSettings(JSON.parse(localStorage.getItem(PULL_SETTINGS_KEY) || '{}'));
  } catch {
    return normalizeRepositoryPullSettings({});
  }
}

function updateSaveHint() {
  const length = elements.contentInput.value.trim().length;
  elements.saveHint.textContent = length > 0 ? `${length} 字` : '';
}

function formatTime(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function setStatus(message) {
  elements.syncStatus.textContent = message;
}

function setBusy(isBusy) {
  elements.syncButton.disabled = isBusy;
  elements.toolsButton.disabled = isBusy;
  elements.saveButton.disabled = isBusy;
}

function setSettingsBusy(isBusy) {
  elements.testConnectionButton.disabled = isBusy;
  elements.restoreRecordsButton.disabled = isBusy;
  elements.saveSettingsButton.disabled = isBusy;
}

function setPullBusy(isBusy) {
  elements.testPullButton.disabled = isBusy;
  elements.pullToFolderButton.disabled = isBusy;
}
