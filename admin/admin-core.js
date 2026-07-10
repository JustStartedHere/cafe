// Orkestrasi admin bersama: auth, sesi, idle timeout, QR. Satu mesin untuk cafe +
// semua tema showcase; tiap halaman admin men-set `window.__ADMIN_CONFIG` sebelum
// modul ini dimuat.
//
// Tidak ada `console.*` di file ini, dan tidak akan pernah ada. Satu console.log yang
// men-serialize objek request sudah cukup untuk menaruh token di log browser.

import { createGitHubClient, AuthError, RateLimitError, NotFoundError, NetworkError } from './github-api.js';
import * as tokenStore from './token-store.js';
import { createMenuStore } from './menu-store.js';
import { createTableEditor } from './table-editor.js';
import { configureModel } from './menu-model.js';
import { toSvg, toSvgBlob, toPngBlob, download, QrError } from './qr.js';

const CONFIG = window.__ADMIN_CONFIG ?? {};
const OWNER = CONFIG.owner;
const REPO = CONFIG.repo;
const BRANCH = CONFIG.branch ?? 'main';
const IDLE_MINUTES = CONFIG.idleMinutes ?? 20;
const TOKEN_URL = CONFIG.tokenUrl ?? '';
const SITE_URL = CONFIG.siteUrl ?? '';
const DATA_PATH = CONFIG.dataPath ?? 'data/menu.json';
const IMAGE_DIR = CONFIG.imageDir ?? 'images';
const IMAGE_PREVIEW_BASE = CONFIG.imagePreviewBase ?? '../';

// Batasi folder gambar yang boleh ditulis/divalidasi model untuk desain ini.
configureModel({ imageBases: CONFIG.imageBases ?? [IMAGE_DIR] });

const el = (id) => document.getElementById(id);
const view = { auth: el('auth'), app: el('app') };

const form = el('token-form');
const tokenInput = el('token');
const rememberBox = el('remember');
const rememberWarning = el('remember-warning');
const errorBox = el('auth-error');
const submitButton = el('submit');
const logoutButton = el('logout');

let client = null;
let editor = null;
let idleTimer = null;

/* --------------------------------------------------------------- tampilan */

function showAuth(message = '') {
  view.auth.hidden = false;
  view.app.hidden = true;
  logoutButton.hidden = true;
  el('repo-label').textContent = '';
  setError(message);
  tokenInput.value = '';
}

function showApp(access) {
  view.auth.hidden = true;
  view.app.hidden = false;
  logoutButton.hidden = false;
  setError('');
  tokenInput.value = '';
  el('repo-label').textContent = `${access.fullName} · ${BRANCH}`;
}

function setError(message) {
  errorBox.textContent = message;
  errorBox.hidden = message === '';
}

function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.textContent = busy ? 'Memeriksa…' : 'Masuk';
}

function explain(error) {
  if (error instanceof AuthError) {
    tokenStore.clear();
    return error.status === 403
      ? 'Token ditolak. Pastikan izinnya Contents: Read and write untuk repositori ini.'
      : 'Token tidak valid atau kedaluwarsa. Buat token baru.';
  }
  if (error instanceof RateLimitError) {
    if (error.retryAfter) return `Terlalu banyak permintaan. Coba lagi dalam ${error.retryAfter} detik.`;
    const at = error.resetAt?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return at ? `Kuota GitHub habis. Coba lagi setelah pukul ${at}.` : 'Kuota GitHub habis. Coba lagi nanti.';
  }
  if (error instanceof NotFoundError) {
    return `Repositori ${OWNER}/${REPO} tidak terjangkau token ini. Periksa lagi pilihan repositori saat membuat token.`;
  }
  if (error instanceof NetworkError) {
    return 'Gagal menghubungi GitHub. Periksa koneksi Anda, lalu coba lagi.';
  }
  return 'Terjadi kesalahan tak terduga. Coba lagi.';
}

/* ------------------------------------------------------------------- idle */

const ACTIVITY = ['pointerdown', 'keydown', 'scroll', 'focus'];

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => logout('Sesi ditutup otomatis karena tidak ada aktivitas.'), IDLE_MINUTES * 60_000);
}

function startIdleWatch() {
  for (const event of ACTIVITY) addEventListener(event, resetIdleTimer, { passive: true, capture: true });
  resetIdleTimer();
}

function stopIdleWatch() {
  clearTimeout(idleTimer);
  idleTimer = null;
  for (const event of ACTIVITY) removeEventListener(event, resetIdleTimer, { capture: true });
}

/* ------------------------------------------------------------------- auth */

async function loadMenu(store) {
  editor.setStatus('Memuat menu…');
  try {
    await store.load();
    editor.setStatus('');
    editor.render();
  } catch (error) {
    if (error instanceof AuthError) { logout(explain(error)); return; }
    editor.showLoadError(error, () => loadMenu(store));
  }
}

async function signIn(token, { remember = false, persist = true } = {}) {
  const candidate = createGitHubClient({ owner: OWNER, repo: REPO, token, branch: BRANCH });
  const access = await candidate.verifyAccess();

  client = candidate;
  if (persist) tokenStore.save(token, remember);

  const store = createMenuStore(candidate, { path: DATA_PATH });
  editor = createTableEditor({
    store,
    client: candidate,
    imageDir: IMAGE_DIR,
    imagePreviewBase: IMAGE_PREVIEW_BASE,
    onAuthError: (error) => logout(explain(error)),
  });

  showApp(access);
  startIdleWatch();
  await loadMenu(store);
  return access;
}

function logout(message = '') {
  tokenStore.clear();
  stopIdleWatch();
  editor?.reset();
  editor = null;
  client = null;
  showAuth(message);
}

/* --------------------------------------------------------------------- QR */

const qrUrl = el('qr-url');
const qrPreview = el('qr-preview');
const qrStatus = el('qr-status');

const qrFilename = (extension) => {
  const host = (() => {
    try { return new URL(qrUrl.value).hostname.split('.')[0]; } catch { return 'menu'; }
  })();
  return `${host}-qr.${extension}`;
};

function renderQrPreview() {
  qrPreview.replaceChildren();
  qrStatus.textContent = '';
  try {
    qrPreview.append(toSvg(qrUrl.value, { moduleSize: 4 }));
  } catch (error) {
    qrStatus.textContent = error instanceof QrError ? error.message : 'Gagal membuat QR.';
  }
}

async function downloadQr(kind) {
  try {
    if (kind === 'svg') {
      download(toSvgBlob(qrUrl.value, { moduleSize: 8 }), qrFilename('svg'));
    } else {
      download(await toPngBlob(qrUrl.value, { size: 1024 }), qrFilename('png'));
    }
    qrStatus.textContent = 'Berkas diunduh.';
  } catch (error) {
    qrStatus.textContent = error instanceof QrError ? error.message : 'Gagal membuat berkas.';
  }
}

qrUrl.value = SITE_URL;
qrUrl.addEventListener('input', renderQrPreview);
el('qr-svg').addEventListener('click', () => downloadQr('svg'));
el('qr-png').addEventListener('click', () => downloadQr('png'));
renderQrPreview();

/* ------------------------------------------------------------------ event */

rememberBox.addEventListener('change', () => {
  rememberWarning.hidden = !rememberBox.checked;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const token = tokenInput.value.trim();
  if (token === '') { setError('Tempelkan token terlebih dahulu.'); return; }
  setBusy(true);
  setError('');
  try {
    await signIn(token, { remember: rememberBox.checked });
  } catch (error) {
    setError(explain(error));
  } finally {
    setBusy(false);
  }
});

logoutButton.addEventListener('click', () => logout());

/* ------------------------------------------------------------------- init */

el('token-link').href = TOKEN_URL;
el('idle-minutes').textContent = String(IDLE_MINUTES);
el('repo-label').textContent = '';

const stored = tokenStore.load();
if (stored) {
  rememberBox.checked = tokenStore.isRemembered();
  rememberWarning.hidden = !rememberBox.checked;
  try {
    await signIn(stored, { persist: false });
  } catch (error) {
    showAuth(explain(error));
  }
} else {
  showAuth();
}
