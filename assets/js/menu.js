// Entry point halaman publik: fetch menu.json, kelola state UI.

import { detectLang } from './util.js';
import { renderMenu, renderHeader } from './render.js';

const DATA_URL = 'data/menu.json';

const lang = detectLang();
document.documentElement.lang = lang;

const view = {
  skeleton: document.getElementById('skeleton'),
  menu: document.getElementById('menu'),
  empty: document.getElementById('empty'),
  error: document.getElementById('error'),
};

/** Tampilkan tepat satu state; sisanya disembunyikan. Tidak pernah layar kosong. */
function show(state) {
  for (const [name, node] of Object.entries(view)) {
    if (node) node.hidden = name !== state;
  }
}

/**
 * menu.json datang dari repo publik yang bisa divandal — perlakukan sebagai data
 * tak tepercaya. Cukup validasi bentuknya; render sudah XSS-safe lewat textContent.
 */
function isValidMenu(data) {
  return (
    data !== null &&
    typeof data === 'object' &&
    Array.isArray(data.categories) &&
    Array.isArray(data.items)
  );
}

async function fetchMenu() {
  // Pages menyajikan lewat Fastly dengan max-age=600. Tanpa cache-bust, edit owner
  // baru terlihat 10 menit kemudian.
  const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  if (!isValidMenu(data)) throw new Error('Bentuk menu.json tidak valid');
  return data;
}

async function load() {
  show('skeleton');
  try {
    const menu = await fetchMenu();
    renderHeader(menu.cafe, lang);
    const count = renderMenu(view.menu, menu, lang);
    show(count > 0 ? 'menu' : 'empty');
  } catch {
    // Sengaja tidak melaporkan detail error ke UI atau console: tidak berguna bagi
    // pelanggan, dan konvensi project melarang logging yang bisa membocorkan apa pun.
    show('error');
  }
}

document.getElementById('retry')?.addEventListener('click', load);
load();
