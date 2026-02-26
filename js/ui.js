/**
 * ui.js — Renders file grid/list, breadcrumb, context menu, toolbar
 */
import * as FM from './fileManager.js';
import * as Preview from './preview.js';

let _onRefresh = null;

export function setRefreshCallback(fn) { _onRefresh = fn; }

// ── Breadcrumb ─────────────────────────────────────────────────────────────

export function renderBreadcrumb() {
    const stack = FM.getStack();
    const crumb = document.getElementById('breadcrumb');
    crumb.innerHTML = '';
    stack.forEach((item, i) => {
        const span = document.createElement('span');
        if (i < stack.length - 1) {
            span.className = 'crumb-link';
            span.textContent = item.name;
            span.addEventListener('click', () => {
                FM.navigateToIndex(i);
                _onRefresh?.();
            });
            crumb.appendChild(span);
            const sep = document.createElement('span');
            sep.className = 'crumb-sep';
            sep.textContent = '›';
            crumb.appendChild(sep);
        } else {
            span.className = 'crumb-current';
            span.textContent = item.name;
            crumb.appendChild(span);
        }
    });
}

// ── File icons ─────────────────────────────────────────────────────────────

function getIcon(item) {
    if (item.type === 'folder') return `<svg class="file-icon folder-icon" viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4.586a1 1 0 01.707.293l1.414 1.414A1 1 0 0012.414 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" fill="currentColor"/></svg>`;
    const mime = item.mimeType || '';
    if (mime.startsWith('image/')) return `<svg class="file-icon image-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity=".15"/><path d="M3 15l5-5 4 4 3-3 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/></svg>`;
    if (mime.startsWith('video/')) return `<svg class="file-icon video-icon" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" opacity=".15"/><path d="M16 12l-6 4V8l6 4z" fill="currentColor"/></svg>`;
    if (mime.startsWith('audio/')) return `<svg class="file-icon audio-icon" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" opacity=".15"/><path d="M9 18V6l12-2v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.5"/></svg>`;
    if (mime === 'application/pdf') return `<svg class="file-icon pdf-icon" viewBox="0 0 24 24" fill="none"><path d="M4 4a2 2 0 012-2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" fill="currentColor" opacity=".15"/><path d="M14 2v6h6M9 13h1a1 1 0 010 2H9v2m5-4h1.5a1.5 1.5 0 010 3H14m-4-3v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `<svg class="file-icon generic-icon" viewBox="0 0 24 24" fill="none"><path d="M4 4a2 2 0 012-2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" fill="currentColor" opacity=".15"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ── Render Grid ─────────────────────────────────────────────────────────────

export async function renderFiles() {
    const items = await FM.listCurrent();
    const container = document.getElementById('fileContainer');
    const view = FM.getView();
    container.innerHTML = '';
    container.className = view === 'grid' ? 'file-grid' : 'file-list';

    // Update sort indicators
    const { sortBy, sortAsc } = FM.getSortState();
    document.querySelectorAll('.sort-btn').forEach(btn => {
        const field = btn.dataset.sort;
        btn.classList.toggle('active', field === sortBy);
        btn.querySelector('.sort-arrow')?.remove();
        if (field === sortBy) {
            const arrow = document.createElement('span');
            arrow.className = 'sort-arrow';
            arrow.textContent = sortAsc ? ' ↑' : ' ↓';
            btn.appendChild(arrow);
        }
    });

    if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `<div class="empty-icon">📂</div><p>Esta carpeta está vacía</p><p class="empty-sub">Sube archivos o crea una carpeta nueva</p>`;
        container.appendChild(empty);
        return;
    }

    if (view === 'list') {
        const table = document.createElement('table');
        table.className = 'list-table';
        table.innerHTML = `<thead><tr>
      <th></th><th>Nombre</th><th>Tamaño</th><th>Modificado</th><th></th>
    </tr></thead>`;
        const tbody = document.createElement('tbody');
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.id = item.id;
            tr.innerHTML = `
        <td class="list-icon-cell">${getIcon(item)}</td>
        <td class="list-name">${escHtml(item.name)}</td>
        <td class="list-size">${item.type === 'folder' ? '—' : FM.formatSize(item.size)}</td>
        <td class="list-date">${FM.formatDate(item.modifiedAt)}</td>
        <td class="list-action"><button class="ctx-trigger" aria-label="Opciones" data-id="${item.id}">⋯</button></td>`;
            attachItemEvents(tr, item);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    } else {
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'file-card';
            card.dataset.id = item.id;
            card.innerHTML = `
        <div class="card-icon">${getIcon(item)}</div>
        <div class="card-name">${escHtml(item.name)}</div>
        ${item.type === 'file' ? `<div class="card-size">${FM.formatSize(item.size)}</div>` : ''}
        <button class="ctx-trigger" aria-label="Opciones" data-id="${item.id}">⋯</button>`;
            attachItemEvents(card, item);
            container.appendChild(card);
        });
    }
}

function attachItemEvents(el, item) {
    // Primary action: open
    el.addEventListener('dblclick', () => handleOpen(item));
    el.addEventListener('click', e => {
        if (e.target.closest('.ctx-trigger')) return;
        // On touch devices, single tap opens; on desktop, double click
    });

    // Touch: distinguish tap vs long-press
    let pressTimer = null;
    el.addEventListener('touchstart', e => {
        if (e.target.closest('.ctx-trigger')) return;
        pressTimer = setTimeout(() => showContextMenu(e.touches[0].clientX, e.touches[0].clientY, item), 500);
    }, { passive: true });
    el.addEventListener('touchend', e => {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    });
    el.addEventListener('touchmove', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }, { passive: true });

    // Click on card (single tap opens on mobile)
    el.addEventListener('click', async e => {
        if (e.target.closest('.ctx-trigger')) return;
        // Ignore on desktop — rely on dblclick
        if (window.matchMedia('(pointer: fine)').matches) return;
        handleOpen(item);
    });

    el.querySelector('.ctx-trigger').addEventListener('click', e => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        showContextMenu(rect.left, rect.bottom, item);
    });

    // Right click
    el.addEventListener('contextmenu', e => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, item);
    });
}

async function handleOpen(item) {
    if (item.type === 'folder') {
        FM.navigateTo(item.id, item.name);
        _onRefresh?.();
    } else {
        await Preview.open(item.id);
    }
}

// ── Context Menu ────────────────────────────────────────────────────────────

let _ctxMenu = null;
function ensureCtxMenu() {
    if (_ctxMenu) return;
    _ctxMenu = document.getElementById('contextMenu');
    document.addEventListener('click', () => hideContextMenu());
}

export function hideContextMenu() {
    _ctxMenu?.classList.remove('open');
}

function showContextMenu(x, y, item) {
    ensureCtxMenu();
    _ctxMenu.innerHTML = '';
    const actions = [];
    if (item.type === 'file') actions.push({ label: '👁 Vista previa', fn: () => Preview.open(item.id) });
    actions.push({ label: '✏️ Renombrar', fn: () => renameDialog(item) });
    actions.push({ label: '🗑 Eliminar', fn: () => deleteConfirm(item) });
    if (item.type === 'file') actions.push({ label: '⬇️ Descargar', fn: () => downloadItem(item) });

    actions.forEach(a => {
        const btn = document.createElement('button');
        btn.className = 'ctx-item';
        btn.textContent = a.label;
        btn.addEventListener('click', e => { e.stopPropagation(); hideContextMenu(); a.fn(); });
        _ctxMenu.appendChild(btn);
    });

    // Position within viewport
    _ctxMenu.style.left = '0';
    _ctxMenu.style.top = '0';
    _ctxMenu.classList.add('open');
    const menuW = _ctxMenu.offsetWidth;
    const menuH = _ctxMenu.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    _ctxMenu.style.left = Math.min(x, vw - menuW - 8) + 'px';
    _ctxMenu.style.top = Math.min(y, vh - menuH - 8) + 'px';
}

// ── Dialogs ─────────────────────────────────────────────────────────────────

function showDialog({ title, content, buttons }) {
    const overlay = document.getElementById('dialogOverlay');
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogContent').innerHTML = '';
    document.getElementById('dialogContent').appendChild(content);
    const btnRow = document.getElementById('dialogButtons');
    btnRow.innerHTML = '';
    buttons.forEach(({ label, cls, fn }) => {
        const btn = document.createElement('button');
        btn.className = 'dialog-btn ' + (cls || '');
        btn.textContent = label;
        btn.addEventListener('click', () => { closeDialog(); fn?.(); });
        btnRow.appendChild(btn);
    });
    overlay.classList.add('open');
}

function closeDialog() {
    document.getElementById('dialogOverlay').classList.remove('open');
}

export function initDialogClose() {
    document.getElementById('dialogClose').addEventListener('click', closeDialog);
    document.getElementById('dialogOverlay').addEventListener('click', e => {
        if (e.target === document.getElementById('dialogOverlay')) closeDialog();
    });
}

function renameDialog(item) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'dialog-input';
    input.value = item.name;
    input.select();
    showDialog({
        title: 'Renombrar',
        content: input,
        buttons: [
            { label: 'Cancelar' },
            {
                label: 'Guardar', cls: 'primary', fn: async () => {
                    const val = input.value.trim();
                    if (!val) return;
                    await FM.renameItem(item.id, val);
                    _onRefresh?.();
                }
            }
        ]
    });
    setTimeout(() => { input.focus(); input.select(); }, 100);
}

function deleteConfirm(item) {
    const p = document.createElement('p');
    p.textContent = `¿Eliminar "${item.name}"?${item.type === 'folder' ? ' Se eliminará todo su contenido.' : ''}`;
    showDialog({
        title: 'Eliminar',
        content: p,
        buttons: [
            { label: 'Cancelar' },
            {
                label: 'Eliminar', cls: 'danger', fn: async () => {
                    await FM.deleteItem(item.id);
                    _onRefresh?.();
                }
            }
        ]
    });
}

async function downloadItem(item) {
    const blob = await FM.getBlob(item.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function showNewFolderDialog() {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'dialog-input';
    input.placeholder = 'Nombre de la carpeta';
    showDialog({
        title: 'Nueva carpeta',
        content: input,
        buttons: [
            { label: 'Cancelar' },
            {
                label: 'Crear', cls: 'primary', fn: async () => {
                    const val = input.value.trim();
                    if (!val) return;
                    await FM.createFolder(val);
                    _onRefresh?.();
                }
            }
        ]
    });
    setTimeout(() => input.focus(), 100);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
