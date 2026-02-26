/**
 * db.js — IndexedDB wrapper for FileVault virtual filesystem
 * Object stores:
 *   - "files"  → metadata records { id, name, type, size, mimeType, parentId, createdAt, modifiedAt }
 *   - "blobs"  → binary data  { id, blob }
 */

const DB_NAME = 'FileVaultDB';
const DB_VERSION = 1;
let db = null;

export function openDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains('files')) {
                const store = d.createObjectStore('files', { keyPath: 'id' });
                store.createIndex('parentId', 'parentId', { unique: false });
            }
            if (!d.objectStoreNames.contains('blobs')) {
                d.createObjectStore('blobs', { keyPath: 'id' });
            }
        };
        req.onsuccess = e => { db = e.target.result; resolve(db); };
        req.onerror = e => reject(e.target.error);
    });
}

function tx(stores, mode = 'readonly') {
    return db.transaction(stores, mode);
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Files meta ──────────────────────────────────────────────────────────────

export function listFiles(parentId = null) {
    return new Promise((resolve, reject) => {
        const store = tx('files').objectStore('files');
        const idx = store.index('parentId');
        const req = idx.getAll(parentId);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

export function getFile(id) {
    return new Promise((resolve, reject) => {
        const req = tx('files').objectStore('files').get(id);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

export function createFolder(name, parentId = null) {
    const now = Date.now();
    const record = { id: uid(), name, type: 'folder', size: 0, mimeType: '', parentId, createdAt: now, modifiedAt: now };
    return new Promise((resolve, reject) => {
        const req = tx('files', 'readwrite').objectStore('files').add(record);
        req.onsuccess = () => resolve(record);
        req.onerror = e => reject(e.target.error);
    });
}

export function addFile(name, mimeType, size, blob, parentId = null) {
    const now = Date.now();
    const id = uid();
    const meta = { id, name, type: 'file', size, mimeType, parentId, createdAt: now, modifiedAt: now };
    const transaction = tx(['files', 'blobs'], 'readwrite');
    return new Promise((resolve, reject) => {
        transaction.objectStore('files').add(meta);
        transaction.objectStore('blobs').add({ id, blob });
        transaction.oncomplete = () => resolve(meta);
        transaction.onerror = e => reject(e.target.error);
    });
}

export function renameFile(id, newName) {
    return new Promise((resolve, reject) => {
        const store = tx('files', 'readwrite').objectStore('files');
        const req = store.get(id);
        req.onsuccess = e => {
            const record = e.target.result;
            if (!record) return reject(new Error('Not found'));
            record.name = newName;
            record.modifiedAt = Date.now();
            const put = store.put(record);
            put.onsuccess = () => resolve(record);
            put.onerror = er => reject(er.target.error);
        };
        req.onerror = e => reject(e.target.error);
    });
}

export async function deleteFile(id) {
    const meta = await getFile(id);
    if (!meta) return;

    // If folder, recursively delete children
    if (meta.type === 'folder') {
        const children = await listFiles(id);
        for (const child of children) await deleteFile(child.id);
    }

    return new Promise((resolve, reject) => {
        const transaction = tx(['files', 'blobs'], 'readwrite');
        transaction.objectStore('files').delete(id);
        if (meta.type === 'file') transaction.objectStore('blobs').delete(id);
        transaction.oncomplete = resolve;
        transaction.onerror = e => reject(e.target.error);
    });
}

export function getBlob(id) {
    return new Promise((resolve, reject) => {
        const req = tx('blobs').objectStore('blobs').get(id);
        req.onsuccess = e => resolve(e.target.result?.blob ?? null);
        req.onerror = e => reject(e.target.error);
    });
}

export function moveFile(id, newParentId) {
    return new Promise((resolve, reject) => {
        const store = tx('files', 'readwrite').objectStore('files');
        const req = store.get(id);
        req.onsuccess = e => {
            const record = e.target.result;
            if (!record) return reject(new Error('Not found'));
            record.parentId = newParentId;
            record.modifiedAt = Date.now();
            const put = store.put(record);
            put.onsuccess = () => resolve(record);
            put.onerror = er => reject(er.target.error);
        };
        req.onerror = e => reject(e.target.error);
    });
}
