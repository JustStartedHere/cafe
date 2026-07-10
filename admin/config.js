// Satu-satunya tempat identitas repo dituliskan.
//
// SAAT HANDOVER: repo ditransfer ke akun GitHub owner/client. Ubah OWNER di sini,
// lalu commit. URL situs ikut berubah menjadi https://{OWNER}.github.io/{REPO}/
// — cetak ulang QR setelah itu, jangan sebelumnya.

export const OWNER = 'JustStartedHere';
export const REPO = 'cafe';
export const BRANCH = 'main';

/** Menit tanpa aktivitas sebelum sesi admin ditutup sendiri. */
export const IDLE_MINUTES = 20;

/** Halaman pembuatan fine-grained PAT. GitHub tidak mendukung pre-fill lewat query param. */
export const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';
