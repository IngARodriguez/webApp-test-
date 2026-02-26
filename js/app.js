/**
 * app.js — Entry point: initializes DB, binds events, renders
 */
import { openDB } from './db.js';
import * as FM from './fileManager.js';
import * as UI from './ui.js';
import * as Preview from './preview.js';

async function init() {
    await openDB();

    UI.setRefreshCallback(refresh);
    UI.initDialogClose();
    Preview.init();

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(console.error);
    }

    // ── Toolbar: new folder ──
    document.getElementById('btnNewFolder').addEventListener('click', () => {
        UI.showNewFolderDialog();
    });

    // ── Toolbar: upload file ──
    const fileInput = document.getElementById('fileInput');
    document.getElementById('btnUpload').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files);
        for (const f of files) await FM.uploadFile(f);
        fileInput.value = '';
        refresh();
    });

    // ── View toggle ──
    document.getElementById('btnGrid').addEventListener('click', () => {
        FM.setView('grid');
        updateViewToggle();
        refresh();
    });
    document.getElementById('btnList').addEventListener('click', () => {
        FM.setView('list');
        updateViewToggle();
        refresh();
    });

    // ── Sort buttons ──
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            FM.setSortBy(btn.dataset.sort);
            refresh();
        });
    });

    // ── Search ──
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        FM.setSearch(searchInput.value);
        refresh();
    });

    // ── Drag & Drop on container ──
    const dropZone = document.getElementById('mainContent');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', async e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        for (const f of files) await FM.uploadFile(f);
        refresh();
    });

    // ── Hamburger / sidebar toggle ──
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }
    document.getElementById('btnHamburger').addEventListener('click', () => {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    sidebarOverlay.addEventListener('click', closeSidebar);

    // ── Theme toggle ──
    const themeBtn = document.getElementById('btnTheme');
    const saved = localStorage.getItem('fv-theme') || 'dark';
    applyTheme(saved);
    themeBtn.addEventListener('click', () => {
        const current = document.documentElement.dataset.theme;
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('fv-theme', next);
    });

    updateViewToggle();
    refresh();
}

function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    document.getElementById('btnTheme').textContent = t === 'dark' ? '☀️' : '🌙';
}

function updateViewToggle() {
    const v = FM.getView();
    document.getElementById('btnGrid').classList.toggle('active', v === 'grid');
    document.getElementById('btnList').classList.toggle('active', v === 'list');
}

async function refresh() {
    UI.renderBreadcrumb();
    await UI.renderFiles();
    UI.hideContextMenu();
}

init().catch(console.error);
