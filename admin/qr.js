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
// Level H (~30% modul boleh rusak). Dipilih H, bukan M, karena tengah QR ditimpa logo/ikon:
// EC tinggi membuat kode tetap terpindai meski bagian tengahnya tertutup.
const ERROR_CORRECTION = 'H';
const AUTO_VERSION = 0;
const QUIET_ZONE = 4; // modul; wajib menurut spesifikasi QR, jangan dikurangi
const LOGO_FRACTION = 0.24; // sisi kotak logo relatif terhadap sisi matriks (aman di bawah kapasitas H)
const LOGO_ACCENT = '#B23A1E'; // terracotta merek — warna ikon bell fallback

// Ikon bell restoran (bel meja): kubah + palang alas + kenop. Koordinat di ruang 0..24.
const BELL_PATHS = [
  'M12 4.4a1.5 1.5 0 0 1 1.5 1.5v0.7a7.4 7.4 0 0 1 5.6 7.17V17.4H4.9v-3.63a7.4 7.4 0 0 1 5.6-7.17v-0.7A1.5 1.5 0 0 1 12 4.4Z',
  'M3.3 18.2h17.4a1.05 1.05 0 0 1 1.05 1.05v0.4a1.05 1.05 0 0 1-1.05 1.05H3.3a1.05 1.05 0 0 1-1.05-1.05v-0.4A1.05 1.05 0 0 1 3.3 18.2Z',
];

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
export function toSvg(text, { moduleSize = 8, center = { bell: true } } = {}) {
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

  // Logo/ikon di tengah, di ATAS modul (EC H memulihkan modul yang tertutup).
  drawCenterSvg(svg, total, size, center);

  return svg;
}

/** Kotak putih membulat + logo (data URI) atau ikon bell di tengah QR. */
function drawCenterSvg(svg, total, size, center) {
  if (!center) return;
  const box = size * LOGO_FRACTION;
  const pad = 1; // margin putih di sekeliling logo (modul)
  const outer = box + pad * 2;
  const origin = (total - outer) / 2;

  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('x', String(origin));
  bg.setAttribute('y', String(origin));
  bg.setAttribute('width', String(outer));
  bg.setAttribute('height', String(outer));
  bg.setAttribute('rx', '1');
  bg.setAttribute('fill', '#ffffff');
  svg.append(bg);

  const inner = (total - box) / 2;
  if (center.href) {
    const image = document.createElementNS(SVG_NS, 'image');
    image.setAttribute('x', String(inner));
    image.setAttribute('y', String(inner));
    image.setAttribute('width', String(box));
    image.setAttribute('height', String(box));
    image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', center.href);
    image.setAttribute('href', center.href);
    svg.append(image);
  } else {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${inner} ${inner}) scale(${box / 24})`);
    for (const dd of BELL_PATHS) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', dd);
      p.setAttribute('fill', LOGO_ACCENT);
      g.append(p);
    }
    svg.append(g);
  }
}

/** Muat HTMLImageElement dari data URI (untuk digambar ke canvas PNG). */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new QrError('Logo gagal dimuat.'));
    img.src = src;
  });
}

/** PNG untuk ditempel di chat/dokumen. `size` adalah sisi gambar dalam piksel. */
export async function toPngBlob(text, { size: pixels = 1024, center = { bell: true } } = {}) {
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

  await drawCenterPng(context, side, size, moduleSize, center);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new QrError('Gagal membuat PNG.');
  return blob;
}

async function drawCenterPng(context, side, size, moduleSize, center) {
  if (!center) return;
  const box = size * LOGO_FRACTION * moduleSize;
  const pad = moduleSize;
  const outer = box + pad * 2;
  const origin = (side - outer) / 2;

  context.fillStyle = '#ffffff';
  if (context.roundRect) {
    context.beginPath();
    context.roundRect(origin, origin, outer, outer, moduleSize * 0.6);
    context.fill();
  } else {
    context.fillRect(origin, origin, outer, outer);
  }

  const inner = (side - box) / 2;
  if (center.href) {
    const img = await loadImage(center.href);
    // Contain: pertahankan rasio, tengahkan di dalam kotak.
    const ratio = Math.min(box / img.width, box / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    context.drawImage(img, (side - w) / 2, (side - h) / 2, w, h);
  } else {
    context.save();
    context.translate(inner, inner);
    context.scale(box / 24, box / 24);
    context.fillStyle = LOGO_ACCENT;
    for (const dd of BELL_PATHS) context.fill(new Path2D(dd));
    context.restore();
  }
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
