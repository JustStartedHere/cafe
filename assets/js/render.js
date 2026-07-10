// Render DOM dari menu.json.
//
// INVARIAN: seluruh teks dari menu.json masuk lewat `textContent`, atribut lewat
// `setAttribute`. Tidak pernah `innerHTML`. Repo ini publik dan bisa divandal;
// halaman pelanggan tidak boleh jadi vektor XSS.

import { pickLang, formatPrice, imageSrc, groupByCategory, PLACEHOLDER_IMAGE } from './util.js';

// Kamus sementara; Phase 2 memindahkannya ke i18n.js bersama toggle bahasa.
const STRINGS = {
  id: { signature: 'Signature', soldOut: 'Habis' },
  en: { signature: 'Signature', soldOut: 'Sold out' },
};

// Jumlah kartu teratas yang dimuat eager — sisanya lazy. Menjaga LCP tanpa membanjiri jaringan.
const EAGER_CARDS = 2;

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function text(tag, className, value) {
  const node = el(tag, className);
  node.textContent = value;
  return node;
}

/** Kartu satu item. `eager` hanya untuk kartu paling atas. */
function renderCard(item, lang, currency, eager) {
  const t = STRINGS[lang] ?? STRINGS.id;
  const name = pickLang(item.name, lang);
  const description = pickLang(item.description, lang);
  const available = item.available !== false;

  const card = el('li', 'card');
  if (!available) card.classList.add('card--unavailable');

  const figure = el('figure', 'card__media');

  const img = el('img', 'card__img');
  img.src = imageSrc(item);
  img.alt = name;
  img.width = 400;
  img.height = 300;
  img.decoding = 'async';
  if (eager) {
    img.loading = 'eager';
    img.setAttribute('fetchpriority', 'high');
  } else {
    img.loading = 'lazy';
  }
  // Gambar hilang/rusak → placeholder. Sekali saja, agar placeholder yang gagal
  // tidak memicu loop onerror tak berujung.
  img.addEventListener('error', function handleError() {
    img.removeEventListener('error', handleError);
    img.src = PLACEHOLDER_IMAGE;
  });
  figure.append(img);

  if (item.featured && available) {
    figure.append(text('span', 'badge badge--featured', t.signature));
  }
  if (!available) {
    figure.append(text('span', 'badge badge--sold-out', t.soldOut));
  }
  card.append(figure);

  const body = el('div', 'card__body');
  body.append(text('h3', 'card__name', name));
  if (description) body.append(text('p', 'card__desc', description));
  body.append(text('p', 'card__price', formatPrice(item.price, currency, lang)));
  card.append(body);

  return card;
}

/** Satu <section> per kategori, berisi <ul> kartu. */
function renderSection(group, lang, currency, startIndex) {
  const { category, items } = group;

  const section = el('section', 'section');
  section.id = `cat-${category.id}`;
  const heading = text('h2', 'section__title', pickLang(category.name, lang));
  const headingId = `heading-${category.id}`;
  heading.id = headingId;
  section.setAttribute('aria-labelledby', headingId);
  section.append(heading);

  const list = el('ul', 'grid');
  items.forEach((item, i) => {
    list.append(renderCard(item, lang, currency, startIndex + i < EAGER_CARDS));
  });
  section.append(list);

  return section;
}

/** Kosongkan node tanpa innerHTML. */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Header: nama cafe + tagline. */
export function renderHeader(cafe, lang) {
  const nameNode = document.getElementById('cafe-name');
  const taglineNode = document.getElementById('cafe-tagline');
  if (nameNode) nameNode.textContent = cafe?.name ?? '';
  if (taglineNode) taglineNode.textContent = pickLang(cafe?.tagline, lang);
}

/**
 * Render seluruh menu ke `root`.
 * @returns {number} jumlah item yang benar-benar dirender.
 */
export function renderMenu(root, menu, lang) {
  const groups = groupByCategory(menu);
  const currency = menu.cafe?.currency ?? 'IDR';

  clear(root);
  const fragment = document.createDocumentFragment();
  let rendered = 0;
  for (const group of groups) {
    fragment.append(renderSection(group, lang, currency, rendered));
    rendered += group.items.length;
  }
  root.append(fragment);
  return rendered;
}
