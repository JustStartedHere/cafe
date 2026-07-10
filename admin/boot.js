// Konfigurasi admin cafe. Men-set window.__ADMIN_CONFIG lalu memuat mesin bersama.
// CSP `script-src 'self'` melarang <script> inline, jadi config tinggal di modul ini.
//
// SAAT HANDOVER: repo ditransfer ke akun owner. Ubah `owner` di sini (dan `siteUrl`
// akan ikut benar karena dihitung dari lokasi halaman). Cetak ulang QR setelahnya.

const menuUrl = new URL('../menu/', location.href).href;

window.__ADMIN_CONFIG = {
  owner: 'JustStartedHere',
  repo: 'cafe',
  branch: 'main',
  idleMinutes: 20,
  tokenUrl: 'https://github.com/settings/personal-access-tokens/new',
  // /menu/ (bukan akar) — akar ditempati galeri showcase yang sementara.
  siteUrl: menuUrl.startsWith('http') ? menuUrl : 'https://juststartedhere.github.io/cafe/menu/',
  dataPath: 'data/menu.json',
  imageDir: 'images',
  // Upload sendiri ke images/ + boleh pakai foto contoh bersama showcase/menu-img/.
  imageBases: ['images/', 'showcase/menu-img/'],
  imagePreviewBase: '../',
};

// Dynamic import agar assignment di atas selesai lebih dulu (static import di-hoist).
await import('./admin-core.js');
