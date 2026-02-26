/**
 * preview.js — In-app file preview modal
 */
import * as FM from './fileManager.js';

let _modal = null;
let _currentObjectURL = null;

export function init() {
    _modal = document.getElementById('previewModal');
    document.getElementById('previewClose').addEventListener('click', close);
    document.getElementById('previewDownload').addEventListener('click', download);
    // close on backdrop click
    _modal.addEventListener('click', e => { if (e.target === _modal) close(); });
    // close on ESC
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && _modal.classList.contains('open')) close(); });
}

let _currentId = null;
let _currentName = null;

export async function open(id) {
    _currentId = id;
    const meta = await FM.getMeta(id);
    _currentName = meta.name;
    const blob = await FM.getBlob(id);

    // Revoke previous URL
    if (_currentObjectURL) URL.revokeObjectURL(_currentObjectURL);
    _currentObjectURL = blob ? URL.createObjectURL(blob) : null;

    const body = document.getElementById('previewBody');
    body.innerHTML = '';
    document.getElementById('previewTitle').textContent = meta.name;

    const mime = meta.mimeType || '';

    if (mime.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = _currentObjectURL;
        img.alt = meta.name;
        body.appendChild(img);
    } else if (mime.startsWith('video/')) {
        const vid = document.createElement('video');
        vid.src = _currentObjectURL;
        vid.controls = true;
        vid.autoplay = true;
        body.appendChild(vid);
    } else if (mime.startsWith('audio/')) {
        const aud = document.createElement('audio');
        aud.src = _currentObjectURL;
        aud.controls = true;
        body.appendChild(aud);
    } else if (mime === 'application/pdf') {
        const iframe = document.createElement('iframe');
        iframe.src = _currentObjectURL;
        iframe.title = meta.name;
        body.appendChild(iframe);
    } else if (mime.startsWith('text/') || mime === 'application/json') {
        const text = await blob.text();
        const pre = document.createElement('pre');
        pre.textContent = text;
        body.appendChild(pre);
    } else {
        // Generic — show download prompt
        const msg = document.createElement('div');
        msg.className = 'preview-unsupported';
        msg.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
    <p>No hay vista previa disponible para este tipo de archivo.</p>
    <p class="file-name">${meta.name}</p>`;
        body.appendChild(msg);
    }

    _modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function close() {
    _modal.classList.remove('open');
    document.body.style.overflow = '';
    const body = document.getElementById('previewBody');
    body.innerHTML = '';
    if (_currentObjectURL) { URL.revokeObjectURL(_currentObjectURL); _currentObjectURL = null; }
}

function download() {
    if (!_currentObjectURL) return;
    const a = document.createElement('a');
    a.href = _currentObjectURL;
    a.download = _currentName;
    a.click();
}
