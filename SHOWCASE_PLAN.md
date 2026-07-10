# Showcase — 5 opsi desain untuk client

Etalase sementara. Client membuka satu tautan, melihat lima pilihan tampilan, dan mencoba
masing-masing sebagai situs sungguhan (bisa diklik, bukan gambar mati).

## Peta URL

| URL | Isi |
|---|---|
| `/` | Galeri 5 opsi. **Sementara** — boleh dihapus setelah client memilih. |
| `/menu/` | **Situs pelanggan sungguhan.** Inilah yang di-encode ke QR. Permanen. |
| `/admin/` | Panel owner. Tidak berubah. |
| `/showcase/1/` … `/showcase/4/` | Tema hasil tiru `docs/references/1–4.jpg`. |

**QR menunjuk `/menu/`, bukan `/`.** Itu yang membuat galeri di root bisa dibuang kapan saja tanpa
mematikan QR yang sudah tercetak. Jangan pernah memindahkan `/menu/` lagi setelah QR dicetak.

## Status tema

| # | Nama | Referensi | Status |
|---|---|---|---|
| 1 | Klasik Fine Dining | `docs/references/1.jpg` | **selesai** — `showcase/1/` |
| 2 | Savoria Kitchen | `docs/references/2.jpg` | belum |
| 3 | Menu Poster Hijau | `docs/references/3.jpg` | belum |
| 4 | Dolce Dessert | `docs/references/4.jpg` | belum |
| 5 | Desain sekarang | — | live di `/menu/` |

Galeri root (`index.html`) sudah menautkan tema 1 + situs `/menu/` sebagai "Bisa dicoba",
dan menyediakan tiga kartu "Segera" untuk tema 2–4.

## Cara menambah tema berikutnya (2–4)

1. Siapkan foto: `node ov.mjs "<kueri>" <slug> 3` (CC0/PD dari Openverse) → `sheet.mjs` untuk
   tinjau → pilih → `prep-img.mjs` untuk crop+WebP. Lihat sitasi di `img/CREDITS.md`.
2. Bangun `showcase/{n}/` dengan pola tema 1: `index.html` + `theme.css` + `theme.js` + `data.js`.
   Impor `pickLang`/`formatPrice` dari `assets/js/util.js`, `getLang`/`setLang` dari `i18n.js`,
   dan `showcase/config.js`.
3. Ganti kartu "Segera" ke-n di `index.html` root menjadi `<a class="card card--live">`, dan
   ambil pratinjau (`shot.mjs` → `topng2webp.mjs`) ke `showcase/preview/preview-{n}.webp`.
4. Salin `theme1-test.mjs` → `theme{n}-test.mjs`, sesuaikan; jalankan a11y + ext + kontras.
   Semua harness ada di scratchpad; jalankan Chrome dengan `--lang=id-ID`.

## Kontrak yang berlaku untuk SEMUA halaman tema

Tema adalah demo, tapi bukan alasan melonggarkan aturan project. Yang di bawah ini mengikat.

- **Data tema hardcoded** di `showcase/{n}/data.js` — tidak menyentuh `data/menu.json`, `/admin/`,
  atau pipeline gambar. Field teks berbentuk `{ id, en }` seperti di situs pelanggan.
- **Render lewat `textContent` / `createElement`.** Tidak pernah `innerHTML`, walau datanya milik kita
  sendiri. Pola yang dilanggar di satu tempat akan menular ke halaman pelanggan.
- **Nol request pihak ketiga.** Font di-self-host di `showcase/assets/fonts/` (woff2, subset latin,
  di-commit). Bukan `<link>` ke `fonts.googleapis.com`. CSP `<meta>` `default-src 'self'` di tiap tema.
- **Tanpa build step.** HTML/CSS/ES modules polos.
- **Semua path relatif.** Situs harus jalan di `user.github.io/cafe/` maupun di root domain.
- **`<meta name="robots" content="noindex">`** di halaman tema dan galeri.
- Aksesibilitas sama ketatnya: **teks ≥ 16px**, kontras AA ≥ 4.5:1, tap target ≥ 44×44px.
- **Tidak ada kontrol mati.** Kalau referensi menampilkan tombol yang tak menuju ke mana pun
  (Search, dropdown "Pages", ikon Profile), tombol itu dibuang — bukan dipasang sebagai hiasan.

## Yang dipakai ulang, bukan ditulis ulang

- `assets/js/util.js` → `pickLang(field, lang)`, `formatPrice(price, 'IDR', lang)`.
- `assets/js/i18n.js` → `getLang()` / `setLang()`. Kunci `localStorage` sama (`lang`), jadi pilihan
  bahasa ikut berpindah antar halaman. Kamus string statis tiap tema tinggal di `data.js` tema itu.
- `showcase/config.js` → `WHATSAPP`, `RESTAURANT_NAME`. Satu tempat untuk diganti saat demo ke client.

## Tema 1 — deviasi sadar dari referensi

- **Dibuang atas permintaan user**: halaman/ikon Profile, banner "Get 20% Off On Your First Order",
  rating bintang per produk.
- **Dibuang karena akan jadi kontrol mati**: dropdown "Pages", ikon Search.
- **Reservation → WhatsApp** (`wa.me`), bukan halaman reservasi.
- **Harga Rupiah**, halaman bilingual ID/EN (referensi hanya Inggris + dolar).
- **Nama restoran "Your Restaurant"**.
- **Tab filter memuat ke-6 kategori**, sementara referensi hanya menampilkan 5 tab padahal
  lingkaran kategorinya 6. Kalau ditiru mentah, mengklik lingkaran "Pizza" akan menonaktifkan
  seluruh baris tab — pelanggan melihat filter aktif yang tak tercermin di mana pun.

## Foto & font

- Foto: Unsplash (lisensi bebas pakai). Diunduh, **dilihat satu per satu** untuk memastikan
  subjeknya benar, lalu dikompresi ke WebP lewat headless Chrome (`canvas.toBlob('image/webp')`) —
  mesin ini tidak punya encoder gambar. Lingkaran kategori memakai ulang foto hidangan.
- Font tema 1: **Playfair Display** (judul, logo) + **Inter** (teks). Keduanya SIL OFL.

## Budget

Budget 30 KB gzip milik **situs pelanggan** (`/menu/`), bukan halaman tema — tema memuat webfont dan
foto hero besar. Ukuran tema tetap diukur dan dilaporkan apa adanya, tidak disembunyikan.
