// Pipeline gambar: kompresi di browser → WebP, lalu nama file unik.
//
// INVARIAN: nama file unik per upload (`images/{itemId}-{random4}.webp`).
// Konsekuensinya, dan inilah alasannya:
//   1. PUT gambar selalu operasi *create* → tak pernah butuh `sha`, tak pernah kena 409.
//   2. Pelanggan tak pernah melihat foto lama dari cache CDN Fastly.
//   3. Kalau penulisan menu.json gagal, foto lama masih utuh — yang tertinggal hanya
//      foto baru yang yatim, dan itu murah.
// File lama TIDAK PERNAH ditimpa.

const MAX_EDGE = 1200;
const TARGET_BYTES = 300_000; // di bawah ini: bagus
const HARD_MAX_BYTES = 900_000; // di atas ini: menyerah, minta foto lain
const QUALITIES = [0.8, 0.7, 0.6];
const RANDOM_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export class ImageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageError';
  }
}

/**
 * `images/itm_ax9f2-k3m9.webp`. Acak agar dua upload untuk item yang sama tidak bertabrakan.
 * `dir` bisa diganti agar tiap desain showcase menulis ke foldernya sendiri
 * (mis. `showcase/2/img`) — orphan cleanup per desain lalu hanya menyapu foldernya.
 */
export function imagePath(itemId, dir = 'images') {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const suffix = [...bytes].map((b) => RANDOM_ALPHABET[b % RANDOM_ALPHABET.length]).join('');
  const base = dir.replace(/\/+$/, '');
  return `${base}/${itemId}-${suffix}.webp`;
}

const toBlob = (canvas, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));

/**
 * Kecilkan sisi terpanjang ke ≤ 1200px lalu encode WebP.
 * Turunkan kualitas bertahap sampai ≤ 300 KB; menyerah kalau tetap > 900 KB.
 *
 * @returns {Promise<{bytes: Uint8Array, size: number, width: number, height: number, quality: number, previewUrl: string}>}
 */
export async function compressImage(file) {
  if (!(file instanceof Blob) || !file.type.startsWith('image/')) {
    throw new ImageError('File itu bukan gambar.');
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageError('Gambar tidak bisa dibaca. Coba foto lain.');
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let blob = null;
  let quality = 0;
  for (const q of QUALITIES) {
    blob = await toBlob(canvas, q);
    quality = q;
    if (!blob) throw new ImageError('Gagal memproses gambar.');
    // Browser yang tidak bisa encode WebP diam-diam mengembalikan PNG. Jangan
    // menyimpan file .webp yang sebenarnya PNG.
    if (blob.type !== 'image/webp') throw new ImageError('Peramban ini tidak bisa membuat WebP.');
    if (blob.size <= TARGET_BYTES) break;
  }

  if (blob.size > HARD_MAX_BYTES) {
    throw new ImageError('Foto terlalu besar meski sudah dikompresi. Coba foto lain.');
  }

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    size: blob.size,
    width,
    height,
    quality,
    previewUrl: URL.createObjectURL(blob),
  };
}

/** "254 KB" / "1,2 MB" — untuk ditunjukkan ke owner sebelum menyimpan. */
export function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
}

/**
 * Foto di `images/` yang tidak lagi ditunjuk item mana pun.
 * Nama file unik berarti setiap ganti foto meninggalkan satu yatim — ini yang menyapunya.
 */
export function findOrphans(files, menu) {
  const used = new Set(menu.items.map((item) => item.image).filter(Boolean));
  return files.filter((file) => file.type === 'file' && file.name !== '.gitkeep' && !used.has(file.path));
}
