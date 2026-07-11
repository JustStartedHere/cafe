// Engine tampilan menu bersama untuk tema showcase 2–4. Memuat data.json, merender
// tab kategori + kartu hidangan, toggle bahasa, tautan sosial, state loading/error.
// Tema hanya menyediakan shell HTML (dengan id/atribut kontrak di bawah) + CSS-nya.
//
// INVARIAN: seluruh teks lewat make()/textContent; href sosial hanya https (dari lib).
//
// Kontrak elemen yang WAJIB ada di HTML tema:
//   [data-lang="id"|"en"]   tombol bahasa
//   [data-t="key"]          teks statis dari `strings`
//   [data-t-aria-label]     aria-label statis
//   #tabs                   wadah tab filter kategori
//   #dishes                 <ul> kartu hidangan
//   #dishes-empty           pesan kosong (punya data-t)
//   #menu-status            hitungan live
//   .brand__name            nama usaha (boleh banyak)
// OPSIONAL:
//   [data-brand-tagline]    diisi tagline
//   [data-social="instagram"|"tiktok"|"maps"|"wa"]  href diisi runtime
//   #cats                   strip lingkaran kategori

import {
  pickLang, formatPrice, getLang, setLang, LANGS,
  loadMenu, resolveImg, waLink, socialLinks, make, clear, renderSkeleton, renderBrandLogo, renderHours,
} from './lib.js';

const ALL = 'all';

export function initMenuView({ dataUrl, strings, reservePrefix }) {
  let lang = getLang();
  let filter = ALL;
  let menu = null;

  const el = (id) => document.getElementById(id);
  const t = (key) => pickLang(strings[key], lang);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------- statis */

  function applyStatic() {
    document.documentElement.lang = lang;
    for (const node of document.querySelectorAll('[data-t]')) node.textContent = t(node.dataset.t);
    for (const node of document.querySelectorAll('[data-t-aria-label]')) {
      node.setAttribute('aria-label', t(node.dataset.tAriaLabel));
    }
    for (const button of document.querySelectorAll('[data-lang]')) {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    }
  }

  function applyBrand() {
    if (!menu) return;
    const cafe = menu.cafe;
    const name = cafe.name || 'Restaurant';
    for (const node of document.querySelectorAll('.brand__name')) node.textContent = name;
    for (const node of document.querySelectorAll('[data-brand-tagline]')) {
      node.textContent = pickLang(cafe.tagline, lang);
    }
    renderBrandLogo(cafe);
    renderHours(cafe, lang);
    document.title = `${name}${cafe.tagline ? ' — ' + pickLang(cafe.tagline, lang) : ''}`;

    const s = socialLinks(cafe);
    const wa = s.whatsapp ? waLink(s.whatsapp, (reservePrefix?.[lang] ?? '') + name) : '';
    for (const node of document.querySelectorAll('[data-social]')) {
      const kind = node.dataset.social;
      const href = kind === 'wa' ? wa : s[kind];
      if (href) { node.href = href; node.hidden = false; }
      else { node.hidden = true; node.removeAttribute('href'); }
    }
  }

  /* ------------------------------------------------------------ kategori */

  const sortedCategories = () => [...menu.categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  function orderedItems() {
    return sortedCategories().flatMap((cat) =>
      menu.items.filter((i) => i.categoryId === cat.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  }

  function categoryImage(categoryId) {
    const items = orderedItems().filter((i) => i.categoryId === categoryId && i.image);
    return resolveImg(items[0]?.image ?? '');
  }

  function buildTabs() {
    const root = el('tabs');
    if (!root) return;
    clear(root);
    const entries = [{ id: ALL, name: strings.filterAll }, ...sortedCategories()];
    for (const entry of entries) {
      const tab = make('button', 'tab', pickLang(entry.name, lang));
      tab.type = 'button';
      tab.dataset.category = entry.id;
      tab.addEventListener('click', () => setFilter(entry.id));
      root.append(tab);
    }
  }

  function buildCats() {
    const root = el('cats');
    if (!root) return;
    clear(root);
    for (const category of sortedCategories()) {
      const li = make('li', 'cat');
      const button = make('button', 'cat__btn');
      button.type = 'button';
      button.dataset.category = category.id;
      const img = make('img', 'cat__img');
      img.src = categoryImage(category.id);
      img.alt = '';
      img.width = 96;
      img.height = 96;
      img.loading = 'lazy';
      img.decoding = 'async';
      button.append(img, make('span', 'cat__name', pickLang(category.name, lang)));
      button.addEventListener('click', () => setFilter(category.id === filter ? ALL : category.id));
      li.append(button);
      root.append(li);
    }
  }

  function paintFilterState() {
    for (const tab of el('tabs')?.children ?? []) {
      tab.setAttribute('aria-pressed', String(tab.dataset.category === filter));
    }
    for (const li of el('cats')?.children ?? []) {
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

  /** Bawa tab sticky ke puncak saat filter dari bawah memendekkan halaman. Hanya naik. */
  function snapTabsIntoView() {
    const tabs = el('tabs');
    if (!tabs) return;
    const prev = tabs.style.position;
    tabs.style.position = 'static';
    let target = 0;
    for (let node = tabs; node; node = node.offsetParent) target += node.offsetTop;
    tabs.style.position = prev;
    if (window.scrollY <= target + 1) return;
    window.scrollTo({ top: target, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }

  /* --------------------------------------------------------------- kartu */

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

    if (item.available === false) figure.append(make('span', 'badge badge--sold', t('badgeSold')));
    else if (item.featured) figure.append(make('span', 'badge badge--best', t('badgeBest')));
    else if (item.badge === 'new') figure.append(make('span', 'badge badge--new', t('badgeNew')));
    li.append(figure);

    const body = make('div', 'dish__body');
    body.append(make('h3', 'dish__name', pickLang(item.name, lang)));
    const desc = pickLang(item.description, lang);
    if (desc) body.append(make('p', 'dish__desc', desc));
    body.append(make('p', 'dish__price', formatPrice(item.price, menu.cafe.currency || 'IDR', lang)));
    li.append(body);
    return li;
  }

  function paintDishes() {
    const root = el('dishes');
    const all = orderedItems();
    const visible = filter === ALL ? all : all.filter((i) => i.categoryId === filter);
    clear(root);
    const fragment = document.createDocumentFragment();
    for (const item of visible) fragment.append(renderDish(item));
    root.append(fragment);
    const empty = el('dishes-empty');
    if (empty) empty.hidden = visible.length > 0;
    const status = el('menu-status');
    if (status) status.textContent = `${visible.length} ${t('countLabel')}`;
  }

  /* ---------------------------------------------------------- muat/render */

  function renderMenu() {
    applyBrand();
    buildCats();
    buildTabs();
    paintFilterState();
    paintDishes();
  }

  function showError() {
    const root = el('dishes');
    clear(root);
    const status = el('menu-status');
    if (status) status.textContent = '';
    const empty = el('dishes-empty');
    if (empty) empty.hidden = true;
    const box = make('div', 'dishes__error');
    box.append(make('p', 'dishes__error-title', t('errorTitle')));
    const retry = make('button', 'button', t('retry'));
    retry.type = 'button';
    retry.addEventListener('click', load);
    box.append(retry);
    root.append(box);
  }

  async function load() {
    const status = el('menu-status');
    if (status) status.textContent = t('loading');
    const empty = el('dishes-empty');
    if (empty) empty.hidden = true;
    renderSkeleton(el('dishes'));
    try {
      menu = await loadMenu(dataUrl);
      renderMenu();
    } catch {
      showError();
    }
  }

  function switchLang(next) {
    if (!LANGS.includes(next) || next === lang) return;
    lang = next;
    setLang(lang);
    applyStatic();
    if (menu) renderMenu();
  }

  /* ----------------------------------------------------------------- init */

  applyStatic();
  for (const button of document.querySelectorAll('[data-lang]')) {
    button.addEventListener('click', () => switchLang(button.dataset.lang));
  }
  load();
}
