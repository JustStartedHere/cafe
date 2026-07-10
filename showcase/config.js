// Satu tempat untuk data yang diganti saat demo ke client.
// Dipakai semua tema di showcase/.

export const RESTAURANT_NAME = 'Your Restaurant';

/** Nomor WhatsApp format internasional tanpa "+" dan tanpa spasi. PLACEHOLDER — ganti sebelum demo. */
export const WHATSAPP = '6281234567890';

export const PHONE_DISPLAY = '+62 812-3456-7890';
export const EMAIL = 'halo@yourrestaurant.id';

/**
 * Tautan WhatsApp dengan pesan yang sudah terisi.
 * `encodeURIComponent` wajib: pesan berisi spasi dan tanda baca.
 */
export function waLink(message) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}
