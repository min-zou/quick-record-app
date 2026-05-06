import { getRecentRecords, saveRecord } from './db.js';
import {
  hasCompleteSettings,
  normalizeSettings,
  pullRecords,
  syncWithGitHub,
  testGitHubConnection,
  userMessageFromError
} from './github.js';
import { createId, getOrCreateDeviceId, shortId } from './ids.js';
import { recordPath, toLocalIso } from './markdown.js';

const SETTINGS_KEY = 'quick-record-github-settings';
const deviceId = getOrCreateDeviceId();

const elements = {
  deviceLabel: document.querySelector('#deviceLabel'),
  contentInput: document.querySelector('#contentInput'),
  saveButton: document.querySelector('#saveButton'),
  saveHint: document.querySelector('#saveHint'),
  syncButton: document.querySelector('#syncButton'),
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
  saveSettingsButton: document.querySelector('#saveSettingsButton')
};

elements.deviceLabel.textContent = `设备 ${shortId(deviceId, 10)}`;

elements.saveButton.addEventListener('click', saveCurrentRecord);
elements.syncButton.addEventListener('click', runSync);
elements.refreshButton.addEventListener('click', renderRecords);
elements.settingsButton.addEventListener('click', openSettings);
elements.testConnectionButton.addEventListener('click', testCurrentSettings);
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

function readSettingsForm() {
  return normalizeSettings({
    owner: elements.ownerInput.value,
    repo: elements.repoInput.value,
    branch: elements.branchInput.value,
    rootPath: elements.rootPathInput.value,
    token: elements.tokenInput.value
  });
}

function loadSettings() {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
  } catch {
    return normalizeSettings({});
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
  elements.saveButton.disabled = isBusy;
}

function setSettingsBusy(isBusy) {
  elements.testConnectionButton.disabled = isBusy;
  elements.saveSettingsButton.disabled = isBusy;
}
