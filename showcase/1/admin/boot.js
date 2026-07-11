// Konfigurasi admin tema 1 "Your Restaurant". Men-set window.__ADMIN_CONFIG lalu memuat
// mesin bersama. CSP script-src 'self' melarang <script> inline, jadi config di modul ini.

const siteUrl = new URL('../', location.href).href; // showcase/1/admin/ -> showcase/1/

window.__ADMIN_CONFIG = {
  owner: 'JustStartedHere',
  repo: 'cafe',
  branch: 'main',
  idleMinutes: 20,
  tokenUrl: 'https://github.com/settings/personal-access-tokens/new',
  siteUrl: siteUrl.startsWith('http') ? siteUrl : 'https://juststartedhere.github.io/cafe/showcase/1/',
  dataPath: 'showcase/1/data.json',
  imageDir: 'showcase/1/img',
  imageBases: ['showcase/1/img/', 'showcase/menu-img/'],
  imagePreviewBase: '../../../',
};

await import('../../../admin/dashboard-core.js');
