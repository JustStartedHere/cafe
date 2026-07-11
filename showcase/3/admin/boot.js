// Konfigurasi admin tema 3 "Verde". Men-set window.__ADMIN_CONFIG lalu memuat
// mesin bersama. CSP script-src 'self' melarang <script> inline, jadi config di modul ini.

const siteUrl = new URL('../', location.href).href; // showcase/3/admin/ -> showcase/3/

window.__ADMIN_CONFIG = {
  owner: 'JustStartedHere',
  repo: 'cafe',
  branch: 'main',
  idleMinutes: 20,
  tokenUrl: 'https://github.com/settings/personal-access-tokens/new',
  siteUrl: siteUrl.startsWith('http') ? siteUrl : 'https://juststartedhere.github.io/cafe/showcase/3/',
  dataPath: 'showcase/3/data.json',
  imageDir: 'showcase/3/img',
  imageBases: ['showcase/3/img/', 'showcase/menu-img/'],
  imagePreviewBase: '../../../',
};

await import('../../../admin/dashboard-core.js');
