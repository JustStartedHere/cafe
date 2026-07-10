// Penyimpanan token. Kecil dan terpisah supaya mudah diaudit.
//
// Aturan:
//  - Default `sessionStorage`: token hilang saat tab ditutup. Ini pilihan aman.
//  - `localStorage` hanya bila owner secara sadar mencentang "Ingat di perangkat ini".
//  - `clear()` selalu menyapu KEDUANYA. Kalau tidak, token "sementara" bisa tertinggal
//    di localStorage dari sesi lama dan hidup kembali diam-diam.
//  - Token tidak pernah di-log, tidak pernah masuk DOM, tidak pernah masuk URL.

const KEY = 'cafe_admin_token';

/** Storage bisa melempar (mode privat, cookie diblokir). Jangan sampai itu mematikan admin. */
function safe(storage) {
  try {
    const probe = '__probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

const session = () => safe(globalThis.sessionStorage);
const local = () => safe(globalThis.localStorage);

/** sessionStorage diutamakan: kalau owner login ulang tanpa "ingat", itu yang berlaku. */
export function load() {
  for (const storage of [session(), local()]) {
    const value = storage?.getItem(KEY);
    if (typeof value === 'string' && value !== '') return value;
  }
  return null;
}

/** @param {boolean} remember true → localStorage (persisten), false → sessionStorage */
export function save(token, remember) {
  clear();
  const target = remember ? local() : session();
  try {
    target?.setItem(KEY, token);
  } catch {
    // Gagal menyimpan bukan alasan menggagalkan login — sesi ini tetap jalan di memori.
  }
}

/** Sapu bersih kedua storage. Dipanggil saat logout, idle timeout, dan setiap 401/403. */
export function clear() {
  for (const storage of [session(), local()]) {
    try {
      storage?.removeItem(KEY);
    } catch {
      /* abaikan */
    }
  }
}

/** Apakah token saat ini tersimpan persisten? Dipakai untuk mencentang ulang checkbox. */
export function isRemembered() {
  try {
    return local()?.getItem(KEY) != null;
  } catch {
    return false;
  }
}
