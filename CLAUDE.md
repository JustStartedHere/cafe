# Cafe Menu Website — Konteks Project

## Apa ini

Website statis untuk menampilkan menu cafe. Pelanggan scan QR di meja → langsung lihat menu.
**Tidak ada pemesanan/checkout** — murni etalase.

Requirement asli ada di `Product Discovery.md`. Rencana implementasi lengkap (sudah disetujui) ada di
**`PLAN.md`** — baca itu sebelum mulai bekerja.

Di atasnya kini ada pekerjaan kedua: **etalase 5 opsi desain untuk client**, rencananya di
**`SHOWCASE_PLAN.md`**. Baca itu sebelum menyentuh `/` atau `showcase/`.

## Status saat ini

Situs pelanggan selesai (Phase 1–8). Showcase berjalan: galeri di root + tema 1 selesai.
Tema 2–4 (`docs/references/2–4.jpg`) menyusul.

| | |
|---|---|
| Fase terakhir selesai | **Showcase tema 1** + galeri root — lihat `SHOWCASE_PLAN.md` |
| Berikutnya | Tema 2, 3, 4, lalu **serah terima**: transfer repo ke akun client, cetak QR |
| Direktori kerja | `D:\Project\cafe` |
| Git | `main` → `https://github.com/JustStartedHere/cafe` (publik) |
| Situs pelanggan | `https://juststartedhere.github.io/cafe/menu/` ← **yang di-encode QR** |
| Galeri showcase | `https://juststartedhere.github.io/cafe/` — sementara, boleh dihapus nanti |
| Blocker | — |

Update tabel ini setiap kali sebuah fase selesai.

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
- URL yang di-encode dihitung dari `location` halaman admin (`config.js` → `SITE_URL` = `../menu/`), jadi otomatis
  benar setelah repo ditransfer. **QR jangan dicetak sebelum transfer selesai.**
- **Situs pelanggan hidup di `/menu/`, bukan di root.** Root ditempati galeri showcase yang sifatnya sementara.
  Itulah sebabnya QR menunjuk `/menu/`: galeri boleh dihapus kapan pun tanpa mematikan QR yang sudah tercetak.
  Setelah QR dicetak, **`/menu/` tidak boleh dipindah lagi**.
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
