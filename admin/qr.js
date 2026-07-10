// QR code untuk URL menu publik.
//
// Library QR di-vendor dan di-commit (`vendor/qrcode-generator.js`), tidak pernah
// diambil dari CDN — satu script pihak ketiga yang disusupi cukup untuk mengeksfiltrasi
// token dari halaman ini. Tidak ada layanan QR eksternal: privasi, nol dependency,
// jalan offline. URL tidak pernah berubah, jadi sekali cetak seumur hidup.
//
// `createSvgTag()` milik library sengaja TIDAK dipakai: ia merakit HTML sebagai string.
// Di sini SVG dibangun lewat `createElementNS`.

const SVG_NS = 'http://www.w3.org/2000/svg';
const ERROR_CORRECTION = 'M'; // ~15% modul boleh rusak — cukup untuk stiker meja yang tergores
const AUTO_VERSION = 0;
const QUIET_ZONE = 4; // modul; wajib menurut spesifikasi QR, jangan dikurangi

export class QrError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QrError';
  }
}

/**
 * Hitung matriks modul.
 * @returns {{size: number, isDark: (row: number, col: number) => boolean}}
 */
export function buildMatrix(text) {
  if (typeof globalThis.qrcode !== 'function') {
    throw new QrError('Library QR belum termuat.');
  }
  if (typeof text !== 'string' || text.trim() === '') {
    throw new QrError('URL kosong.');
  }

  const qr = globalThis.qrcode(AUTO_VERSION, ERROR_CORRECTION);
  qr.addData(text);
  try {
    qr.make();
  } catch {
    // Terjadi kalau teksnya melebihi kapasitas versi 40.
    throw new QrError('URL terlalu panjang untuk satu QR.');
  }

  return { size: qr.getModuleCount(), isDark: (row, col) => qr.isDark(row, col) };
}

/**
 * SVG vektor — inilah yang dipakai untuk mencetak: tajam di ukuran berapa pun.
 * Seluruh modul gelap digabung ke satu `<path>`; ratusan `<rect>` hanya memperbesar file.
 */
export function toSvg(text, { moduleSize = 8 } = {}) {
  const { size, isDark } = buildMatrix(text);
  const total = size + QUIET_ZONE * 2;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${total} ${total}`);
  svg.setAttribute('width', String(total * moduleSize));
  svg.setAttribute('height', String(total * moduleSize));
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `QR code menuju ${text}`);

  // Latar putih ikut dicetak: QR di atas kertas berwarna sulit dipindai.
  const background = document.createElementNS(SVG_NS, 'rect');
  background.setAttribute('width', String(total));
  background.setAttribute('height', String(total));
  background.setAttribute('fill', '#ffffff');
  svg.append(background);

  // Modul gelap yang berdampingan digabung jadi satu segmen horizontal: file jauh lebih
  // kecil daripada satu segmen per modul, dan hasil rasternya identik.
  let d = '';
  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      if (!isDark(row, col)) {
        col++;
        continue;
      }
      let run = 1;
      while (col + run < size && isDark(row, col + run)) run++;
      d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h${run}v1h-${run}z`;
      col += run;
    }
  }
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', '#000000');
  svg.append(path);

  return svg;
}

/** PNG untuk ditempel di chat/dokumen. `size` adalah sisi gambar dalam piksel. */
export async function toPngBlob(text, { size: pixels = 1024 } = {}) {
  const { size, isDark } = buildMatrix(text);
  const total = size + QUIET_ZONE * 2;
  // Bulatkan ke kelipatan jumlah modul agar tiap modul jatuh persis di batas piksel.
  const moduleSize = Math.max(1, Math.floor(pixels / total));
  const side = moduleSize * total;

  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, side, side);
  context.fillStyle = '#000000';

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isDark(row, col)) {
        context.fillRect((col + QUIET_ZONE) * moduleSize, (row + QUIET_ZONE) * moduleSize, moduleSize, moduleSize);
      }
    }
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new QrError('Gagal membuat PNG.');
  return blob;
}

/** SVG sebagai Blob, siap diunduh. */
export function toSvgBlob(text, options) {
  const markup = new XMLSerializer().serializeToString(toSvg(text, options));
  return new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
}

/** Picu unduhan tanpa meninggalkan URL blob yang menggantung. */
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Cabut di tick berikutnya: mencabut terlalu cepat membatalkan unduhan di Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
