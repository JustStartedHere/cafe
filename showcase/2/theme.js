// Tema 2 — logika tipis: seluruh perilaku menu (filter, bahasa, sosial, loading/error)
// ditangani engine bersama. Hanya perlu meneruskan string + prefiks pesan WA.
import { initMenuView } from '../menu-view.js';
import { STRINGS, RESERVE_PREFIX } from './strings.js';

initMenuView({
  dataUrl: new URL('data.json', import.meta.url).href,
  strings: STRINGS,
  reservePrefix: RESERVE_PREFIX,
});
