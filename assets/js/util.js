// Helper murni: tanpa DOM, tanpa fetch. Dipakai render.js dan menu.js.

// Path gambar di `menu.json` (mis. `images/foo.webp`) relatif terhadap AKAR SITUS, bukan
// terhadap halaman yang memuatnya. Halaman pelanggan tinggal di `/menu/`, jadi resolusi
// bawaan browser akan meleset. Akar dihitung dari lokasi modul ini (`assets/js/`).
const SITE_ROOT = new URL('../../', import.meta.url);

export const PLACEHOLDER_IMAGE = new URL('assets/img/placeholder.svg', SITE_ROOT).href;

const LOCALES = { id: 'id-ID', en: 'en-US' };

/**
 * Ambil teks dari field bilingual `{ id, en }`.
 * `en` kosong → jatuh ke `id`. Selalu mengembalikan string.
 */
export function pickLang(field, lang) {
  if (!field || typeof field !== 'object') return '';
  const value = field[lang];
  if (typeof value === 'string' && value.trim() !== '') return value;
  const fallback = field.id;
  return typeof fallback === 'string' ? fallback : '';
}

/** Rupiah bulat: 22000 → "Rp 22.000". Harga invalid → string kosong, bukan "NaN". */
export function formatPrice(price, currency, lang) {
  if (!Number.isFinite(price)) return '';
  return new Intl.NumberFormat(LOCALES[lang] ?? LOCALES.id, {
    style: 'currency',
    currency: currency || 'IDR',
    maximumFractionDigits: 0,
  }).format(price);
}

// Hanya path relatif ke `images/`, `assets/`, atau `showcase/` yang diterima. Tanpa skema,
// tanpa traversal, tanpa `//host`. (`showcase/menu-img/` = foto contoh bersama.)
const SAFE_IMAGE = /^(images|assets|showcase)\/[A-Za-z0-9._/-]+$/;

/**
 * Path gambar item, dengan placeholder saat kosong atau tidak tepercaya.
 *
 * Repo ini publik dan bisa divandal: `image` bisa saja berisi `javascript:…` atau
 * `//evil.example/x.png`. `<img>` tidak mengeksekusi `javascript:`, dan `onerror`
 * akan menangkapnya — tapi bergantung pada penanganan error sebagai lapisan keamanan
 * adalah kebiasaan buruk. Tolak di depan.
 */
export function imageSrc(item) {
  const src = typeof item.image === 'string' ? item.image.trim() : '';
  if (src === '' || src.includes('..') || !SAFE_IMAGE.test(src)) return PLACEHOLDER_IMAGE;
  return new URL(src, SITE_ROOT).href;
}

/**
 * Kelompokkan item ke dalam kategori, keduanya terurut menurut `order`.
 * Item dengan `categoryId` tak dikenal dibuang — bukan dirender di kategori asal-asalan.
 * Kategori tanpa item ikut dibuang agar tidak ada heading kosong.
 */
export function groupByCategory(menu) {
  const categories = [...(menu.categories ?? [])].sort(byOrder);
  const items = menu.items ?? [];
  return categories
    .map((category) => ({
      category,
      items: items.filter((item) => item.categoryId === category.id).sort(byOrder),
    }))
    .filter((group) => group.items.length > 0);
}

function byOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0);
}
