// Helper murni: tanpa DOM, tanpa fetch. Dipakai render.js dan menu.js.

export const PLACEHOLDER_IMAGE = 'assets/img/placeholder.svg';

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

/** Path gambar item, dengan placeholder saat kosong. */
export function imageSrc(item) {
  const src = typeof item.image === 'string' ? item.image.trim() : '';
  return src === '' ? PLACEHOLDER_IMAGE : src;
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
