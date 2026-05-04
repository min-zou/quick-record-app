const DB_NAME = 'quick-record';
const DB_VERSION = 1;

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('records')) {
        const records = db.createObjectStore('records', { keyPath: 'id' });
        records.createIndex('createdAt', 'createdAt');
        records.createIndex('syncStatus', 'syncStatus');
        records.createIndex('githubPath', 'githubPath', { unique: false });
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecord(record) {
  const db = await openDatabase();
  return requestToPromise(
    db.transaction('records', 'readwrite').objectStore('records').put(record)
  );
}

export async function getRecord(id) {
  const db = await openDatabase();
  return requestToPromise(
    db.transaction('records', 'readonly').objectStore('records').get(id)
  );
}

export async function getRecentRecords(limit = 50) {
  const db = await openDatabase();
  const tx = db.transaction('records', 'readonly');
  const index = tx.objectStore('records').index('createdAt');
  const records = [];

  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, 'prev');
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || records.length >= limit) {
        resolve(records);
        return;
      }
      records.push(cursor.value);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingRecords() {
  const db = await openDatabase();
  const tx = db.transaction('records', 'readonly');
  const index = tx.objectStore('records').index('syncStatus');
  return getAllFromIndex(index, IDBKeyRange.only('pending'));
}

export async function getAllRecords() {
  const db = await openDatabase();
  return requestToPromise(
    db.transaction('records', 'readonly').objectStore('records').getAll()
  );
}

export async function setMeta(key, value) {
  const db = await openDatabase();
  return requestToPromise(
    db.transaction('meta', 'readwrite').objectStore('meta').put({ key, value })
  );
}

export async function getMeta(key) {
  const db = await openDatabase();
  const row = await requestToPromise(
    db.transaction('meta', 'readonly').objectStore('meta').get(key)
  );
  return row?.value;
}

function getAllFromIndex(index, query) {
  return new Promise((resolve, reject) => {
    const request = index.getAll(query);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
