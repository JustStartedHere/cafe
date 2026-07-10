# Showcase — 6 desain, tiap desain punya admin sendiri

Etalase untuk client: satu tautan, enam gaya tampilan (+ situs cafe siap pakai), semuanya
berfungsi penuh dan punya admin GitHub-token sendiri. Client mencoba, memilih, lalu desain
yang tak dipakai boleh dihapus.

**Catatan revisi (2026-07-11):** tema 3 & 4 lama tak sepenuhnya menyerupai referensi 3 & 4
(hanya menyerap warnanya). Atas keputusan user, keduanya **dibiarkan apa adanya**, dan
**tema 5 & 6 ditambahkan** sebagai versi yang benar-benar setia ke referensi 3 (poster hijau)
dan referensi 4 (poster dwiwarna krem+olive). Galeri root kini 7 kartu.

## Peta URL

| URL | Isi |
|---|---|
| `/` | Galeri 7 kartu (cafe + tema 1–6). **Sementara.** |
| `/menu/` + `/admin/` | Cafe "Kopi Senja" — situs pelanggan + admin. Data: `data/menu.json`. **QR menunjuk `/menu/`.** |
| `/showcase/1/` + `/showcase/1/admin/` | Tema 1 "Klasik Fine Dining". Data: `showcase/1/data.json`. |
| `/showcase/2/` + `/showcase/2/admin/` | Tema 2 "Savoria Kitchen". Data: `showcase/2/data.json`. |
| `/showcase/3/` + `/showcase/3/admin/` | Tema 3 "Verde — Poster Hijau" (lama, dipertahankan). Data: `showcase/3/data.json`. |
| `/showcase/4/` + `/showcase/4/admin/` | Tema 4 "Dolce — Dessert" (lama, dipertahankan). Data: `showcase/4/data.json`. |
| `/showcase/5/` + `/showcase/5/admin/` | Tema 5 "Rimba Hijau" — poster hijau **setia ref 3**. Data: `showcase/5/data.json`. |
| `/showcase/6/` + `/showcase/6/admin/` | Tema 6 "Dolce Dessert" — poster krem+olive **setia ref 4**. Data: `showcase/6/data.json`. |

## Arsitektur (keputusan 2026-07-11)

- **Tiap desain = data.json sendiri + admin sendiri.** Tema membaca datanya saat runtime
  (fetch cache-busted, ada loading/error state), tidak lagi hardcoded.
- **Satu mesin admin bersama, halaman terpisah per desain.** Modul keamanan yang sudah
  teruji dipakai ulang; trust boundary tidak ditulis ulang 5×:
  - `admin/github-api.js`, `admin/token-store.js`, `admin/qr.js` — dipakai apa adanya.
  - `admin/menu-store.js` — `path` sudah parameter.
  - `admin/menu-model.js` — ditambah `configureModel({ imageBase })` (validasi path gambar per desain).
  - `admin/image.js` — `imagePath(itemId, dir)` menerima folder tujuan.
  - `admin/admin-core.js` (BARU) — orkestrasi login/idle/QR generik, dikonfigurasi lewat
    `window.__ADMIN_CONFIG` yang di-set halaman admin tiap desain.
  - `admin/table-editor.js` (BARU) — **editor tabel** (form builder): baris produk bisa
    tambah/edit/hapus/urут, upload foto, atur kategori, plus panel branding + sosial.
- **Skema data seragam** (semua data.json):
  ```
  { schemaVersion, cafe: { name, tagline{id,en}, currency, whatsapp, instagram, tiktok,
    maps, address{id,en}?, hours{id,en}?, updatedAt },
    categories: [{ id, name{id,en}, order }],
    items: [{ id, categoryId, name{id,en}, description{id,en}, price, image, available,
      featured, order }] }
  ```
  Kunci meta tetap `cafe` (sekadar nama kunci; isinya brand + sosial). Sosial di sini →
  memenuhi "semua desain nge-link IG/TikTok/Maps/WhatsApp" DAN bisa diedit di admin.
- **Foto produk per desain**: cafe → `images/`; tema N → `showcase/N/img/`. Path disimpan
  ROOT-RELATIVE di data.json; tema menyelesaikannya via `new URL(path, SITE_ROOT)`.
  "Bersihkan foto yatim" tiap desain hanya menyapu foldernya sendiri.
- **Login admin**: sama persis dengan cafe — fine-grained GitHub PAT (`Contents: R/W`),
  satu token menjangkau semua data.json karena semuanya di repo yang sama.

## Aturan yang tetap mengikat (dari CLAUDE.md)

Tanpa build step · nol script pihak ketiga di admin + CSP · `textContent`/`createElement`
bukan `innerHTML` · nama file gambar unik + urutan gambar-dulu-JSON · pola mutator + retry
409 · token tak pernah di-log (sessionStorage default) · base64 UTF-8-safe · path relatif ·
teks ≥16px, kontras AA, tap target ≥44px · commit per file, bukan `git add -A`.

## Menu (≥ 25 produk distinct, foto CC0/PD diverifikasi mata)

Pool Nusantara + Western + Chinese. Sumber Openverse (CC0/Public-Domain), tiap foto dibuka
sebelum dipakai, dikompres WebP lewat canvas headless Chrome. Sitasi di `*/img/CREDITS.md`.

## Perbaikan UX yang diadopsi semua desain

Sticky tab bisa scroll horizontal (safe center) · hero swipe + panah + auto-advance yang
hormat `prefers-reduced-motion` · snap-scroll saat filter dari bawah · transisi halus.

## Status — SELESAI (2026-07-11)

| Desain | Situs | data.json | Admin | Tes |
|---|---|---|---|---|
| Cafe | ✅ `/menu/` (+footer sosial) | ✅ | ✅ tabel | editor 45 · admin 25 · qr 20 · model 63 · a11y 11 · xss 13 · pwa 25 |
| Tema 1 | ✅ | ✅ (fetch runtime) | ✅ | theme1 77 · ext 4 |
| Tema 2 | ✅ Savoria (terracotta) | ✅ | ✅ | view 27 · a11y 10 · ext 4 · admin-wire 6 · kontras AA |
| Tema 3 | ✅ Verde (poster hijau) | ✅ | ✅ | view 27 · a11y 10 · ext 4 · admin-wire 6 · kontras AA |
| Tema 4 | ✅ Dolce (blush dessert) | ✅ | ✅ | view 27 · a11y 10 · ext 4 · admin-wire 6 · kontras AA |
| Galeri | ✅ 5 kartu live + pratinjau | — | — | gallery 14 · a11y 11 |

### Modul bersama yang lahir dari fase ini

- **`showcase/lib.js`** — `loadMenu` (cache-busted, loading/error), `resolveImg` (allowlist
  `images|assets|showcase`), `waLink`, `socialLinks`, helper DOM. Dipakai tema 1 & engine.
- **`showcase/menu-view.js`** — engine tampilan menu untuk tema 2–4 (filter, tab sticky
  safe-center, bahasa, sosial, loading/error). Tema cukup shell HTML + CSS; kontrak id di header file.
- **`admin/admin-core.js`** — orkestrasi login/idle/QR generik via `window.__ADMIN_CONFIG`
  (di-set `boot.js` per desain; dynamic-import karena CSP melarang inline).
- **`admin/table-editor.js`** — editor menu berbasis tabel + panel identitas/sosial; semua
  invarian lama dipertahankan (gambar-dulu, retry 409, orphan cleanup per folder desain).
- **`admin/menu-model.js`** — tambah `badge:'new'` + `normalizeCafe`/`mutators.updateCafe`.

### Sisa untuk owner (bukan blocker teknis)

- Ganti placeholder WhatsApp/IG/TikTok/Maps: lewat **admin tiap desain** (panel "Identitas &
  sosial") atau langsung di `data.json`/`data/menu.json`. Tak perlu sentuh kode lagi.
- QR tiap desain otomatis benar setelah transfer repo (dihitung dari `location`); **jangan cetak
  sebelum transfer** (URL berubah).

## Cara menambah tema (pola)

1. Foto: `node ov.mjs "<kueri>" <slug> 3` → `sheet.mjs` tinjau → pilih → `prep-img.mjs`.
2. `showcase/N/data.json` (skema di atas) + `showcase/N/theme.{css,js}` + `index.html`.
3. `showcase/N/admin/index.html` set `window.__ADMIN_CONFIG` lalu impor `admin/admin-core.js`.
4. Kartu galeri jadi `card--live` + pratinjau `shot.mjs`→`topng2webp.mjs`.
5. Tes: `themeN-test.mjs` + a11y + ext + kontras (Chrome `--lang=id-ID`).
