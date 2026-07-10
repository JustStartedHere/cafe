// Kamus string statis UI + deteksi & persist bahasa.
// Teks konten (nama item, deskripsi) TIDAK di sini — itu datang dari menu.json.

const STORAGE_KEY = 'lang';
export const LANGS = ['id', 'en'];

const STRINGS = {
  id: {
    signature: 'Signature',
    soldOut: 'Habis',
    emptyTitle: 'Menu segera hadir',
    emptyText: 'Kami sedang menyiapkannya.',
    errorTitle: 'Menu gagal dimuat',
    errorText: 'Periksa koneksi Anda, lalu coba lagi.',
    retry: 'Coba lagi',
    langGroup: 'Pilih bahasa',
    langId: 'Bahasa Indonesia',
    langEn: 'Bahasa Inggris',
    categories: 'Kategori',
  },
  en: {
    signature: 'Signature',
    soldOut: 'Sold out',
    emptyTitle: 'Coming soon',
    emptyText: "We're preparing it.",
    errorTitle: "Couldn't load the menu",
    errorText: 'Check your connection and try again.',
    retry: 'Try again',
    langGroup: 'Select language',
    langId: 'Indonesian',
    langEn: 'English',
    categories: 'Categories',
  },
};

/** Terjemahan string statis. Kunci tak dikenal → string kosong, bukan "undefined". */
export function t(key, lang) {
  const dict = STRINGS[lang] ?? STRINGS.id;
  return dict[key] ?? '';
}

/** Bahasa tersimpan → preferensi perangkat → 'id'. */
export function getLang() {
  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage bisa dilempar (mode privat Safari, cookie diblokir). Bukan error fatal.
  }
  if (LANGS.includes(stored)) return stored;

  const tag = (navigator.language || 'id').toLowerCase();
  return tag.startsWith('id') ? 'id' : 'en';
}

/** Persist pilihan + update `<html lang>`. Gagal menyimpan tidak boleh menggagalkan toggle. */
export function setLang(lang) {
  if (!LANGS.includes(lang)) return;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* abaikan */
  }
}

/**
 * Terapkan string statis ke DOM.
 * `data-i18n` → textContent. `data-i18n-aria-label` → atribut aria-label.
 */
export function applyStatic(lang, root = document) {
  for (const node of root.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n, lang);
  }
  for (const node of root.querySelectorAll('[data-i18n-aria-label]')) {
    node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel, lang));
  }
}
