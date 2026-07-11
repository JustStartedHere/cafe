// Konfigurasi admin tema 5 "Rimba Hijau". Men-set window.__ADMIN_CONFIG lalu memuat
// mesin bersama. CSP script-src 'self' melarang <script> inline, jadi config di modul ini.

const siteUrl = new URL('../', location.href).href; // showcase/5/admin/ -> showcase/5/

window.__ADMIN_CONFIG = {
  owner: 'JustStartedHere',
  repo: 'cafe',
  branch: 'main',
  idleMinutes: 20,
  tokenUrl: 'https://github.com/settings/personal-access-tokens/new',
  siteUrl: siteUrl.startsWith('http') ? siteUrl : 'https://juststartedhere.github.io/cafe/showcase/5/',
  dataPath: 'showcase/5/data.json',
  imageDir: 'showcase/5/img',
  imageBases: ['showcase/5/img/', 'showcase/menu-img/'],
  imagePreviewBase: '../../../',
};

await import('../../../admin/dashboard-core.js');
