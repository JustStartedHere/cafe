// Runtime bersama untuk semua tema showcase. Memuat data.json (cache-busted, dengan
// state loading/error), menyediakan helper DOM XSS-safe, resolusi path gambar dengan
// allowlist, dan tautan WhatsApp. Tema mengimpor ini lalu merender tata letaknya sendiri.
//
// INVARIAN: render lewat `make()`/`textContent`, tidak pernah `innerHTML` — data berasal
// dari repo publik yang bisa divandal. `resolveImg` menolak path di luar allowlist alih-alih
// bergantung pada `onerror`.

import { pickLang, formatPrice } from '../assets/js/util.js';
import { getLang, setLang, LANGS } from '../assets/js/i18n.js';

export { pickLang, formatPrice, getLang, setLang, LANGS };

// Akar repo (cafe/). Path gambar di data.json disimpan root-relative
// (mis. `showcase/menu-img/x.webp`), jadi harus diselesaikan terhadap akar,
// bukan terhadap halaman tema yang tinggal di showcase/N/.
export const SITE_ROOT = new URL('../', import.meta.url);
export const PLACEHOLDER_IMAGE = new URL('assets/img/placeholder.svg', SITE_ROOT).href;

// Path gambar tepercaya: hanya folder foto yang dikenal, tanpa skema/traversal/`//host`.
const SAFE_IMAGE = /^(images|assets|showcase)\/[A-Za-z0-9._/-]+$/;

/** URL gambar absolut, atau placeholder bila kosong/tidak tepercaya. */
export function resolveImg(path) {
  const src = typeof path === 'string' ? path.trim() : '';
  if (src === '' || src.includes('..') || !SAFE_IMAGE.test(src)) return PLACEHOLDER_IMAGE;
  return new URL(src, SITE_ROOT).href;
}

/** Buat elemen; `text` di-set lewat textContent (tidak pernah innerHTML). */
export function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Muat data.json cache-busted. GitHub Pages menyajikan lewat Fastly dengan
 * `max-age=600`; owner yang baru menyimpan harus langsung melihat perubahannya.
 * Melempar Error berpesan Indonesia bila gagal/rusak — pemanggil menampilkan state error.
 */
export async function loadMenu(url) {
  let res;
  try {
    res = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
  } catch {
    throw new Error('Gagal memuat menu. Periksa koneksi Anda.');
  }
  if (!res.ok) throw new Error(`Gagal memuat menu (${res.status}).`);
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Data menu rusak.');
  }
  if (!data || !Array.isArray(data.items) || !Array.isArray(data.categories)) {
    throw new Error('Format data menu tidak dikenal.');
  }
  data.cafe = data.cafe && typeof data.cafe === 'object' ? data.cafe : {};
  return data;
}

/** Kategori terurut, tiap-tiap membawa item-nya yang juga terurut. Kategori kosong dibuang. */
export function groupByCategory(menu) {
  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
  return [...menu.categories]
    .sort(byOrder)
    .map((category) => ({
      category,
      items: menu.items.filter((i) => i.categoryId === category.id).sort(byOrder),
    }))
    .filter((g) => g.items.length > 0);
}

/** wa.me dengan pesan terisi. `encodeURIComponent` wajib (pesan berisi spasi/tanda baca). */
export function waLink(whatsapp, message) {
  const number = String(whatsapp || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Ambil sosial dari meta `cafe`, kosongkan yang bukan URL http(s) atau wa. */
export function socialLinks(cafe = {}) {
  const ok = (v) => (typeof v === 'string' && /^https?:\/\//i.test(v.trim()) ? v.trim() : '');
  return {
    instagram: ok(cafe.instagram),
    tiktok: ok(cafe.tiktok),
    maps: ok(cafe.maps),
    whatsapp: String(cafe.whatsapp || '').replace(/[^0-9]/g, ''),
  };
}
