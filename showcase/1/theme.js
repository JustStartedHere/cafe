// Tema 1 — logika: bahasa, carousel hero, filter kategori. Konten menu (item, brand,
// sosial) dimuat dari data.json saat runtime; string UI tetap dari strings.js.
//
// INVARIAN: seluruh teks lewat `textContent` (helper make()), atribut lewat setAttribute.
// Tidak pernah `innerHTML`. Data berasal dari repo publik yang bisa divandal.

import {
  pickLang, formatPrice, getLang, setLang, LANGS,
  loadMenu, resolveImg, waLink, socialLinks, make, clear, renderSkeleton, renderBrandLogo,
} from '../lib.js';
import { STRINGS, HERO, RESERVE_PREFIX, CONTACT } from './strings.js';

const DATA_URL = new URL('data.json', import.meta.url).href;
const SLIDE_MS = 6000;
const ALL = 'all';

let lang = getLang();
let filter = ALL;
let slide = 0;
let timer = null;
let menu = null;

const el = (id) => document.getElementById(id);
const t = (key) => pickLang(STRINGS[key], lang);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------------ string statis */

function applyStatic() {
  document.documentElement.lang = lang;
  for (const node of document.querySelectorAll('[data-t]')) node.textContent = t(node.dataset.t);
  for (const node of document.querySelectorAll('[data-t-aria-label]')) {
    node.setAttribute('aria-label', t(node.dataset.tAriaLabel));
  }
  for (const button of document.querySelectorAll('[data-lang]')) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
  }
  el('about-img').alt = t('aboutAlt');
}

/* --------------------------------------------------- brand & sosial dr data */

function applyBrand() {
  if (!menu) return;
  const cafe = menu.cafe;
  const name = cafe.name || 'Restaurant';
  for (const node of document.querySelectorAll('.brand__name')) node.textContent = name;
  renderBrandLogo(cafe);
  document.title = `${name} — ${pickLang(cafe.tagline, lang) || t('tagline')}`;

  const wa = waLink(cafe.whatsapp, RESERVE_PREFIX[lang] + name + '.');
  for (const id of ['nav-reserve', 'hero-book', 'about-reserve', 'foot-reserve']) el(id).href = wa;

  const s = socialLinks(cafe);
  el('tb-phone').href = s.whatsapp ? `tel:+${s.whatsapp}` : '#';
  el('tb-phone-text').textContent = CONTACT.phoneDisplay;
  el('tb-email').href = `mailto:${CONTACT.email}`;
  el('tb-email-text').textContent = CONTACT.email;

  const footPhone = el('foot-phone');
  footPhone.href = s.whatsapp ? `tel:+${s.whatsapp}` : '#';
  footPhone.textContent = CONTACT.phoneDisplay;

  for (const prefix of ['social', 'foot']) {
    el(`${prefix}-instagram`).href = s.instagram || '#';
    el(`${prefix}-maps`).href = s.maps || '#';
    el(`${prefix}-tiktok`).href = s.tiktok || '#';
  }
}

/* -------------------------------------------------------------------- hero */

function paintSlide() {
  const s = HERO[slide];
  el('hero-eyebrow').textContent = pickLang(s.eyebrow, lang);
  el('hero-title').textContent = pickLang(s.title, lang);
  el('hero-title-rest').textContent = pickLang(s.titleRest, lang);
  el('hero-accent').textContent = pickLang(s.accent, lang);
  el('hero-text').textContent = pickLang(s.text, lang);
  const img = el('hero-img');
  img.src = s.image; // foto hero milik tema, path relatif halaman — bukan lewat resolveImg
  img.alt = pickLang(s.alt, lang);
  for (const dot of el('hero-dots').children) {
    dot.setAttribute('aria-current', String(Number(dot.dataset.index) === slide));
  }
}

function goTo(index) {
  slide = (index + HERO.length) % HERO.length;
  paintSlide();
}

function buildDots() {
  const root = el('hero-dots');
  clear(root);
  HERO.forEach((_, i) => {
    const dot = make('button', 'hero__dot');
    dot.type = 'button';
    dot.dataset.index = String(i);
    dot.setAttribute('aria-current', String(i === slide));
    dot.addEventListener('click', () => { goTo(i); restartTimer(); });
    root.append(dot);
  });
  labelDots();
}

function labelDots() {
  for (const dot of el('hero-dots').children) {
    dot.setAttribute('aria-label', `${t('heroSlide')} ${Number(dot.dataset.index) + 1}`);
  }
}

function startTimer() {
  if (reducedMotion.matches || timer !== null) return;
  timer = setInterval(() => goTo(slide + 1), SLIDE_MS);
}
function stopTimer() { clearInterval(timer); timer = null; }
function restartTimer() { stopTimer(); startTimer(); }

/* ---------------------------------------------------------------- kategori */

/** Foto lingkaran kategori = item pertama (terurut) di kategori itu yang punya gambar. */
function categoryImage(categoryId) {
  const items = menu.items
    .filter((i) => i.categoryId === categoryId && i.image)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return items.length ? resolveImg(items[0].image) : resolveImg('');
}

function sortedCategories() {
  return [...menu.categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function buildCategories() {
  const root = el('cats');
  clear(root);
  for (const category of sortedCategories()) {
    const li = make('li', 'cat');
    const button = make('button', 'cat__btn');
    button.type = 'button';
    button.dataset.category = category.id;

    const img = make('img', 'cat__img');
    img.src = categoryImage(category.id);
    img.alt = '';
    img.width = 104;
    img.height = 104;
    img.loading = 'lazy';
    img.decoding = 'async';

    button.append(img, make('span', 'cat__name', pickLang(category.name, lang)));
    button.addEventListener('click', () => setFilter(category.id === filter ? ALL : category.id));
    li.append(button);
    root.append(li);
  }
}

function buildTabs() {
  const root = el('tabs');
  clear(root);
  const entries = [{ id: ALL, name: STRINGS.filterAll }, ...sortedCategories()];
  for (const entry of entries) {
    const tab = make('button', 'tab', pickLang(entry.name, lang));
    tab.type = 'button';
    tab.dataset.category = entry.id;
    tab.addEventListener('click', () => setFilter(entry.id));
    root.append(tab);
  }
}

/** Tab dan lingkaran kategori = dua tampilan atas SATU state filter. */
function paintFilterState() {
  for (const tab of el('tabs').children) {
    tab.setAttribute('aria-pressed', String(tab.dataset.category === filter));
  }
  for (const li of el('cats').children) {
    const button = li.firstElementChild;
    button.setAttribute('aria-pressed', String(button.dataset.category === filter));
  }
}

function setFilter(next) {
  filter = next;
  paintFilterState();
  paintDishes();
  snapTabsIntoView();
}

/**
 * Setelah grid menyusut, kalau pengguna sedang di bawah, bawa tab ke puncak. Posisi alir
 * sejati dibaca dengan membuka sticky sesaat (position:static) — `offsetTop`/`rect` goyah
 * saat elemen sticky. Hanya menggulung NAIK.
 */
function snapTabsIntoView() {
  const tabs = el('tabs');
  const prev = tabs.style.position;
  tabs.style.position = 'static';
  let target = 0;
  for (let node = tabs; node; node = node.offsetParent) target += node.offsetTop;
  tabs.style.position = prev;
  if (window.scrollY <= target + 1) return;
  window.scrollTo({ top: target, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}

/* ------------------------------------------------------------------ kartu */

function renderDish(item) {
  const li = make('li', 'dish');
  if (item.available === false) li.classList.add('dish--sold');

  const figure = make('figure', 'dish__media');
  const img = make('img', 'dish__img');
  img.src = resolveImg(item.image);
  img.alt = pickLang(item.name, lang);
  img.width = 800;
  img.height = 600;
  img.loading = 'lazy';
  img.decoding = 'async';
  figure.append(img);

  if (item.available === false) figure.append(make('span', 'badge badge--sold', t('badgeSold') || 'Habis'));
  else if (item.featured) figure.append(make('span', 'badge badge--best', t('badgeBest')));
  else if (item.badge === 'new') figure.append(make('span', 'badge badge--new', t('badgeNew')));
  li.append(figure);

  const body = make('div', 'dish__body');
  body.append(make('h3', 'dish__name', pickLang(item.name, lang)));
  body.append(make('p', 'dish__desc', pickLang(item.description, lang)));
  body.append(make('p', 'dish__price', formatPrice(item.price, menu.cafe.currency || 'IDR', lang)));
  li.append(body);
  return li;
}

/** Item terurut & terkelompok per kategori (order bersifat per-kategori, bukan global). */
function orderedItems() {
  return sortedCategories().flatMap((cat) =>
    menu.items.filter((i) => i.categoryId === cat.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
}

function paintDishes() {
  const root = el('dishes');
  const all = orderedItems();
  const visible = filter === ALL ? all : all.filter((i) => i.categoryId === filter);

  clear(root);
  const fragment = document.createDocumentFragment();
  for (const item of visible) fragment.append(renderDish(item));
  root.append(fragment);

  el('dishes-empty').hidden = visible.length > 0;
  el('menu-status').textContent = `${visible.length} ${t('countLabel')}`;
}

/* ------------------------------------------------------------------ bahasa */

function switchLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  setLang(lang);
  applyStatic();
  labelDots();
  paintSlide();
  if (menu) {
    applyBrand();
    buildCategories();
    buildTabs();
    paintFilterState();
    paintDishes();
  }
}

/* --------------------------------------------------------- muat & render */

function renderMenu() {
  applyBrand();
  buildCategories();
  buildTabs();
  paintFilterState();
  paintDishes();
}

function showError() {
  const root = el('dishes');
  clear(root);
  el('menu-status').textContent = '';
  el('dishes-empty').hidden = true;
  const box = make('div', 'dishes__error');
  box.append(make('p', 'dishes__error-title', t('errorTitle')));
  const retry = make('button', 'button button--gold', t('retry'));
  retry.type = 'button';
  retry.addEventListener('click', load);
  box.append(retry);
  root.append(box);
}

async function load() {
  el('menu-status').textContent = t('loading');
  el('dishes-empty').hidden = true;
  renderSkeleton(el('dishes'));
  try {
    menu = await loadMenu(DATA_URL);
    renderMenu();
  } catch {
    showError();
  }
}

/* -------------------------------------------------------------------- init */

applyStatic();
buildDots();
paintSlide();

for (const button of document.querySelectorAll('[data-lang]')) {
  button.addEventListener('click', () => switchLang(button.dataset.lang));
}

el('hero-prev').addEventListener('click', () => { goTo(slide - 1); restartTimer(); });
el('hero-next').addEventListener('click', () => { goTo(slide + 1); restartTimer(); });

// Swipe foto hero di layar sentuh. Ambang 40px agar tap tak terpicu.
const media = document.querySelector('.hero__media');
let swipeX = null;
media.addEventListener('touchstart', (e) => { swipeX = e.changedTouches[0].clientX; }, { passive: true });
media.addEventListener('touchend', (e) => {
  if (swipeX === null) return;
  const dx = e.changedTouches[0].clientX - swipeX;
  swipeX = null;
  if (Math.abs(dx) < 40) return;
  goTo(dx < 0 ? slide + 1 : slide - 1);
  restartTimer();
}, { passive: true });

const hero = document.querySelector('.hero');
hero.addEventListener('mouseenter', stopTimer);
hero.addEventListener('mouseleave', startTimer);
hero.addEventListener('focusin', stopTimer);
hero.addEventListener('focusout', startTimer);
reducedMotion.addEventListener('change', () => (reducedMotion.matches ? stopTimer() : startTimer()));

startTimer();
load();
