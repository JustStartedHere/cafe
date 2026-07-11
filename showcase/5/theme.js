// Tema 4 — logika tipis; perilaku menu ditangani engine bersama.
import { initMenuView } from '../menu-view.js';
import { STRINGS, RESERVE_PREFIX } from './strings.js';

initMenuView({
  dataUrl: new URL('data.json', import.meta.url).href,
  strings: STRINGS,
  reservePrefix: RESERVE_PREFIX,
});
