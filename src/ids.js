export function createId(prefix = 'rec') {
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random.replace(/-/g, '')}`;
}

export function getOrCreateDeviceId(storage = globalThis.localStorage) {
  const key = 'quick-record-device-id';
  const existing = storage?.getItem(key);
  if (existing) {
    return existing;
  }

  const id = createId('dev').slice(0, 20);
  storage?.setItem(key, id);
  return id;
}

export function shortId(id, size = 8) {
  return String(id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, size) || 'unknown';
}
