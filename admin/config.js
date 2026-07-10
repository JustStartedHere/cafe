// Satu-satunya tempat identitas repo dituliskan.
//
// SAAT HANDOVER: repo ditransfer ke akun GitHub owner/client. Ubah OWNER di sini,
// lalu commit. URL situs ikut berubah menjadi https://{OWNER}.github.io/{REPO}/
// — cetak ulang QR setelah itu, jangan sebelumnya.

export const OWNER = 'JustStartedHere';
export const REPO = 'cafe';
export const BRANCH = 'main';

/**
 * URL halaman pelanggan — yang di-encode ke QR.
 * Dihitung dari lokasi halaman admin (`/admin/` → satu tingkat naik), sehingga otomatis
 * benar setelah repo ditransfer. Nilai di bawah hanya cadangan saat dibuka dari file lokal.
 */
export const SITE_URL = new URL('..', location.href).href.startsWith('http')
  ? new URL('..', location.href).href
  : 'https://juststartedhere.github.io/cafe/';

/** Menit tanpa aktivitas sebelum sesi admin ditutup sendiri. */
export const IDLE_MINUTES = 20;

/** Halaman pembuatan fine-grained PAT. GitHub tidak mendukung pre-fill lewat query param. */
export const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';
