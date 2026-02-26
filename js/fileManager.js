/**
 * fileManager.js — High-level file operations using db.js
 */
import * as DB from './db.js';

// Current folder navigation stack: array of { id, name }
// Root is represented as null id
let _stack = [{ id: null, name: 'My Files' }];
let _sortBy = 'name'; // 'name' | 'date' | 'size'
let _sortAsc = true;
let _view = 'grid'; // 'grid' | 'list'
let _search = '';

export function getCurrentFolder() {
    return _stack[_stack.length - 1];
}

export function getStack() {
    return [..._stack];
}

export function getView() { return _view; }
export function setView(v) { _view = v; }

export function getSearch() { return _search; }
export function setSearch(s) { _search = s; }

export function setSortBy(field) {
    if (_sortBy === field) _sortAsc = !_sortAsc;
    else { _sortBy = field; _sortAsc = true; }
}

export function getSortState() { return { sortBy: _sortBy, sortAsc: _sortAsc }; }

export function navigateTo(id, name) {
    _stack.push({ id, name });
}

export function navigateToIndex(index) {
    _stack = _stack.slice(0, index + 1);
}

export async function listCurrent() {
    const { id } = getCurrentFolder();
    let items = await DB.listFiles(id);

    // Filter by search
    if (_search) {
        const q = _search.toLowerCase();
        items = items.filter(f => f.name.toLowerCase().includes(q));
    }

    // Sort
    items.sort((a, b) => {
        // Folders first
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        let cmp = 0;
        if (_sortBy === 'name') cmp = a.name.localeCompare(b.name);
        else if (_sortBy === 'date') cmp = a.modifiedAt - b.modifiedAt;
        else if (_sortBy === 'size') cmp = a.size - b.size;
        return _sortAsc ? cmp : -cmp;
    });
    return items;
}

export function createFolder(name) {
    const { id } = getCurrentFolder();
    return DB.createFolder(name, id);
}

export function uploadFile(file) {
    const { id } = getCurrentFolder();
    return DB.addFile(file.name, file.type, file.size, file, id);
}

export function renameItem(id, newName) {
    return DB.renameFile(id, newName);
}

export function deleteItem(id) {
    return DB.deleteFile(id);
}

export function getBlob(id) {
    return DB.getBlob(id);
}

export function getMeta(id) {
    return DB.getFile(id);
}

export function formatSize(bytes) {
    if (bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
