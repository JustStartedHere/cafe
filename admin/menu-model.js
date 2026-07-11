// Model menu: validasi + mutator murni. Tanpa DOM, tanpa jaringan.
//
// INVARIAN PROJECT: setiap edit adalah fungsi `(menu) => menu`, bukan snapshot hasil.
// Saat PUT membalas 409 (sha basi), menu-store mengambil ulang menu.json yang segar
// lalu menerapkan mutator yang SAMA ke isi terbaru. Kalau mutator menyimpan hasil jadi
// (mis. indeks array yang dihitung dari salinan lama), perubahan orang lain akan tertimpa.
// Karena itu: mutator selalu mencari berdasarkan `id`, tidak pernah berdasarkan posisi.

export class InvalidMenuError extends Error {
  /** @param {string[]} issues daftar masalah dalam bahasa Indonesia, siap ditampilkan */
  constructor(issues) {
    super(issues.join(' '));
    this.name = 'InvalidMenuError';
    this.issues = issues;
  }
}

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** `itm_` + 5 karakter acak. Tidak pernah dipakai ulang; tabrakan praktis mustahil. */
export function newItemId(existing = new Set()) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    const suffix = [...bytes].map((b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
    const id = `itm_${suffix}`;
    if (!existing.has(id)) return id;
  }
  throw new Error('Gagal membuat id unik');
}

/** Slug kategori dari nama Indonesia: "Non-Kopi" → "non-kopi". */
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

/* -------------------------------------------------------------- validasi */

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Field bilingual: `id` wajib, `en` opsional (kosong → fallback ke `id` saat render). */
function normalizeBilingual(field, label, issues, { required = true } = {}) {
  const source = isPlainObject(field) ? field : {};
  const id = typeof source.id === 'string' ? source.id.trim() : '';
  const en = typeof source.en === 'string' ? source.en.trim() : '';
  if (required && id === '') issues.push(`${label} (Indonesia) wajib diisi.`);
  return { id, en };
}

/** Harga: rupiah bulat, tidak negatif. `22000.5` dan `"22000"` sama-sama ditolak. */
function normalizePrice(price, issues) {
  const value = typeof price === 'number' ? price : Number.NaN;
  if (!Number.isInteger(value) || value < 0) {
    issues.push('Harga harus bilangan bulat rupiah, minimal 0.');
    return 0;
  }
  return value;
}

// Folder gambar yang diizinkan (root-relative). Cafe pakai default `images/`. Tiap desain
// showcase mengizinkan folder upload-nya sendiri PLUS folder seed bersama
// (`showcase/menu-img/`) tempat foto contoh disimpan. Di-set lewat `configureModel`
// saat admin dibuka — per halaman (modul segar), jadi aman sebagai state modul.
let IMAGE_BASES = ['images/'];
const norm = (p) => p.replace(/\/+$/, '') + '/';

export function configureModel({ imageBase, imageBases } = {}) {
  const list = imageBases ?? (imageBase ? [imageBase] : null);
  if (Array.isArray(list) && list.length) IMAGE_BASES = list.map(norm);
}

/** Path gambar wajib berada di bawah salah satu folder yang dikonfigurasi. Cegah tulis ke luar. */
function normalizeImage(image, issues) {
  const value = typeof image === 'string' ? image.trim() : '';
  if (value === '') return '';
  const safe = !value.includes('..') && !value.includes('//') && IMAGE_BASES.some((b) => value.startsWith(b));
  if (!safe) {
    issues.push(`Gambar harus berada di dalam folder ${IMAGE_BASES.join(' atau ')}.`);
    return '';
  }
  return value;
}

/** Validasi + normalisasi draft item. Melempar `InvalidMenuError` bila ada masalah. */
export function normalizeItem(draft, menu) {
  const issues = [];
  const name = normalizeBilingual(draft.name, 'Nama item', issues);
  const description = normalizeBilingual(draft.description, 'Deskripsi', issues, { required: false });
  const price = normalizePrice(draft.price, issues);
  const image = normalizeImage(draft.image, issues);

  const categoryId = typeof draft.categoryId === 'string' ? draft.categoryId : '';
  if (!menu.categories.some((c) => c.id === categoryId)) {
    issues.push('Kategori tidak dikenal. Pilih kategori yang ada.');
  }

  if (issues.length) throw new InvalidMenuError(issues);

  // Badge sekunder opsional. `featured` tetap menandai "Signature/Terlaris" (dipakai juga
  // halaman cafe). `badge: 'new'` hanya lencana "Baru" di halaman showcase; nilai lain dibuang.
  const badge = draft.badge === 'new' ? 'new' : '';

  return {
    id: draft.id,
    categoryId,
    name,
    description,
    price,
    image,
    available: draft.available !== false,
    featured: draft.featured === true,
    badge,
    order: Number.isFinite(draft.order) ? draft.order : 0,
  };
}

export function normalizeCategory(draft, menu, { existingId = null } = {}) {
  const issues = [];
  const name = normalizeBilingual(draft.name, 'Nama kategori', issues);

  const id = existingId ?? (draft.id?.trim() || slugify(name.id));
  if (id === '') issues.push('Nama kategori tidak bisa dijadikan id.');
  if (existingId === null && menu.categories.some((c) => c.id === id)) {
    issues.push(`Kategori "${name.id}" sudah ada.`);
  }

  // Nama duplikat juga ditolak, bukan hanya id duplikat. Id berasal dari slug, jadi
  // kategori lama ber-id "coffee" bernama "Kopi" tidak bentrok dengan slug "kopi" —
  // tapi owner dan pelanggan akan melihat dua kategori bernama sama.
  const sameName = menu.categories.some(
    (c) => c.id !== existingId && c.name?.id?.trim().toLowerCase() === name.id.toLowerCase(),
  );
  if (name.id !== '' && sameName) issues.push(`Sudah ada kategori bernama "${name.id}".`);

  if (issues.length) throw new InvalidMenuError(issues);
  return { id, name, order: Number.isFinite(draft.order) ? draft.order : 0 };
}

/**
 * Meta usaha: brand + kontak sosial. Dipakai halaman tema untuk tautan IG/TikTok/Maps/WA
 * dan judul. Nama wajib; URL sosial wajib https (repo publik — jangan biarkan `javascript:`
 * atau `//host` menyelinap ke atribut href). Nomor WA disaring jadi digit saja.
 */
export function normalizeCafe(draft, prev = {}) {
  const issues = [];
  const name = typeof draft.name === 'string' ? draft.name.trim() : (prev.name ?? '');
  if (name === '') issues.push('Nama usaha wajib diisi.');

  const tagline = normalizeBilingual(draft.tagline ?? prev.tagline, 'Tagline', issues, { required: false });
  // Deskripsi (blurb "tentang") & alamat: bilingual, opsional, EN kosong → fallback ke ID.
  // Additif — tema showcase yang tidak mengirim field ini mempertahankan nilai `prev`.
  const description = normalizeBilingual(draft.description ?? prev.description, 'Deskripsi', issues, { required: false });
  const address = normalizeBilingual(draft.address ?? prev.address, 'Alamat', issues, { required: false });
  const whatsapp = String(draft.whatsapp ?? prev.whatsapp ?? '').replace(/[^0-9]/g, '');

  const httpsUrl = (value, fallback, label) => {
    const raw = value === undefined ? fallback : value;
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (s === '') return '';
    if (!/^https:\/\/[^\s]+$/i.test(s)) {
      issues.push(`${label} harus berupa tautan yang diawali https://`);
      return '';
    }
    return s;
  };
  const instagram = httpsUrl(draft.instagram, prev.instagram, 'Instagram');
  const tiktok = httpsUrl(draft.tiktok, prev.tiktok, 'TikTok');
  const maps = httpsUrl(draft.maps, prev.maps, 'Google Maps');

  if (issues.length) throw new InvalidMenuError(issues);

  return {
    ...prev,
    name,
    tagline,
    description,
    address,
    currency: prev.currency || 'IDR',
    logo: typeof prev.logo === 'string' ? prev.logo : '',
    whatsapp,
    instagram,
    tiktok,
    maps,
  };
}

/** Pemeriksaan bentuk seluruh menu sebelum ditulis. Jaring pengaman terakhir. */
export function assertValidMenu(menu) {
  const issues = [];
  if (!isPlainObject(menu)) throw new InvalidMenuError(['Menu bukan objek.']);
  if (!Array.isArray(menu.categories)) issues.push('categories bukan array.');
  if (!Array.isArray(menu.items)) issues.push('items bukan array.');
  if (issues.length) throw new InvalidMenuError(issues);

  const categoryIds = new Set(menu.categories.map((c) => c.id));
  if (categoryIds.size !== menu.categories.length) issues.push('Ada id kategori yang duplikat.');

  const itemIds = new Set(menu.items.map((i) => i.id));
  if (itemIds.size !== menu.items.length) issues.push('Ada id item yang duplikat.');

  for (const item of menu.items) {
    if (!categoryIds.has(item.categoryId)) {
      issues.push(`Item "${item.name?.id ?? item.id}" menunjuk kategori yang tidak ada.`);
    }
  }
  if (issues.length) throw new InvalidMenuError(issues);
  return menu;
}

/* -------------------------------------------------------------- mutator */

const clone = (menu) => structuredClone(menu);

/** `order` selalu 1..n dan rapat. Menyimpan indeks jarang tidak ada gunanya di sini. */
function renumber(menu) {
  const sorted = [...menu.categories].sort((a, b) => a.order - b.order);
  menu.categories = sorted.map((category, index) => ({ ...category, order: index + 1 }));

  for (const category of menu.categories) {
    const items = menu.items.filter((i) => i.categoryId === category.id).sort((a, b) => a.order - b.order);
    items.forEach((item, index) => {
      item.order = index + 1;
    });
  }
  return menu;
}

function touch(menu) {
  menu.cafe = menu.cafe ?? {};
  menu.cafe.updatedAt = new Date().toISOString();
  return menu;
}

/** Semua mutator melewati sini: renumber → bump updatedAt → validasi bentuk. */
const finish = (menu) => assertValidMenu(touch(renumber(menu)));

export const mutators = {
  /**
   * `draft.id` boleh ditentukan pemanggil. Itu wajib saat item punya foto: nama file
   * gambar memuat itemId, jadi id harus sudah pasti SEBELUM gambar diunggah. Id yang
   * tetap juga membuat penerapan ulang setelah 409 bersifat idempoten — tidak ada
   * item kembar meski mutator dijalankan dua kali.
   */
  addItem: (draft) => (menu) => {
    const next = clone(menu);
    const existing = new Set(next.items.map((i) => i.id));
    if (draft.id && existing.has(draft.id)) {
      throw new InvalidMenuError(['Item dengan id itu sudah ada.']);
    }
    const id = draft.id || newItemId(existing);
    const siblings = next.items.filter((i) => i.categoryId === draft.categoryId);
    const item = normalizeItem({ ...draft, id, order: siblings.length + 1 }, next);
    next.items.push(item);
    return finish(next);
  },

  updateItem: (id, draft) => (menu) => {
    const next = clone(menu);
    const index = next.items.findIndex((i) => i.id === id); // cari by id, bukan posisi
    if (index === -1) throw new InvalidMenuError(['Item sudah dihapus di tempat lain.']);

    const previous = next.items[index];
    // Pindah kategori → taruh di urutan terakhir kategori tujuan.
    const movedCategory = draft.categoryId !== previous.categoryId;
    const order = movedCategory
      ? next.items.filter((i) => i.categoryId === draft.categoryId).length + 1
      : previous.order;

    next.items[index] = normalizeItem({ ...previous, ...draft, id, order }, next);
    return finish(next);
  },

  removeItem: (id) => (menu) => {
    const next = clone(menu);
    next.items = next.items.filter((i) => i.id !== id);
    return finish(next);
  },

  /** Geser item di dalam kategorinya. `delta` -1 = naik, +1 = turun. */
  moveItem: (id, delta) => (menu) => {
    const next = clone(menu);
    const item = next.items.find((i) => i.id === id);
    if (!item) throw new InvalidMenuError(['Item sudah dihapus di tempat lain.']);

    const siblings = next.items
      .filter((i) => i.categoryId === item.categoryId)
      .sort((a, b) => a.order - b.order);
    const at = siblings.findIndex((i) => i.id === id);
    const to = at + delta;
    if (to < 0 || to >= siblings.length) return finish(next); // sudah di ujung: no-op

    [siblings[at].order, siblings[to].order] = [siblings[to].order, siblings[at].order];
    return finish(next);
  },

  setItemFlag: (id, key, value) => (menu) => {
    if (key !== 'available' && key !== 'featured') throw new InvalidMenuError(['Flag tidak dikenal.']);
    const next = clone(menu);
    const item = next.items.find((i) => i.id === id);
    if (!item) throw new InvalidMenuError(['Item sudah dihapus di tempat lain.']);
    item[key] = value;
    return finish(next);
  },

  /** Perbarui brand + kontak sosial (meta `cafe`). Divalidasi di normalizeCafe. */
  updateCafe: (fields) => (menu) => {
    const next = clone(menu);
    next.cafe = normalizeCafe(fields, next.cafe ?? {});
    return finish(next);
  },

  addCategory: (draft) => (menu) => {
    const next = clone(menu);
    const category = normalizeCategory({ ...draft, order: next.categories.length + 1 }, next);
    next.categories.push(category);
    return finish(next);
  },

  updateCategory: (id, draft) => (menu) => {
    const next = clone(menu);
    const index = next.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new InvalidMenuError(['Kategori sudah dihapus di tempat lain.']);
    const previous = next.categories[index];
    next.categories[index] = normalizeCategory({ ...previous, ...draft }, next, { existingId: id });
    return finish(next);
  },

  moveCategory: (id, delta) => (menu) => {
    const next = clone(menu);
    const sorted = [...next.categories].sort((a, b) => a.order - b.order);
    const at = sorted.findIndex((c) => c.id === id);
    if (at === -1) throw new InvalidMenuError(['Kategori sudah dihapus di tempat lain.']);
    const to = at + delta;
    if (to < 0 || to >= sorted.length) return finish(next);

    [sorted[at].order, sorted[to].order] = [sorted[to].order, sorted[at].order];
    next.categories = sorted;
    return finish(next);
  },

  /** Menghapus kategori yang masih dipakai akan meninggalkan item yatim. Diblokir. */
  removeCategory: (id) => (menu) => {
    const next = clone(menu);
    const used = next.items.filter((i) => i.categoryId === id);
    if (used.length > 0) {
      throw new InvalidMenuError([
        `Kategori ini masih dipakai ${used.length} item. Pindahkan atau hapus item itu dulu.`,
      ]);
    }
    next.categories = next.categories.filter((c) => c.id !== id);
    return finish(next);
  },
};
