// Orkestrasi admin: auth, sesi, idle timeout. CRUD menyusul di Phase 5.
//
// Tidak ada `console.*` di file ini, dan tidak akan pernah ada. Satu `console.log(err)`
// yang kebetulan men-serialize objek request sudah cukup untuk menaruh token di log browser.

import { OWNER, REPO, BRANCH, IDLE_MINUTES, TOKEN_URL, SITE_URL } from './config.js';
import { createGitHubClient, AuthError, RateLimitError, NotFoundError, NetworkError } from './github-api.js';
import * as tokenStore from './token-store.js';
import { createMenuStore } from './menu-store.js';
import { createEditor } from './editor.js';
import { toSvg, toSvgBlob, toPngBlob, download, QrError } from './qr.js';

const el = (id) => document.getElementById(id);
const view = { auth: el('auth'), app: el('app') };

const form = el('token-form');
const tokenInput = el('token');
const rememberBox = el('remember');
const rememberWarning = el('remember-warning');
const errorBox = el('auth-error');
const submitButton = el('submit');
const logoutButton = el('logout');

/** Klien aktif. Hanya hidup di memori — tidak pernah ditulis ke storage. */
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
  tokenInput.value = ''; // token sudah dipegang klien; jangan tinggalkan di DOM
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

/**
 * Terjemahkan error wrapper jadi kalimat yang bisa ditindaklanjuti owner.
 * `AuthError` juga menyapu storage: token itu sudah terbukti tidak berguna.
 */
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

/**
 * Sesi ditutup sendiri setelah diam. Timer di-reset oleh aktivitas nyata saja —
 * `mousemove` sengaja tidak dipakai agar kursor yang tersenggol tidak memperpanjang sesi.
 */
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

/**
 * Muat menu.json lewat API — bukan dari salinan publik, yang bisa basi hingga 10 menit.
 * Kegagalan di sini TIDAK membatalkan login: token sudah terbukti sah. Owner cukup
 * menekan "Muat ulang". Kalau ini digabung ke signIn, `data/menu.json` yang hilang
 * akan mengunci admin sepenuhnya.
 */
async function loadMenu(store) {
  editor.setStatus('Memuat menu…');
  try {
    await store.load();
    editor.setStatus('');
    editor.render();
  } catch (error) {
    if (error instanceof AuthError) {
      logout(explain(error));
      return;
    }
    editor.showLoadError(error, () => loadMenu(store));
  }
}

/** Satu-satunya jalan masuk ke state "terautentikasi". */
async function signIn(token, { remember = false, persist = true } = {}) {
  const candidate = createGitHubClient({ owner: OWNER, repo: REPO, token, branch: BRANCH });
  const access = await candidate.verifyAccess(); // melempar kalau token tidak sah

  client = candidate;
  if (persist) tokenStore.save(token, remember);

  const store = createMenuStore(candidate);
  editor = createEditor({
    store,
    client: candidate, // editor menulis gambar langsung; store hanya mengurus menu.json
    // Token dicabut di tengah sesi → keluarkan owner, jangan biarkan tombol mati diam-diam.
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

/** Nama file yang ramah: kopi-senja-qr.svg */
const qrFilename = (extension) => {
  const host = (() => {
    try {
      return new URL(qrUrl.value).hostname.split('.')[0];
    } catch {
      return 'menu';
    }
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
  if (token === '') {
    setError('Tempelkan token terlebih dahulu.');
    return;
  }

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

// Token tersimpan harus divalidasi ulang: bisa saja sudah dicabut sejak terakhir dipakai.
const stored = tokenStore.load();
if (stored) {
  rememberBox.checked = tokenStore.isRemembered();
  rememberWarning.hidden = !rememberBox.checked;
  try {
    // `persist: false` — token sudah tersimpan; jangan tulis ulang dan jangan pindah storage.
    await signIn(stored, { persist: false });
  } catch (error) {
    showAuth(explain(error));
  }
} else {
  showAuth();
}
