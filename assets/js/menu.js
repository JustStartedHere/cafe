// Entry point halaman publik: fetch menu.json, kelola state UI, bahasa, scroll-spy.

import { getLang, setLang, applyStatic, LANGS } from './i18n.js';
import { renderMenu, renderHeader } from './render.js';

const DATA_URL = 'data/menu.json';

const view = {
  skeleton: document.getElementById('skeleton'),
  menu: document.getElementById('menu'),
  empty: document.getElementById('empty'),
  error: document.getElementById('error'),
};
const chipsRoot = document.getElementById('chips');
const header = document.querySelector('.header');

let lang = getLang();
let menuData = null; // cache: toggle bahasa tidak boleh memicu fetch ulang
let spy = null;
let onScroll = null;

/** Tampilkan tepat satu state; sisanya disembunyikan. Tidak pernah layar kosong. */
function show(state) {
  for (const [name, node] of Object.entries(view)) {
    if (node) node.hidden = name !== state;
  }
  // Strip chip tetap ada saat skeleton — tingginya menahan layout agar tidak bergeser.
  // Baru disembunyikan kalau memang tak ada kategori untuk ditampilkan.
  if (chipsRoot) chipsRoot.hidden = state === 'empty' || state === 'error';
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

/** Tinggi header sticky → offset anchor agar judul seksi tidak tertutup. */
function syncHeaderHeight() {
  if (!header) return 0;
  const h = header.offsetHeight;
  document.documentElement.style.setProperty('--header-h', `${h}px`);
  return h;
}

/**
 * Scroll-spy: tandai chip kategori yang seksinya sedang dibaca.
 *
 * IntersectionObserver menangani kasus umum tanpa kerja saat halaman diam, tapi ia
 * tidak cukup sendirian: seksi terakhir yang pendek tak pernah bisa mencapai pita
 * observasi karena halaman kehabisan ruang scroll. Karena itu ada listener scroll
 * pasif yang hanya bertugas mendeteksi "sudah di dasar" — di situ pemenangnya adalah
 * seksi terlihat *terakhir*, bukan yang pertama.
 */
function initScrollSpy(sectionIds, headerH) {
  teardownSpy();
  if (sectionIds.length === 0) return;

  const chips = new Map(
    [...chipsRoot.querySelectorAll('.chip')].map((chip) => [chip.dataset.target, chip]),
  );
  const visible = new Set();
  let active = null;

  const setActive = (id, { reveal = true } = {}) => {
    if (!id || id === active) return;
    if (active) chips.get(active)?.removeAttribute('aria-current');
    active = id;
    const chip = chips.get(id);
    if (!chip) return;
    chip.setAttribute('aria-current', 'true');
    // Jaga chip aktif tetap terlihat di strip horizontal, tanpa menggeser halaman.
    // Dilewati saat init: pembacaan scrollWidth memaksa reflow di jalur kritis.
    if (reveal && chipsRoot.scrollWidth > chipsRoot.clientWidth) {
      chip.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    }
  };

  const atBottom = () =>
    Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2;

  const update = () => {
    const ordered = sectionIds.filter((id) => visible.has(id));
    if (ordered.length === 0) return; // seksi lebih tinggi dari pita: pertahankan yang aktif
    setActive(atBottom() ? ordered[ordered.length - 1] : ordered[0]);
  };

  spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }
      update();
    },
    { rootMargin: `-${headerH + 1}px 0px -55% 0px` },
  );

  for (const id of sectionIds) {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  }

  let ticking = false;
  onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  };
  addEventListener('scroll', onScroll, { passive: true });

  setActive(sectionIds[0], { reveal: false });
}

function teardownSpy() {
  spy?.disconnect();
  spy = null;
  if (onScroll) removeEventListener('scroll', onScroll);
  onScroll = null;
}

/**
 * Gambar ulang seluruh konten dengan bahasa saat ini. Tanpa fetch.
 *
 * Pemasangan scroll-spy sengaja ditunda ke frame berikutnya. Ia membaca `offsetHeight`
 * dan `scrollWidth`, yang memaksa reflow; digabung dengan render, keduanya menjadi satu
 * long task ~250 ms di CPU lambat. Dipisah, tiap task tinggal di bawah ambang 50 ms
 * dan pelanggan melihat menu lebih cepat.
 */
function paint() {
  applyStatic(lang);
  syncLangButtons();
  if (!menuData) return;

  renderHeader(menuData.cafe, lang);
  const { count, sectionIds } = renderMenu(view.menu, chipsRoot, menuData, lang);
  show(count > 0 ? 'menu' : 'empty');

  requestAnimationFrame(() => {
    const headerH = syncHeaderHeight();
    initScrollSpy(sectionIds, headerH);
  });
}

function syncLangButtons() {
  for (const button of document.querySelectorAll('[data-lang]')) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
  }
}

async function load() {
  show('skeleton');
  try {
    menuData = await fetchMenu();
    paint();
  } catch {
    // Sengaja tidak melaporkan detail error ke UI atau console: tidak berguna bagi
    // pelanggan, dan konvensi project melarang logging yang bisa membocorkan apa pun.
    menuData = null;
    teardownSpy();
    show('error');
  }
}

for (const button of document.querySelectorAll('[data-lang]')) {
  button.addEventListener('click', () => {
    const next = button.dataset.lang;
    if (!LANGS.includes(next) || next === lang) return;
    lang = next;
    setLang(lang);
    paint();
  });
}

document.getElementById('retry')?.addEventListener('click', load);
addEventListener('resize', syncHeaderHeight, { passive: true });

setLang(lang);
applyStatic(lang);
syncLangButtons();
syncHeaderHeight();
load();
