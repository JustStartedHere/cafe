// Entry point halaman publik: fetch menu.json, kelola state UI, bahasa, scroll-spy.

import { getLang, setLang, applyStatic, LANGS } from './i18n.js';
import { renderMenu, renderHeader, renderFooter } from './render.js';

// Relatif terhadap modul ini (`assets/js/`), bukan terhadap halaman pemanggil — halaman
// pelanggan ada di `/menu/`, sementara datanya tetap di akar situs.
const DATA_URL = new URL('../../data/menu.json', import.meta.url).href;

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
let onScroll = null;
let onChipClick = null;

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
 * Dihitung dari geometri, bukan IntersectionObserver. IO dengan pita sempit
 * (`rootMargin` negatif) rapuh untuk dua kasus nyata:
 *   - Seksi terakhir yang pendek tidak pernah bisa mencapai pita, karena halaman
 *     kehabisan ruang scroll. Chip akan tetap menyorot kategori pertama padahal
 *     pelanggan sudah melihat kategori terakhir.
 *   - Di layar lebar seluruh menu muat tanpa scroll sama sekali.
 * Membaca `getBoundingClientRect()` untuk beberapa seksi, di-throttle rAF dan hanya
 * saat scroll, jauh lebih murah daripada kerumitan menambal kedua kasus itu.
 */
function initScrollSpy(sectionIds, headerH) {
  teardownSpy();
  if (sectionIds.length === 0) return;

  const chips = new Map(
    [...chipsRoot.querySelectorAll('.chip')].map((chip) => [chip.dataset.target, chip]),
  );
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

  const scrollable = () => document.documentElement.scrollHeight > window.innerHeight + 2;
  const atBottom = () =>
    Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2;

  /** Seksi terakhir yang judulnya sudah melewati garis bawah header. */
  const pick = () => {
    if (atBottom()) return sectionIds[sectionIds.length - 1];

    const line = headerH + 8;
    let current = sectionIds[0];
    for (const id of sectionIds) {
      const section = document.getElementById(id);
      if (!section) continue;
      if (section.getBoundingClientRect().top > line) break;
      current = id;
    }
    return current;
  };

  const update = () => {
    // Menu muat seluruhnya tanpa scroll: tidak ada yang "sedang dibaca", jadi jangan
    // menimpa chip yang barusan diklik pelanggan.
    if (!scrollable()) return;
    setActive(pick());
  };

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

  // Mengklik chip adalah pernyataan niat: sorot langsung. Tanpa ini, di layar yang
  // cukup lebar sehingga menu tak perlu di-scroll, klik chip tidak menyalakan apa pun.
  onChipClick = (event) => {
    const chip = event.target.closest('.chip');
    if (chip?.dataset.target) setActive(chip.dataset.target);
  };
  chipsRoot.addEventListener('click', onChipClick);

  setActive(sectionIds[0], { reveal: false });
}

function teardownSpy() {
  if (onScroll) removeEventListener('scroll', onScroll);
  onScroll = null;
  if (onChipClick) chipsRoot?.removeEventListener('click', onChipClick);
  onChipClick = null;
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
  renderFooter(menuData.cafe, lang);
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
