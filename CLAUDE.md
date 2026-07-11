# Cafe Menu Website — Konteks Project

## Apa ini

Website statis untuk menampilkan menu cafe. Pelanggan scan QR di meja → langsung lihat menu.
**Tidak ada pemesanan/checkout** — murni etalase.

Requirement asli ada di `Product Discovery.md`. Rencana implementasi lengkap (sudah disetujui) ada di
**`PLAN.md`** — baca itu sebelum mulai bekerja.

Di atasnya kini ada pekerjaan kedua: **etalase opsi desain untuk client**, rencananya di
**`SHOWCASE_PLAN.md`**. Baca itu sebelum menyentuh `/` atau `showcase/`.

## Status saat ini

Situs pelanggan selesai (Phase 1–8). **Showcase SELESAI (2026-07-11):** galeri 7 kartu di root,
masing-masing dengan `data.json` + admin tabel sendiri lewat satu mesin admin bersama. Tema 5 & 6
ditambahkan setia ke referensi 3 & 4 (poster); tema 3 & 4 lama dibiarkan apa adanya atas keputusan user.

**Re-map showcase (2026-07-11, di branch):** situs pelanggan **dipindah `/menu/` → `/showcase/2/`** (adminnya
`/admin/` shell → `/showcase/2/admin/`; mesin dasbor tetap di `/admin/`), dan tema lama `showcase/2..6`
digeser jadi `showcase/3..7`. Keputusan terkunci "situs pelanggan di `/menu/`" **sengaja di-override** atas
permintaan user (QR belum pernah dicetak → jendela aman), murni demi konsistensi penomoran katalog. Detail di
"### Re-map showcase" di bawah.

| | |
|---|---|
| Fase terakhir selesai | **Jam operasional per hari + re-map showcase + custom domain live** — lihat di bawah |
| Berikutnya | Domain katalog sudah live. Untuk pemakaian client: pilih 1 desain, isi data client, transfer repo, cetak QR |
| Direktori kerja | `D:\Project\cafe` |
| Git | `main` → `https://github.com/JustStartedHere/cafe` (publik) |
| **Custom domain** | **`https://katalogmenu.juststartedhere.biz.id/`** (HTTPS aktif). Cloudflare DNS-only (CNAME → `juststartedhere.github.io`) → GitHub Pages menerbitkan SSL. File `CNAME` ada di root — **jangan hapus** |
| Katalog (root) | `…/` = galeri beberapa desain — **user memutuskan TETAP katalog** (bukan diringkas jadi 1 menu) |
| Situs pelanggan | `…/showcase/2/` (dipindah dari `/menu/`) ← target QR bila mau QR menu spesifik |
| Admin | `…/showcase/N/admin/` (N=1..7; **showcase/2 = cafe**); mesin dasbor di `/admin/` |
| Blocker | — |

Update tabel ini setiap kali sebuah fase selesai.

### Deploy, custom domain & jebakan build (2026-07-11)

- **Custom domain LIVE:** `katalogmenu.juststartedhere.biz.id` → GitHub Pages. Di Cloudflare = **DNS-only
  (awan abu-abu)** CNAME ke `juststartedhere.github.io`; **GitHub yang menerbitkan sertifikat SSL** (bukan
  Cloudflare — mode "SSL/TLS Full" Cloudflare hanya relevan bila record di-proxy/oranye). "Enforce HTTPS"
  aktif. GitHub otomatis menaruh file **`CNAME`** di root repo — **jangan hapus** (kalau hilang, domain mati).
  Semua path di situs relatif, jadi jalan baik di `*.github.io/cafe/` maupun di root domain.
- **Jebakan build Pages yang sudah ditutup:** folder worktree Claude Code (`.claude/worktrees/…`) pernah
  tak sengaja ter-`git add` → tercatat sebagai **gitlink/submodule tanpa `.gitmodules`** → **default Pages
  build GAGAL** di `git submodule update` ("No url found for submodule path"). Diperbaiki: buang gitlink +
  tambah **`.gitignore`** (`/.claude/worktrees/`). **Jangan `git add -A`/`git add .` di root repo** — bisa
  menyeret worktree lagi. Add per-file.
- **`PRD.md` + `TECH_STACK.md`** (spesifikasi lengkap untuk rewrite) sempat dibuat & di-commit, lalu atas
  permintaan user **di-untrack + di-`.gitignore`** (repo publik, tak mau bisa disalin). **Jangan commit
  ulang keduanya ke repo publik.** Isinya masih ada di history commit `2d293e3` (`git show 2d293e3:PRD.md`).

### Jam operasional per hari (master, 2026-07-11) — sudah live

`cafe.hours` = array **7 entri** (index 0=Senin..6=Minggu), tiap entri `{closed:true}` atau
`{closed:false, open:"HH:MM", close:"HH:MM"}`. Dikelola owner di admin (bagian Identitas, 7 baris hari
dengan toggle "Tutup" + input `type=time`). Ditampilkan di footer situs pelanggan **dan** semua tema.
- **`assets/js/util.js` `formatHours(hours, lang)`**: gabung hari berturut ber-jam sama jadi rentang
  ("Senin–Kamis 09.00–22.00"); pemisah jam `.`(ID)/`:`(EN); tutup → "Tutup"/"Closed".
- **`admin/menu-model.js` `normalizeHours` + `TIME_RE`**: validasi 7 entri; jam tak valid → `{closed:true}`.
  Additif di `normalizeCafe` (field absen → `prev.hours` dipertahankan, jadi simpan sosial tak hapus jam).
- **Render**: `showcase/lib.js` `renderHours` (tema, `#foot-hours`) + `assets/js/render.js` `renderFooter`
  (pelanggan). **Blok jam SENGAJA tanpa `display:` di CSS** agar `[hidden]` tetap menyembunyikan saat kosong
  (kelas ber-`display:` akan mengalahkan aturan UA `[hidden]` — jebakan yang sama seperti di dashboard.css).

### Re-map showcase — `/menu/` → `/showcase/2/` (2026-07-11, di branch)

Atas permintaan user, situs pelanggan dipindah agar masuk penomoran katalog. **Keputusan terkunci
"situs pelanggan hidup di `/menu/`" di-override secara sadar** (QR belum pernah dicetak, handover belum
jalan → satu-satunya jendela aman). Layout akhir: `showcase/1` (tema 1) · **`showcase/2` = situs pelanggan**
· `showcase/3..7` (tema 2..6 lama).

- **Yang PINDAH (git mv):** `menu/` → `showcase/2/`; `admin/index.html` + `admin/boot.js` → `showcase/2/admin/`.
  Tema `showcase/2..6` → `showcase/3..7` (turun dari 6, ke atas, agar tak bentrok).
- **Yang TETAP di root (dipakai bersama, root-relative):** `data/menu.json` (sumber kebenaran pelanggan),
  `images/`, `assets/`, dan **mesin dasbor `admin/`** (dashboard-core/editor/css + github-api/menu-model/
  image/qr/token-store/menu-store + vendor). Jadi `/admin/` sekarang **cuma rumah mesin**, bukan admin cafe.
- **Kenapa aman:** JS pelanggan (`assets/js/menu.js`) menghitung `data/menu.json` dari `import.meta.url`
  (module-relative) → tak peduli halaman pindah. Path repo-relative admin (`dataPath`/`imageDir`/`imageBases`)
  tak berubah. Yang berubah cuma path **page-relative** (kedalaman): `menu/index.html` `../` → `../../`;
  shell admin cafe → depth-3 (`../../../admin/…`, `../../../assets/…`, `imagePreviewBase '../../../'`,
  `siteUrl` `../`, `import('../../../admin/dashboard-core.js')`). Tema geser = kedalaman SAMA (`showcase/X/`),
  jadi `index.html`/`theme.js`/`theme.css` tak disentuh; hanya `admin/boot.js` tiap tema (dataPath/imageDir/
  imageBases + fallback URL) di-renumber.
- **Referensi `/menu/` yang ikut diubah:** galeri root (7 href `showcase/1..7/`), `404.html` (href statis +
  JS `root + 'showcase/2/'`), `manifest.webmanifest` (`start_url: showcase/2/`), `README.md`.
- **Terverifikasi headless:** galeri 1..7, pelanggan render + jam di `showcase/2/`, tema renumber render,
  admin cafe `showcase/2/admin/` login→muat `data/menu.json`, admin tema `showcase/3/admin/`→`showcase/3/
  data.json`, 404 home→`showcase/2/`, **nol path aset patah**.
- **⚠️ Jangan hapus `showcase/2/` saat handover** — itu situs pelanggan permanen di dalam pohon showcase.

### Arsitektur showcase & admin bersama (fase 2026-07-11) — detail di `SHOWCASE_PLAN.md`

- **Tiap desain `data.json` + admin sendiri, satu mesin admin bersama.** Sejak 2026-07-11 mesin itu
  adalah **dasbor** `admin/dashboard-core.js` + `admin/dashboard-editor.js` + `admin/dashboard.css`
  (lihat "### Dasbor admin" di bawah). Mesin lama `admin-core.js`/`table-editor.js`/`admin.css` **sudah
  dihapus**. Modul keamanan lama tetap dipakai apa adanya.
- **`boot.js` per admin** — CSP `script-src 'self'` melarang `<script>` inline, jadi config di modul
  same-origin yang **dynamic-import** `dashboard-core.js` (static import di-hoist → jalan sebelum config di-set).
- **Halaman tema** membaca `data.json` runtime: tema 1 pakai `showcase/lib.js`; tema 2–6 pakai engine
  bersama `showcase/menu-view.js`. Foto seed 31 hidangan di `showcase/menu-img/`. **CSP tema
  `connect-src 'self'`** (perlu fetch data sendiri).
- **Tema 5 "Rimba Hijau"** (poster hijau, ref 3) & **tema 6 "Dolce Dessert"** (poster dwiwarna
  krem+olive, ref 4) juga memakai engine bersama; kesetiaan visual ada di CSS + shell HTML masing-masing.
  Tema 6 memakai `clip-path: url(#dolce-wave)` (`clipPathUnits="objectBoundingBox"`, ikut skala) untuk
  lekuk pemisah krem/olive, dan menyembunyikan `.menu__title` secara visual (referensi tak punya judul
  kolom kanan) sambil tetap menyediakannya untuk pembaca layar + `aria-labelledby` #tabs.
- **Meta `cafe`** kini memuat `whatsapp/instagram/tiktok/maps` (divalidasi `normalizeCafe`: URL wajib
  `https`, WA disaring digit). Item punya `badge:'new'` selain `featured`. Halaman `/menu/` cafe kini
  punya footer sosial (`renderFooter`, href https-only).

### Dasbor admin — layout sidebar + tabel, dipakai SEMUA admin (fase 2026-07-11)

**Semua admin (cafe `/showcase/2/admin/` + tema `/showcase/{1,3..7}/admin/`) memakai satu mesin dasbor** (referensi
tabel produk): sidebar navigasi + bagian terpisah per halaman (Ringkasan · Kelola menu · Kategori ·
Identitas · Media sosial · Kode QR · Pemeliharaan) supaya menu panjang tidak jadi satu halaman menurun.
Dikerjakan dua tahap: cafe dulu (PR #1), lalu di-terapkan ke semua showcase atas permintaan user.

- **Satu mesin dasbor bersama.** `admin/dashboard-core.js` (auth/idle/QR/**routing sidebar** via
  `location.hash`) + `admin/dashboard-editor.js` (tabel + form + dialog) + `admin/dashboard.css`.
  Tiap admin men-set `window.__ADMIN_CONFIG` (owner/repo/dataPath/imageDir/imageBases/imagePreviewBase/
  siteUrl) di `boot.js`-nya lalu **dynamic-import** `dashboard-core.js`. Semua modul keamanan (github-api,
  token-store, menu-store, menu-model, image, qr) dipakai ULANG apa adanya — trust boundary tidak ditulis ulang.
- **Mesin admin LAMA dihapus.** `admin/admin-core.js`, `admin/table-editor.js`, `admin/admin.css` sudah
  **tidak ada lagi** (semua admin pindah ke dasbor). Jangan mencari/mengembalikannya.
- **Shell admin showcase identik** (semua di kedalaman `/showcase/N/admin/`, path sama `../../../admin/…`),
  jadi 6 `index.html` sama persis; yang beda cuma `boot.js` (config) + `palette.css` (warna tema) tiap folder.
  Shell showcase memakai mark 🍽 (cafe pakai ☕). `palette.css` memaksa `color-scheme: light` + menimpa token
  warna; ia juga men-set `--ok-*` (pil "Aktif" hijau) versi light agar tetap kontras walau OS gelap.
- **Tabel produk tunggal**: cari (nama id/en), saring kategori, urut kolom (nama/kategori/harga/status),
  checkbox + **aksi massal** (aktif/nonaktif/hapus lewat satu commit komposit, aman untuk id yang hilang),
  status = toggle **Aktif/Nonaktif** (stok memang tak ada di model — hanya `available`). Panah reorder hanya
  muncul saat urutan default (kategori asc, tanpa cari/saring). Form item pindah ke `<dialog>` modal.
- **Invarian dipertahankan**: gambar-dulu-lalu-JSON, nama file unik, pola mutator + retry 409, `textContent`
  (bukan `innerHTML`), CSP `script-src 'self'` (config di `boot.js` same-origin, dynamic-import).
- **`normalizeCafe` ditambah `description{id,en}` + `address{id,en}`** (additif, opsional, dipertahankan via
  `...prev` — tema yang tak mengirimnya tidak terpengaruh). Belum ditampilkan di `/menu/` (baru dikelola di admin).
- **Jebakan yang sudah ditutup**: selektor kelas ber-`display:` (grid/flex) **mengalahkan** aturan UA
  `[hidden]{display:none}` (author > UA pada spesifisitas sama), jadi atribut `hidden` berhenti menyembunyikan.
  `dashboard.css` memasang `[hidden]{display:none!important}` di awal. Tes fungsional yang cuma cek properti
  `.hidden` tak menangkap ini — screenshot yang menangkapnya.
- **Subjudul sidebar = "Dashboard Admin"** (dulu "Dasbor pemilik") — hardcoded di 7 shell `index.html`.
- **Ikon hapus item = tempat sampah SVG merah** (dulu glyph `✕`), dibangun `trashIcon()` di `dashboard-editor.js`
  via `createElementNS` (CSP-safe), `stroke:currentColor` → merah ikut `.iconbtn--danger`. Berlaku semua admin.
- **Tata letak KARTU tabel di HP (≤40rem)** — kini **SEMUA admin** (blok `@media` ada di `admin/dashboard.css`).
  Tiap `<tr>` jadi kartu bertumpuk (foto kiri-atas, checkbox kanan-atas, nama + Kategori/Harga berlabel +
  status + aksi menurun) → **tanpa scroll horizontal**. Enabler di JS bersama: `data-label` pada `<td>`
  kategori/harga + kelas `drow__name-cell`/`drow__status` (inert di desktop). `showcase/1/admin/mobile.css`
  (uji coba lama) sudah **dihapus** beserta tautannya.

### Showcase kini generik "Your Restaurant" + galeri "Katalog Menu Restoran" (2026-07-11, di branch)

- **Nama restoran di semua tema showcase (1–6) = "Your Restaurant"** (placeholder untuk client). Sumbernya
  `cafe.name` di `showcase/N/data.json`; `menu-view.js` menyetel `.brand__name` + `document.title` runtime.
  Fallback statis HTML (`<title>`, brand header/footer, admin `<title>`) + `aboutTitle` merek (tema 2 & 4)
  ikut diganti. **Komentar dev** (`// Tema 2 "Savoria Kitchen"…`) sengaja dibiarkan — itu identitas desain.
  **Cafe `/menu/` tetap "Kopi Senja"** (bukan showcase). **Label kartu galeri tetap nama desain** (kalau semua
  jadi "Your Restaurant", kartu jadi kembar). Preview tema 2–6 di-regen (framing 1280×880 → 16:11) agar tak basi.
- **Galeri root `/`** kini berframing "Katalog Menu Restoran" (eyebrow + judul + copy).

### Penyempurnaan galeri + halaman pelanggan + admin (2026-07-11)

- **Galeri `/` diredesain terang**: latar `#F4F4F0`, tipografi **serif system elegan** (`Iowan Old Style`/
  `Palatino`/`Georgia`) untuk display + sans untuk body, aksen terracotta `#B23A1E`, kartu putih berbayang.
  CSP galeri `font-src 'self'` → tanpa webfont CDN; pakai system font stack (nol dependensi, sesuai etos).
- **`/menu/` (pelanggan)** kini menampilkan **deskripsi + alamat** usaha di footer (`renderFooter`,
  `#foot-description`/`#foot-address`, bilingual via `pickLang`, `textContent`) + link **"← Kembali ke
  galeri desain"** (`.gallery-back` → `../`, i18n `backToGallery`; **hapus saat handover** — galeri sementara).
  `data/menu.json` cafe diberi contoh `description`/`address`.
- **Header tabel admin sticky**: `.table-scroll` diberi `max-height` + `overflow:auto` (jadi scroller
  vertikal) dan `thead th` `z-index:2` (tbody ada setelah thead → tanpa z-index, sel tergulung menimpa header).
  Berlaku semua admin (dashboard.css bersama).
- **Admin kini memakai palet + tipografi GALERI** (permintaan user): `dashboard.css` `body.dash` men-set
  latar `#F4F4F0` + aksen terracotta `#B23A1E` + judul serif, MENANG atas `:root` styles.css & palette.css
  (spesifisitas 0,1,1 > 0,1,0) → **semua admin (cafe + 6 tema) seragam, light-only**. Palet per-tema di
  `palette.css` kini tertimpa (praktis inert kecuali `color-scheme:light`). Admin tak lagi punya dark mode.
- **Showcase 1**: judul section menu `menuTitle` "Rekomendasi Chef" → **"Menu"** (strings.js + fallback HTML);
  editor tak punya badge "rekomendasi chef" jadi labelnya menyesatkan. Ornamen ♛ dekoratif tema dibiarkan.
- **Katalog**: nama kartu desain 5 **"Rimba Hijau" → "Organic"** (nama restoran di dalam tetap "Your Restaurant").
- **URL `menu_showcase` — DIBATALKAN user (2026-07-11).** Sempat diminta ganti `…github.io/cafe/` →
  `…/menu_showcase`; itu butuh **rename repo** (URL Pages = nama repo), operasi **admin** yang hanya bisa
  dilakukan owner `JustStartedHere` (kolaborator `itdevcba` = `admin:false`). User memilih **tetap `/cafe/`**.
  Kalau diminta lagi: owner rename repo dulu, baru ubah `repo:'cafe'`→`'menu_showcase'` di semua `boot.js` +
  fallback URL + README (jangan sebelum rename — admin akan gagal menulis), lalu cetak QR.

### Loading skeleton di semua halaman yang fetch data (2026-07-11)

Permintaan user: jangan biarkan layar kosong lalu konten tiba-tiba muncul setelah fetch selesai.

- **Cafe `/menu/`** sudah punya skeleton sejak awal (`show('skeleton')` di `assets/js/menu.js`) — tak diubah.
- **Tema showcase 1–6**: dulu `#dishes` cuma di-`clear()` (blank) saat load → kini `renderSkeleton()` di
  `showcase/lib.js` mengisi 6 kartu skeleton. Kedua engine memanggilnya (`showcase/1/theme.js` + `menu-view.js`
  untuk 2–6). **Kartu skeleton MEMAKAI ULANG kelas `.dish/.dish__media/.dish__body` tiap tema** → bentuknya
  otomatis ikut tema (kartu 4:3 tema 1, baris 120px tema 3, lingkaran 1:1 tema 6). Kilaunya di
  **`showcase/skeleton.css` bersama** (ditautkan di 6 shell tema, path `../skeleton.css`), warna pakai
  `color-mix(currentColor …)` → menyatu dengan latar tema apa pun tanpa token per-tema. CSP tema `style-src 'self'`
  mengizinkan link same-origin. `renderSkeleton` diekspor dari lib.js; jangan hapus.
- **Admin (semua)**: `editor.showLoading()` (di `dashboard-editor.js`, dipanggil `dashboard-core.js loadMenu`)
  mengisi skeleton **baris tabel Kelola menu (6) + kartu statistik Ringkasan** sebelum `store.load()`. Kilau
  `.skel-bar`/`.skel-block` + `@keyframes dash-shimmer` di `dashboard.css` (pakai token `--skeleton`). Ringkasan
  = view default setelah login, jadi statnya juga di-skeleton, bukan cuma tabel.
- **Uji loading**: server/mocks **menunda respons data.json** (~1.6–1.8s) agar skeleton tertangkap screenshot;
  fast-path (mock instan) membuat skeleton hanya berkedip. Tes fungsional cek jumlah `.dish--skeleton`/`.drow--skeleton`,
  `animationName`, lalu pastikan **skeleton hilang & konten asli render** setelah data datang.

### Penyempurnaan form admin + logo usaha + QR berlogo (2026-07-11)

- **Field pasangan sejajar**: `.field + .field{margin-top:1rem}` juga mengenai field KEDUA di dalam
  grid `.field-pair` → kolom kanan turun 16px. Ditutup `.field-pair > .field{margin-top:0}`.
- **Harga**: input `type=text` + masking ribuan id-ID saat mengetik (`formatRupiahInput`), panah spinner
  hilang. Disimpan tetap bilangan bulat (`priceDigits` strip titik saat submit; caret dipaksa ke akhir).
- **Identitas**: alamat jadi SATU field (buang alamat EN; model tetap `{id,en}` dgn en='') dan **field logo
  usaha** baru. Upload logo lewat pipeline gambar yang SAMA (compress→WebP, nama unik, gambar-dulu-lalu-JSON;
  state `logoPending/logoUploadedPath/logoRemove`). Disimpan di `cafe.logo`; `normalizeCafe` kini SET+validasi
  `logo` via `normalizeImage`. `findOrphans` mengecualikan `cafe.logo` agar tak tersapu cleanup.
- **Media sosial**: WA/IG/TikTok/Maps jadi satu kolom per baris (buang `.field-pair`).
- **QR berlogo**: EC `M`→`H`. Tengah QR = logo usaha (di-embed **data URI** via `fetch`+`FileReader` agar utuh
  offline/cetak) atau **ikon bell** (`BELL_PATHS`, terracotta) bila belum ada logo. `qr.js toSvg/toPngBlob`
  terima opsi `center:{href}|{bell}`. `dashboard-core` refresh logo QR saat load & saat buka bagian QR
  (`refreshQrLogo`, guard `qrLogoPath`). **Terverifikasi jsQR**: QR tetap terpindai dengan bell & logo di tengah.
- **Logo tampil di website**:
  - Cafe `/menu/`: `<img id="cafe-logo" class="header__logo">` di `.header__lead` (kiri nama). `renderHeader`
    set src via `logoSrc()` (util.js, allowlist sama; '' bila kosong → disembunyikan). CLS tetap 0.0000.
  - Tema 1–6: `renderBrandLogo(cafe)` (lib.js) **mengganti** mark dekoratif header (♛/🍴/🍰) dengan logo
    (mewarisi posisi mark tiap tema; emoji disimpan di `dataset.mark` untuk fallback). CSS `.brand__logo`
    (ukuran `em`, auto-skala) di `showcase/skeleton.css` bersama. Dipanggil dari `applyBrand` (theme.js +
    menu-view.js).
- **SEMUA form admin diduplikasi di 7 shell** — sejak re-map semuanya di `showcase/N/admin/index.html`
  (N = 1..7; **`showcase/2/admin/` = cafe**, sisanya tema). Perubahan markup form WAJIB diterapkan ke
  ketujuhnya (skrip replace exact-string; CSS/JS bersama otomatis). Cafe shell beda tipis: mark ☕ (tema 🍽),
  tanpa `palette.css`.

### Pemegang token `/admin` (diputuskan 2026-07-10)

Selama development: **`JustStartedHere`** — pemilik repo, jadi sudah admin. Fine-grained PAT single-repo tanpa
expiry bekerja apa adanya; Phase 3–4 ditulis sesuai rencana tanpa kompromi.

Saat handover: user akan membuat akun GitHub baru untuk owner/client, lalu repo **ditransfer** ke akun itu (syarat
agar fine-grained PAT milik owner bisa menjangkau repo — lihat "Catatan yang mudah terlupa"). Transfer mengubah URL
situs menjadi `{owner}.github.io/cafe/`, karena itu:

- **Jangan cetak QR (Phase 7) sebelum transfer selesai.** QR lama akan mati.
- `itdevcba` tetap cukup sebagai kolaborator write sepanjang Phase 1–8.

## Keputusan yang sudah dikunci

Jangan buka ulang keputusan ini tanpa diminta user — semuanya sudah dipertimbangkan dan dipilih secara sadar.

1. **Hosting & storage: GitHub Pages + Git sebagai database.**
   `data/menu.json` adalah sumber kebenaran; foto adalah file di `images/`. Nol server, nol biaya, nol kartu kredit.
   Alternatif yang **sudah ditolak dan tidak perlu dievaluasi ulang**: Firebase Storage (butuh billing sejak Feb 2026),
   Supabase (project auto-pause setelah 7 hari idle), Netlify + Decap CMS (Netlify Identity deprecated, butuh OAuth proxy),
   Cloudflare Pages + Worker (Worker = kode yang harus dipelihara).

2. **Owner mengelola menu sendiri** lewat `/admin`, autentikasi dengan fine-grained GitHub PAT
   (scope: satu repo, permission `Contents: read & write` saja) yang dipaste sekali.

3. **Bilingual Indonesia + English** dengan toggle. Field teks di `menu.json` berbentuk `{ id, en }`;
   kalau `en` kosong → fallback ke `id`.

4. **Fitur halaman publik: "Standar".** Chip kategori sticky + scroll-spy, kartu berfoto, badge Habis/Signature,
   skeleton loading, error/empty state, dark mode otomatis. **Tanpa search, tanpa detail sheet.**

5. **Tanpa build step.** Vanilla HTML/CSS/ES modules. Tidak ada `package.json`, `node_modules`, atau lockfile.
   Alasannya: nilai jual project ini adalah nol maintenance bertahun-tahun; toolchain npm menjamin `npm run build`
   akan patah dalam 2–3 tahun tanpa update.

6. **Tanpa service worker.** Satu-satunya hal yang bisa dilakukan SW di sini adalah menyajikan menu basi.

## Invarian — jangan dilanggar

Ini bukan preferensi gaya; masing-masing menutup satu kelas bug atau kerentanan nyata.

- **Nama file gambar selalu unik per upload** (`images/{itemId}-{random4}.webp`). Konsekuensinya: PUT gambar selalu
  operasi *create* → tak pernah butuh `sha`, tak pernah kena 409; pelanggan tak pernah melihat foto lama dari cache CDN;
  dan foto lama tetap utuh kalau penulisan JSON gagal. File lama tidak pernah ditimpa.

- **Urutan simpan: gambar dulu, `menu.json` kemudian.** Kalau JSON gagal, yang tertinggal hanya gambar yatim yang murah.
  Kebalikannya — JSON menunjuk gambar yang belum ada — membuat halaman pelanggan menampilkan gambar rusak.

- **Setiap edit direpresentasikan sebagai fungsi mutator `(menu) => menu`, bukan snapshot hasil.**
  Saat PUT mengembalikan 409 (sha basi), ambil ulang `menu.json` segar, terapkan ulang mutator, retry sekali.
  **Tidak pernah menimpa perubahan lain secara diam-diam.**

- **Halaman publik merender `menu.json` lewat `textContent` / `createElement` — tidak pernah `innerHTML`.**
  Repo publik bisa divandal; halaman pelanggan tidak boleh jadi vektor XSS.

- **Nol script pihak ketiga di `/admin/`.** Library QR di-vendor dan di-commit, tidak diambil dari CDN.
  Satu script CDN yang disusupi cukup untuk mengeksfiltrasi token. CSP ketat dipasang lewat `<meta>` di `admin/index.html`.

- **Token tidak pernah di-log.** Tanpa `console.log`, tanpa analytics, tanpa error reporter yang bisa men-serialize header.
  Default penyimpanan token = `sessionStorage` (bukan `localStorage`) kecuali user mencentang "Ingat di perangkat ini".

- **Base64 harus UTF-8-safe** (`TextEncoder` → `Uint8Array` → binary string → `btoa`), bukan `btoa()` langsung atas
  string JSON — nama item berbahasa Indonesia/emoji akan merusaknya.

- **Data di-fetch cache-busted**: `fetch('data/menu.json?v=' + Date.now(), { cache: 'no-store' })`.
  GitHub Pages menyajikan lewat Fastly dengan `Cache-Control: max-age=600`.

- Sesuai `~/.claude/CLAUDE.md`: minimalisme **tidak boleh** memangkas validasi di trust boundary, error-handling,
  security, otorisasi, atau integritas data. Wrapper `admin/github-api.js` adalah trust boundary di project ini.

## Catatan yang mudah terlupa

- GitHub **tidak** mendokumentasikan query-param untuk pre-fill form pembuatan fine-grained PAT (yang didukung hanya
  token classic). Jadi README owner harus berisi walkthrough bergambar, bukan janji deep-link yang mengisi otomatis.
- Fine-grained PAT untuk repo **personal** (non-org) bisa dibuat **tanpa expiry**. Repo milik org dibatasi 366 hari.
  Ini yang membuat klaim "tanpa biaya maintenance" benar-benar terpenuhi.
- **Fine-grained PAT hanya menjangkau resource milik satu *resource owner*: akun pembuat token sendiri, atau org tempat
  ia jadi member.** Repo milik akun personal *lain* — di mana pembuat token cuma kolaborator — **tidak bisa diakses**;
  GitHub mengakui ini sebagai gap. Outside collaborator hanya punya opsi PAT *classic*, yang tidak bisa di-scope ke satu
  repo sehingga meruntuhkan argumen blast-radius di Phase 4.
  **Konsekuensi: pemegang token `/admin` harus akun pemilik repo.** (Terverifikasi 2026-07-10 lewat GitHub Docs.)
- Repo milik akun **personal** tidak punya level peran untuk kolaborator — semua kolaborator dapat *write*, titik.
  Peran Admin/Maintain/Triage hanya ada di repo **organisasi**. Saat ini `itdevcba` adalah kolaborator write di
  `JustStartedHere/cafe`; itu sudah maksimal dan **cukup** untuk Phase 1–8 (semuanya cuma butuh commit + push).
- Rate limit REST authenticated: 5.000 request/jam — jauh di atas kebutuhan.
- GitHub Pages free: repo publik, cap 1 GB situs, 100 GB/bulan bandwidth, 10 build/jam. Semuanya *soft limit*.
- Semua path di HTML/JS harus **relatif**, agar situs jalan baik di `user.github.io/cafe/` maupun di root.

## Deviasi dari `PLAN.md` (disengaja)

- **`assets/img/placeholder.svg`, bukan `.webp`.** Placeholder adalah grafis datar: SVG lebih kecil, tajam di semua
  DPI, tanpa blob biner di repo. (Mesin dev juga tidak punya encoder WebP.) Foto item tetap WebP lewat pipeline admin.
- **`data/menu.json` belum punya foto asli** (`image: ""` → placeholder). Foto masuk lewat admin di Phase 6.
- **Tiga file admin di luar daftar `PLAN.md`**, masing-masing punya alasan:
  `admin/config.js` (OWNER/REPO/BRANCH di satu tempat — ini yang diubah saat transfer ke akun client),
  `admin/token-store.js` (aturan storage token dipisah agar mudah diaudit),
  `admin/admin.css` (kalau digabung ke `styles.css`, halaman pelanggan ikut menanggung byte-nya).
- **UI admin berbahasa Indonesia saja.** Bilingual hanya wajib untuk halaman pelanggan; owner-nya satu orang.
- **Lighthouse tidak dijalankan.** Ia butuh `npx lighthouse`, yaitu paket npm — bertentangan dengan keputusan
  "tanpa build step / tanpa toolchain npm". Sebagai gantinya metrik yang mendasari skornya diukur langsung lewat
  Chrome DevTools Protocol dengan throttling yang sama (CPU 4×, Slow 4G): FCP, LCP, TBT, CLS, plus pemeriksaan
  a11y terarah (alt, nama aksesibel, tap target, lang, hierarki heading, ukuran teks) dan audit kontras eksak.

## Token warna — sudah divalidasi (Phase 2)

Seluruh pasangan lolos WCAG AA. Dua token tambahan lahir dari audit; **jangan hapus**:

- **`--on-accent`** (`#FFFFFF` light / `#17120E` dark) — teks di atas `--accent`. Putih di atas accent dark
  (`#E08A4F`) hanya 2.1:1 dan **gagal AA**. Dipakai tombol, badge Signature, chip aktif, toggle bahasa aktif.
- **`--border-strong`** (`#96806D` light / `#8A7565` dark) — batas **kontrol interaktif** (chip, toggle bahasa),
  wajib ≥ 3:1 per WCAG 1.4.11. `--border` yang lembut tetap dipakai kartu, yang dikenali dari shadow + surface,
  bukan garisnya — jadi dekoratif dan boleh di bawah 3:1.

## Ukuran teks — ditegakkan (Phase 8)

Aturan **teks ≥ 16px** sempat dilanggar diam-diam di tujuh tempat. Sekarang:

- **Halaman pelanggan: 16px tanpa pengecualian.** Termasuk `.badge` — "Habis" adalah satu-satunya
  penanda *tekstual* untuk item habis; desaturasi foto hanyalah isyarat warna, dan isyarat warna
  saja tidak cukup. `.card__desc`, `.chip`, `.header__tagline`, `.lang__btn` kini mewarisi 1rem
  (font-size-nya dihapus, bukan diubah — supaya tidak ada yang menurunkannya lagi tanpa sadar).
- **Admin: lantai 15px.** Dipakai owner di layar besar, bukan pelanggan sambil berdiri.
  `.tag` (label "Signature"/"Habis" di daftar owner) tetap 14px — **pengecualian sadar**.
- Lantai ini dijaga otomatis oleh `a11y-test.mjs` (16px untuk halaman publik, 15px untuk admin).

## Jebakan yang sudah ditemukan dan ditutup (jangan diulang)

- **Scroll-spy tidak cukup dengan IntersectionObserver saja.** Seksi terakhir yang pendek tak pernah mencapai pita
  observasi karena halaman kehabisan ruang scroll — chip akan tetap menyorot kategori pertama padahal pelanggan
  sudah di dasar. Karena itu ada listener scroll pasif: saat di dasar, pemenangnya seksi terlihat **terakhir**.
- **Tinggi strip chip dan baris tagline harus di-reserve di shell HTML.** Keduanya diisi setelah fetch; tanpa
  reserve, header membesar dan seluruh halaman turun 47.5px → CLS 0.055 (di atas budget 0.05). Chip skeleton di
  `index.html` dan `min-height` pada `.header__tagline` yang menahannya. CLS sekarang 0.0000.
- **Scroll-spy dipasang di `requestAnimationFrame` setelah render, bukan di dalamnya.** Ia membaca `offsetHeight`
  dan `scrollWidth` (memaksa reflow); digabung dengan render ia jadi satu long task ~250 ms → TBT 230 ms. Dipisah,
  TBT turun ke ~100–180 ms.
- **`performance.getEntriesByType('largest-contentful-paint')` selalu kosong.** LCP dan `longtask` hanya muncul
  lewat `PerformanceObserver` dengan `buffered: true`. Mengukur pakai `getEntriesByType` menghasilkan `null`/`0`
  yang tampak seperti lolos.
- **Jangan menaruh karakter kontrol literal di source.** Regex `/[<NUL>-<US>]/` yang diketik apa adanya *berfungsi*,
  tapi tak terlihat, tak bisa di-grep, dan bisa dimakan editor/encoding. Tulis `/[\x00-\x1f\x7f]/`.
- **Uji `getFile`, `putFile`, `deleteFile` di branch scratch, bukan `main`.** Menulis ke `main` memicu rebuild Pages
  dan mengotori history yang dilihat owner. Branch scratch membuktikan hal yang sama tanpa efek samping.
- **`frame-ancestors` diabaikan kalau dipasang lewat `<meta>` CSP.** Ia butuh header HTTP, dan GitHub Pages tidak
  bisa menyetel header. Jangan menambahkannya ke meta lalu mengira clickjacking sudah tertutup.
- **Uji `/admin/` tanpa token GitHub asli**: intercept `api.github.com` lewat CDP `Fetch.enable` dan palsukan
  responsnya (jangan lupa header CORS + membalas preflight `OPTIONS`). Ini sekaligus membuktikan halaman memang
  tidak menghubungi host lain.
- **`requestSubmit()` diblokir validasi native** kalau ada field `min`/`step`/`required` yang tidak lolos — handler
  `submit` tidak pernah jalan. Form admin memakai `novalidate` supaya validator `menu-model.js` yang berbicara
  (bahasa Indonesia, aturan lebih ketat: harga harus bilangan **bulat**).
- **Autentikasi dan pemuatan data harus terpisah.** Menggabungkan `store.load()` ke dalam `signIn()` membuat
  `data/menu.json` yang hilang mengunci admin sepenuhnya — owner cuma melihat "kesalahan tak terduga" tanpa jalan
  keluar. Sekarang login sukses lebih dulu, lalu error pemuatan tampil di editor dengan tombol "Muat ulang".
- **Nama kategori duplikat harus ditolak, bukan cuma id duplikat.** Id kategori berasal dari slug, jadi kategori
  lama ber-id `coffee` bernama "Kopi" tidak bentrok dengan slug `kopi` — tapi pelanggan melihat dua "Kopi".
- **Scroll-spy dihitung dari geometri, bukan `IntersectionObserver`.** IO dengan `rootMargin` negatif gagal di dua
  kasus nyata: seksi terakhir yang pendek tak pernah mencapai pita, dan di layar lebar seluruh menu muat tanpa
  scroll sehingga klik chip tidak menyalakan apa pun. Uji scroll-spy **lintas viewport** (390, 900, 1440, 1920) —
  bug ini tak terlihat di viewport HP saja.
- **Umpan tes kompresi harus menyerupai foto, bukan noise RGB acak.** Noise murni tak bisa dikompresi dan membuat
  hasil menembus 300 KB, seolah pipeline-nya rusak. Pakai gradien + bentuk + grain halus.
- **`Runtime.evaluate` bukan modul**: top-level `await` di dalamnya adalah SyntaxError. Pakai `import().then()`.
- **Jangan `git add -A` di repo ini.** User menaruh file kerjanya sendiri (mis. `docs/references/`); sapuan buta
  akan menyeretnya ke dalam commit fase. Tambahkan file per nama.
- **Ekspektasi tes halaman publik harus dibaca dari `data/menu.json`, bukan di-hardcode.** Owner mengedit menu
  lewat `/admin/` di produksi; daftar item yang ditulis tangan akan basi dan memunculkan "kegagalan" palsu.
- **`404.html` tidak boleh menautkan aset apa pun.** GitHub Pages menyajikannya untuk URL di kedalaman mana pun,
  jadi path relatif meleset; path absolut patah kalau situs pindah ke root domain. CSS di-inline, tautan pulang
  dihitung runtime dari `location`.
- **Chrome headless di mesin ini tidak punya `BarcodeDetector`.** Untuk memverifikasi QR, decode dengan jsQR yang
  disuntik ke halaman **hanya saat tes** (jangan pernah di-commit).
- **Mesin ini tidak punya encoder gambar** (`convert` = `convert.exe` bawaan Windows, `python` = alias Store).
  Ikon PNG dirasterisasi dari SVG lewat `Page.captureScreenshot` headless Chrome, sekali, lalu di-commit.
- **`<span class="field__label">` bukan label.** Pola "span di dalam `<label>` pembungkus" bekerja untuk `<input>`
  biasa, tapi `<input type="file">` di `admin/index.html` berada di luar pembungkusnya — pembaca layar hanya
  mengumumkan "file upload". Ia butuh `<label for>` eksplisit. Editor admin **hanya bisa diaudit setelah login**;
  audit yang berhenti di layar token melewatkan seluruh form.
- **`getComputedStyle(el, ':focus-visible')` selalu mengembalikan kosong** — itu pseudo-*class*, bukan
  pseudo-element. Tes "ring fokus ada" yang memakainya lolos secara hampa. Periksa `document.styleSheets`.
- **Field `image` di `menu.json` divalidasi dengan allowlist** (`^(images|assets)/[A-Za-z0-9._/-]+$`), bukan
  diserahkan ke `onerror`. Repo publik bisa divandal jadi `javascript:…`; `<img>` memang tidak mengeksekusinya,
  tapi menggantungkan keamanan pada penanganan error itu kebiasaan buruk.
- **Harness tes punya dua syarat yang mudah terlupa**: Chrome headless harus dijalankan dengan `--lang=id-ID`
  (kalau tidak, `getLang()` jatuh ke `en` lewat `navigator.language` dan seluruh ekspektasi bahasa Indonesia
  "gagal"), dan `idle-test.mjs` harus menunjuk salinan situs yang `IDLE_MINUTES`-nya sudah dipangkas — bukan
  `D:\Project\cafe` yang aslinya 20 menit.

## Kontrak QR & PWA (Phase 7)

- `admin/vendor/qrcode-generator.js` — **di-vendor, di-pin, di-commit.** Header memuat versi, URL sumber, tanggal,
  dan sha256. Jangan mengubah isinya; kalau perlu upgrade, unduh ulang, audit ulang (nol DOM/fetch/eval/storage),
  perbarui sha256.
- `createSvgTag()`/`createImgTag()` milik library **tidak dipakai** — keduanya merakit HTML sebagai string.
  `admin/qr.js` membaca `isDark()` dan membangun DOM lewat `createElementNS`.
- URL yang di-encode dihitung dari `location` halaman admin (`boot.js` `siteUrl` = `../` dari `showcase/2/admin/`
  → `showcase/2/`), jadi otomatis benar setelah repo ditransfer. **QR jangan dicetak sebelum transfer selesai.**
- **Situs pelanggan hidup di `/showcase/2/`, bukan di root maupun `/menu/` lagi.** Root ditempati galeri showcase.
  QR menunjuk `/showcase/2/`. Setelah QR dicetak, **`/showcase/2/` tidak boleh dipindah lagi**. ⚠️ **Catatan:**
  situs pelanggan kini berada DI DALAM pohon `showcase/` yang secara historis ditandai "sementara/boleh dihapus" —
  jangan hapus `showcase/2/` (itu situs pelanggan permanen); yang boleh dihapus saat handover hanyalah kartu galeri
  root + tema alternatif (showcase 1,3..7), bukan slot 2.
- Quiet zone 4 modul wajib menurut spesifikasi QR — jangan dikurangi demi estetika.
- Tetap **tanpa service worker**. `pwa-test` menegakkan ini: nol registrasi, `sw.js` harus 404.

## Kontrak pipeline gambar (Phase 6)

- Nama file **selalu unik**: `images/{itemId}-{random4}.webp`. Karena itu PUT gambar **selalu create** — tanpa `sha`,
  tak pernah 409, dan pelanggan tak pernah melihat foto lama dari cache Fastly. **File lama tidak pernah ditimpa.**
- Urutan **gambar dulu, `menu.json` kemudian**, tanpa kecuali. Kebalikannya membuat JSON menunjuk file yang belum ada.
- `id` item dikunci saat form dibuka, bukan saat menyimpan — nama file memuatnya, dan itu membuat retry idempoten.
  `mutators.addItem` menerima `draft.id`; jangan hapus kemampuan itu.
- Gagal menulis JSON setelah gambar naik → foto **yatim**, bukan bencana. `uploadedPath` disimpan sehingga retry
  hanya mengulang langkah JSON. Menu tak pernah setengah jadi.
- Ganti foto meninggalkan yatim (disengaja). Hapus item menyapu fotonya *best-effort*, **setelah** `menu.json` benar.
- "Bersihkan foto tak terpakai" = `listDir('images')` diff terhadap `item.image`. `.gitkeep` tidak pernah dihapus.

## Kontrak mutator (Phase 5) — jangan dilanggar di Phase 6

`admin/menu-model.js` mengekspor `mutators.*` yang mengembalikan fungsi **`(menu) => menu`**, bukan hasil jadi.
`admin/menu-store.js` `save(mutator, message)` yang menerapkannya; saat PUT membalas 409 ia mengambil `menu.json`
segar dan **menerapkan ulang mutator yang sama** ke isi terbaru, lalu retry sekali. 409 lagi → `StaleMenuError`
dan state dimuat ulang.

Konsekuensi yang mengikat: **mutator harus mencari berdasarkan `id`, tidak pernah berdasarkan indeks/posisi**,
dan tidak boleh menutup (closure) atas salinan menu lama. Melanggar ini akan menimpa perubahan orang lain secara
diam-diam, dan tesnya tidak akan menangkapnya kecuali ada penulisan dari "tab lain" di antaranya.

## Kontrak `admin/github-api.js` (Phase 3)

`createGitHubClient({ owner, repo, token, branch, fetchImpl })` → `verifyAccess`, `getFile`, `getJson`, `putFile`,
`putJson`, `deleteFile`, `listDir`. `fetchImpl` ada khusus untuk pengujian — jangan dihapus.

Error bertipe yang **wajib** ditangani pemanggil (Phase 4–6):

| Error | Kapan | Yang harus dilakukan admin |
|---|---|---|
| `AuthError` | 401, atau 403 yang bukan kuota | Hapus token tersimpan, kembali ke layar auth |
| `RateLimitError` | 403 + `x-ratelimit-remaining: 0`, atau `Retry-After` | Tampilkan `resetAt` / `retryAfter` |
| `NotFoundError` | 404 | Arahkan cek repo/path/scope token |
| `ConflictError` | 409, `sha` basi | GET ulang → re-apply mutator → retry sekali |
| `ValidationError` | 422, atau JSON rusak | Tampilkan pesan API |
| `NetworkError` | fetch gagal / offline | **Pertahankan isi form**, tawarkan Retry |

`putFile` tanpa `sha` = create; dengan `sha` = update. `deleteFile` menolak tanpa `sha`.
Semua penulisan mengembalikan `sha` baru — pakai itu untuk penulisan berikutnya di sesi yang sama.

## Gaya kerja di project ini

- Bahasa untuk berkomunikasi dengan user: **Indonesia**.
- Copy UI: bilingual ID + EN, keduanya harus di-review (Phase 8).
- Budget performa: HTML+CSS+JS < 30 KB gzip; gambar terbesar < 300 KB; LCP < 2.0s; CLS < 0.05.
- Aksesibilitas: teks ≥ 16px, kontras WCAG AA ≥ 4.5:1, tap target ≥ 44×44px.
