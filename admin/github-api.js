// Wrapper GitHub Contents API — TRUST BOUNDARY project ini.
//
// Aturan yang tidak boleh dilanggar di file ini:
//  1. Token tidak pernah di-log, tidak pernah masuk pesan error, tidak pernah di-serialize.
//     Karena itu error di sini hanya membawa status + pesan dari API, bukan objek request.
//  2. Base64 harus UTF-8-safe. `btoa(JSON.stringify(menu))` merusak nama item berbahasa
//     Indonesia dan emoji — harus lewat TextEncoder.
//  3. Path divalidasi sebelum dikirim: tanpa traversal, tanpa path absolut.
//  4. Setiap status code dipetakan ke error yang bisa ditindaklanjuti pemanggil.

const API = 'https://api.github.com';
const CHUNK = 0x8000; // batas aman argumen String.fromCharCode

/* ------------------------------------------------------------------ error */

export class GitHubError extends Error {
  constructor(message, { status = 0, code = 'unknown' } = {}) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.code = code;
  }
}

/** 401, atau 403 yang bukan rate limit: token invalid/kedaluwarsa/scope kurang. */
export class AuthError extends GitHubError {
  constructor(message, status) {
    super(message, { status, code: 'auth' });
    this.name = 'AuthError';
  }
}

/** 403 dengan kuota habis. `resetAt` adalah Date; `retryAfter` detik (secondary limit). */
export class RateLimitError extends GitHubError {
  constructor(message, { status, resetAt = null, retryAfter = null }) {
    super(message, { status, code: 'rate-limit' });
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
    this.retryAfter = retryAfter;
  }
}

/** 404: repo/path/branch salah, atau token tidak punya akses ke repo ini. */
export class NotFoundError extends GitHubError {
  constructor(message) {
    super(message, { status: 404, code: 'not-found' });
    this.name = 'NotFoundError';
  }
}

/** 409: `sha` basi — file berubah sejak terakhir dibaca. Pemanggil harus re-apply mutator. */
export class ConflictError extends GitHubError {
  constructor(message) {
    super(message, { status: 409, code: 'conflict' });
    this.name = 'ConflictError';
  }
}

/** 422: payload ditolak API (sha salah bentuk, path invalid, dst). */
export class ValidationError extends GitHubError {
  constructor(message) {
    super(message, { status: 422, code: 'validation' });
    this.name = 'ValidationError';
  }
}

/** Offline / DNS gagal / request dibatalkan. Pemanggil wajib mempertahankan isi form. */
export class NetworkError extends GitHubError {
  constructor(message) {
    super(message, { status: 0, code: 'network' });
    this.name = 'NetworkError';
  }
}

/* ----------------------------------------------------------------- base64 */

/**
 * Uint8Array → string base64. Dipotong per blok agar tidak meledakkan stack
 * saat argumen `String.fromCharCode` terlalu banyak (foto berukuran MB).
 */
function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Teks (UTF-8) atau byte mentah → base64. Inilah satu-satunya jalan encode di project ini. */
export function encodeBase64(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return bytesToBase64(bytes);
}

/** base64 (boleh mengandung newline seperti balasan GitHub) → teks UTF-8. */
export function decodeBase64ToText(base64) {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/* ------------------------------------------------------------------- path */

/**
 * Path harus relatif terhadap root repo dan tidak boleh keluar darinya.
 * Ini bukan paranoia: `image` di menu.json berasal dari input owner.
 */
export function assertSafePath(path) {
  if (typeof path !== 'string' || path.trim() === '') {
    throw new GitHubError('Path kosong', { code: 'bad-path' });
  }
  if (path.startsWith('/') || path.includes('\\') || /^[a-zA-Z]:/.test(path)) {
    throw new GitHubError(`Path harus relatif: ${path}`, { code: 'bad-path' });
  }
  if (path.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')) {
    throw new GitHubError(`Path tidak valid: ${path}`, { code: 'bad-path' });
  }
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(path)) {
    throw new GitHubError('Path memuat karakter kontrol', { code: 'bad-path' });
  }
  return path;
}

const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

/* ------------------------------------------------------------------ error mapping */

function parseRateLimit(response) {
  const remaining = response.headers.get('x-ratelimit-remaining');
  const reset = response.headers.get('x-ratelimit-reset');
  const retryAfter = response.headers.get('retry-after');

  // Secondary rate limit membalas 403 + Retry-After, tanpa menyentuh x-ratelimit-remaining.
  if (retryAfter !== null) {
    return { retryAfter: Number(retryAfter), resetAt: null };
  }
  if (remaining === '0') {
    return { retryAfter: null, resetAt: reset ? new Date(Number(reset) * 1000) : null };
  }
  return null;
}

async function readMessage(response) {
  try {
    const body = await response.json();
    return typeof body?.message === 'string' ? body.message : response.statusText;
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

/** Ubah response gagal jadi error bertipe. Tidak pernah menyentuh header Authorization. */
async function toError(response) {
  const message = await readMessage(response);

  switch (response.status) {
    case 401:
      return new AuthError('Token tidak valid atau kedaluwarsa.', 401);
    case 403: {
      const limit = parseRateLimit(response);
      if (limit) {
        return new RateLimitError('Kuota permintaan GitHub habis.', { status: 403, ...limit });
      }
      return new AuthError('Token ditolak: periksa permission Contents (read & write).', 403);
    }
    case 404:
      return new NotFoundError('Tidak ditemukan: periksa repo, path, dan scope token.');
    case 409:
      return new ConflictError('File berubah sejak terakhir dibaca (sha basi).');
    case 422:
      return new ValidationError(message);
    default:
      return new GitHubError(message, { status: response.status, code: 'http' });
  }
}

/* ----------------------------------------------------------------- client */

/**
 * @param {object} options
 * @param {string} options.owner  pemilik repo
 * @param {string} options.repo   nama repo
 * @param {string} options.token  fine-grained PAT, permission Contents: read & write
 * @param {string} [options.branch='main']
 * @param {typeof globalThis.fetch} [options.fetchImpl] disuntik untuk pengujian
 */
export function createGitHubClient({ owner, repo, token, branch = 'main', fetchImpl }) {
  if (!owner || !repo) throw new GitHubError('owner dan repo wajib diisi', { code: 'config' });
  if (!token) throw new AuthError('Token belum diisi.', 0);

  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
  const base = `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  async function request(url, init = {}) {
    let response;
    try {
      response = await doFetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
      });
    } catch {
      // Pesan bawaan fetch tidak berguna dan bisa membocorkan URL bertoken di beberapa polyfill.
      throw new NetworkError('Gagal menghubungi GitHub. Periksa koneksi Anda.');
    }
    if (!response.ok) throw await toError(response);
    return response.status === 204 ? null : response.json();
  }

  const contentsUrl = (path) => `${base}/contents/${encodePath(assertSafePath(path))}`;

  return {
    owner,
    repo,
    branch,

    /** Validasi token + akses repo. Dipakai layar auth. */
    async verifyAccess() {
      const data = await request(base);
      return { fullName: data.full_name, private: data.private, permissions: data.permissions };
    },

    /**
     * Baca file teks. Melempar NotFoundError kalau tidak ada.
     * @returns {Promise<{text: string, sha: string}>}
     */
    async getFile(path) {
      const url = `${contentsUrl(path)}?ref=${encodeURIComponent(branch)}`;
      const data = await request(url, { cache: 'no-store' });

      if (Array.isArray(data)) {
        throw new GitHubError(`${path} adalah direktori, bukan file`, { code: 'is-directory' });
      }
      // File > 1 MB dikembalikan tanpa content. menu.json tidak akan sebesar itu,
      // tapi gagal keras lebih baik daripada menulis balik file kosong.
      if (data.encoding !== 'base64' || typeof data.content !== 'string') {
        throw new GitHubError(`${path} terlalu besar untuk Contents API`, { code: 'too-large' });
      }
      return { text: decodeBase64ToText(data.content), sha: data.sha };
    },

    /** Baca + parse JSON. `sha` dikembalikan untuk dipakai saat menulis balik. */
    async getJson(path) {
      const { text, sha } = await this.getFile(path);
      try {
        return { data: JSON.parse(text), sha };
      } catch {
        throw new ValidationError(`${path} bukan JSON yang valid`);
      }
    },

    /**
     * Tulis file. `sha` WAJIB saat meng-update file yang sudah ada; kosongkan saat create.
     * @param {{path: string, content: string|Uint8Array, message: string, sha?: string}} options
     * @returns {Promise<{sha: string, commit: string}>} sha baru, untuk penulisan berikutnya
     */
    async putFile({ path, content, message, sha }) {
      const body = { message, content: encodeBase64(content), branch };
      if (sha) body.sha = sha;

      const data = await request(contentsUrl(path), { method: 'PUT', body: JSON.stringify(body) });
      return { sha: data.content.sha, commit: data.commit.sha };
    },

    /** Tulis JSON ter-format (newline penutup agar diff Git rapi). */
    async putJson({ path, data, message, sha }) {
      return this.putFile({ path, content: `${JSON.stringify(data, null, 2)}\n`, message, sha });
    },

    /** Hapus file. `sha` wajib. */
    async deleteFile({ path, sha, message }) {
      if (!sha) throw new GitHubError('sha wajib saat menghapus', { code: 'missing-sha' });
      const data = await request(contentsUrl(path), {
        method: 'DELETE',
        body: JSON.stringify({ message, sha, branch }),
      });
      return { commit: data.commit.sha };
    },

    /** Isi direktori. Direktori kosong → NotFoundError (Git tidak menyimpan folder kosong). */
    async listDir(path) {
      const url = `${contentsUrl(path)}?ref=${encodeURIComponent(branch)}`;
      const data = await request(url, { cache: 'no-store' });
      if (!Array.isArray(data)) {
        throw new GitHubError(`${path} adalah file, bukan direktori`, { code: 'is-file' });
      }
      return data.map(({ name, path: p, sha, size, type }) => ({ name, path: p, sha, size, type }));
    },
  };
}
