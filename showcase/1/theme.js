// Tema 1 — logika: bahasa, carousel hero, filter kategori.
//
// INVARIAN: seluruh teks masuk lewat `textContent`, atribut lewat `setAttribute`.
// Tidak pernah `innerHTML`. Data di sini memang milik kita sendiri, tapi pola yang
// dilanggar di satu tempat akan menular ke halaman pelanggan.

import { pickLang, formatPrice } from '../../assets/js/util.js';
import { getLang, setLang, LANGS } from '../../assets/js/i18n.js';
import { RESTAURANT_NAME, PHONE_DISPLAY, EMAIL, WHATSAPP, waLink } from '../config.js';
import { STRINGS, RESERVE_MESSAGE, HERO, CATEGORIES, ITEMS } from './data.js';

const SLIDE_MS = 6000;
const ALL = 'all';

let lang = getLang();
let filter = ALL;
let slide = 0;
let timer = null;

const el = (id) => document.getElementById(id);
const t = (key) => pickLang(STRINGS[key], lang);

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/* ------------------------------------------------------------------ bahasa */

function applyStatic() {
  document.documentElement.lang = lang;
  for (const node of document.querySelectorAll('[data-t]')) {
    node.textContent = t(node.dataset.t);
  }
  for (const node of document.querySelectorAll('[data-t-aria-label]')) {
    node.setAttribute('aria-label', t(node.dataset.tAriaLabel));
  }
  for (const button of document.querySelectorAll('[data-lang]')) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
  }

  // Kontak & reservasi: href-nya dihitung, bukan ditulis di HTML.
  const wa = waLink(pickLang(RESERVE_MESSAGE, lang));
  for (const id of ['nav-reserve', 'hero-book', 'about-reserve', 'foot-reserve']) {
    el(id).href = wa;
  }

  el('tb-phone').href = `tel:+${WHATSAPP}`;
  el('tb-phone-text').textContent = PHONE_DISPLAY;
  el('tb-email').href = `mailto:${EMAIL}`;
  el('tb-email-text').textContent = EMAIL;

  const footPhone = el('foot-phone');
  footPhone.href = `tel:+${WHATSAPP}`;
  footPhone.textContent = PHONE_DISPLAY;

  el('about-img').alt = t('aboutAlt');
  document.title = `${RESTAURANT_NAME} — ${t('tagline')}`;
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
  img.src = s.image;
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
    dot.addEventListener('click', () => {
      goTo(i);
      restartTimer();
    });
    root.append(dot);
  });
  labelDots();
}

/** Label dot ikut bahasa; dipanggil ulang saat bahasa berubah. */
function labelDots() {
  for (const dot of el('hero-dots').children) {
    dot.setAttribute('aria-label', `${t('heroSlide')} ${Number(dot.dataset.index) + 1}`);
  }
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function startTimer() {
  // Auto-advance adalah gerak yang tidak diminta pengguna. Hormati preferensinya.
  if (reducedMotion.matches || timer !== null) return;
  timer = setInterval(() => goTo(slide + 1), SLIDE_MS);
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
}

function restartTimer() {
  stopTimer();
  startTimer();
}

/* --------------------------------------------------------------- kategori */

function buildCategories() {
  const root = el('cats');
  clear(root);
  for (const category of CATEGORIES) {
    const li = make('li', 'cat');
    const button = make('button', 'cat__btn');
    button.type = 'button';
    button.dataset.category = category.id;

    const img = make('img', 'cat__img');
    img.src = category.image;
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
  const entries = [{ id: ALL, name: STRINGS.filterAll }, ...CATEGORIES];
  for (const entry of entries) {
    const tab = make('button', 'tab', pickLang(entry.name, lang));
    tab.type = 'button';
    tab.dataset.category = entry.id;
    tab.addEventListener('click', () => setFilter(entry.id));
    root.append(tab);
  }
}

/** Tab dan lingkaran kategori adalah dua tampilan atas SATU state. */
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
}

/* ------------------------------------------------------------------ kartu */

function renderDish(item) {
  const li = make('li', 'dish');

  const figure = make('figure', 'dish__media');
  const img = make('img', 'dish__img');
  img.src = item.image;
  img.alt = pickLang(item.name, lang);
  img.width = 800;
  img.height = 600;
  img.loading = 'lazy';
  img.decoding = 'async';
  figure.append(img);

  if (item.badge === 'best') figure.append(make('span', 'badge badge--best', t('badgeBest')));
  if (item.badge === 'new') figure.append(make('span', 'badge badge--new', t('badgeNew')));
  li.append(figure);

  const body = make('div', 'dish__body');
  body.append(make('h3', 'dish__name', pickLang(item.name, lang)));
  body.append(make('p', 'dish__desc', pickLang(item.description, lang)));
  body.append(make('p', 'dish__price', formatPrice(item.price, 'IDR', lang)));
  li.append(body);

  return li;
}

function paintDishes() {
  const root = el('dishes');
  const visible = filter === ALL ? ITEMS : ITEMS.filter((item) => item.categoryId === filter);

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
  buildCategories();
  buildTabs();
  paintFilterState();
  paintDishes();
}

/* -------------------------------------------------------------------- init */

applyStatic();
buildDots();
paintSlide();
buildCategories();
buildTabs();
paintFilterState();
paintDishes();

for (const button of document.querySelectorAll('[data-lang]')) {
  button.addEventListener('click', () => switchLang(button.dataset.lang));
}

const hero = document.querySelector('.hero');
hero.addEventListener('mouseenter', stopTimer);
hero.addEventListener('mouseleave', startTimer);
hero.addEventListener('focusin', stopTimer);
hero.addEventListener('focusout', startTimer);
reducedMotion.addEventListener('change', () => (reducedMotion.matches ? stopTimer() : startTimer()));

startTimer();
