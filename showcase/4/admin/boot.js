// Konfigurasi admin tema 4 "Dolce". Men-set window.__ADMIN_CONFIG lalu memuat
// mesin bersama. CSP script-src 'self' melarang <script> inline, jadi config di modul ini.

const siteUrl = new URL('../', location.href).href; // showcase/4/admin/ -> showcase/4/

window.__ADMIN_CONFIG = {
  owner: 'JustStartedHere',
  repo: 'cafe',
  branch: 'main',
  idleMinutes: 20,
  tokenUrl: 'https://github.com/settings/personal-access-tokens/new',
  siteUrl: siteUrl.startsWith('http') ? siteUrl : 'https://juststartedhere.github.io/cafe/showcase/4/',
  dataPath: 'showcase/4/data.json',
  imageDir: 'showcase/4/img',
  imageBases: ['showcase/4/img/', 'showcase/menu-img/'],
  imagePreviewBase: '../../../',
};

await import('../../../admin/admin-core.js');
