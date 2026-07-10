// State menu + penulisan ke GitHub, termasuk pemulihan konflik 409.
//
// Kontrak: `save(mutator, message)` menerima FUNGSI `(menu) => menu`, bukan hasil jadi.
// Kalau PUT ditolak 409 (sha basi karena ada yang menyimpan lebih dulu), store mengambil
// ulang menu.json yang segar, menerapkan mutator yang sama ke isi terbaru, lalu mencoba
// sekali lagi. Perubahan orang lain tidak pernah tertimpa diam-diam.

import { ConflictError } from './github-api.js';
import { assertValidMenu } from './menu-model.js';

const MENU_PATH = 'data/menu.json';

/** Konflik masih terjadi setelah satu kali re-apply. Editor harus memuat ulang state. */
export class StaleMenuError extends Error {
  constructor() {
    super('Menu berubah di tempat lain. Halaman dimuat ulang.');
    this.name = 'StaleMenuError';
  }
}

export function createMenuStore(client, { path = MENU_PATH } = {}) {
  let menu = null;
  let sha = null;

  /** Terapkan mutator ke salinan, lalu PUT dengan sha yang menyertainya. */
  async function attempt(mutate, baseMenu, baseSha, message) {
    const next = assertValidMenu(mutate(baseMenu));
    const result = await client.putJson({ path, data: next, message, sha: baseSha });
    return { next, sha: result.sha, commit: result.commit };
  }

  return {
    get menu() {
      return menu;
    },
    get sha() {
      return sha;
    },

    /** Muat dari GitHub (bukan dari `data/menu.json` publik — itu bisa basi 10 menit). */
    async load() {
      const fresh = await client.getJson(path);
      menu = assertValidMenu(fresh.data);
      sha = fresh.sha;
      return menu;
    },

    /**
     * @param {(menu: object) => object} mutate fungsi murni; harus mencari by id, bukan posisi
     * @param {string} message pesan commit
     * @returns {Promise<{commit: string, recovered: boolean}>} `recovered` true bila sempat 409
     */
    async save(mutate, message) {
      if (menu === null) throw new Error('Store belum dimuat');

      try {
        const result = await attempt(mutate, menu, sha, message);
        menu = result.next;
        sha = result.sha;
        return { commit: result.commit, recovered: false };
      } catch (error) {
        if (!(error instanceof ConflictError)) throw error;

        // sha basi. Ambil isi terbaru dan terapkan ulang mutator yang SAMA di atasnya.
        const fresh = await client.getJson(path);
        const freshMenu = assertValidMenu(fresh.data);

        try {
          const result = await attempt(mutate, freshMenu, fresh.sha, message);
          menu = result.next;
          sha = result.sha;
          return { commit: result.commit, recovered: true };
        } catch (retryError) {
          if (retryError instanceof ConflictError) {
            // Ada yang menyimpan lagi di sela-sela. Jangan mencoba tanpa henti —
            // muat ulang state dan biarkan owner melihat kondisi terbaru.
            menu = freshMenu;
            sha = fresh.sha;
            throw new StaleMenuError();
          }
          throw retryError;
        }
      }
    },
  };
}
