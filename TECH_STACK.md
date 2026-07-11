# Tech Stack & Arsitektur — Website Menu Cafe

> Pendamping `PRD.md`. Dokumen ini menjelaskan **BAGAIMANA** project ini dibangun sekarang, **pola
> arsitektur kuncinya**, dan **panduan memetakan tiap komponen** kalau di-rewrite ke bahasa/stack lain.

---

## 1. Ringkasan Arsitektur (kondisi saat ini)

```
                        ┌─────────────────────────────────────────────┐
   Pelanggan (HP) ───▶  │  Halaman statis (HTML/CSS/ES modules)        │
     scan QR            │  di GitHub Pages                             │
                        │   • fetch data.json (cache-busted)          │
                        │   • render menu (textContent, anti-XSS)     │
                        └───────────────┬─────────────────────────────┘
                                        │ baca
                              ┌─────────▼──────────┐
                              │  Git repo (GitHub) │  ◀── "database"
                              │  data.json + fotos │
                              └─────────▲──────────┘
                                        │ tulis (commit) via REST Contents API
                        ┌───────────────┴─────────────────────────────┐
   Pemilik (HP/PC) ──▶  │  Panel admin (HTML/CSS/ES modules)           │
     tempel token       │   • auth via GitHub fine-grained PAT        │
                        │   • kompres foto → WebP (Canvas)            │
                        │   • tulis foto lalu data (mutator + retry)  │
                        │   • generate QR (library di-vendor)         │
                        └─────────────────────────────────────────────┘
```

**Prinsip:** **nol server, nol build step, nol dependency runtime.** Semua logika jalan di browser.
"Backend" = GitHub REST API. "Database" = berkas di Git. "Hosting" = GitHub Pages (statis).

---

## 2. Stack Saat Ini

| Lapisan | Teknologi | Catatan |
|---|---|---|
| **Bahasa** | HTML5, CSS3, **JavaScript ES modules (vanilla)** | Tanpa TypeScript, tanpa framework |
| **Build** | **Tidak ada** | Berkas dilayani apa adanya; tak ada bundler/transpiler/lockfile |
| **Hosting** | **GitHub Pages** (repo publik) | Statis, gratis, auto-deploy saat push ke `main` |
| **"Database"** | **Git** — `data.json` + berkas foto di repo | Sumber kebenaran; riwayat = versi otomatis |
| **Auth admin** | **GitHub fine-grained PAT** (Contents: read & write, satu repo) | Ditempel owner; `sessionStorage`/`localStorage` |
| **API tulis/baca** | **GitHub REST Contents API** (`GET/PUT /repos/:o/:r/contents/:path`) | PUT tanpa sha=create, dengan sha=update |
| **Proses gambar** | **Canvas API** di browser → kompres ke **WebP** | Nama unik `{itemId}-{rand}.webp` |
| **QR code** | Library `qrcode-generator` **di-vendor & di-commit** (bukan CDN) | DOM dibangun via `createElementNS` |
| **i18n** | Field `{id,en}` di data + string UI statis; toggle runtime | Fallback `en→id` |
| **Testing** | **Headless Chrome via CDP** (Chrome DevTools Protocol) | Mock GitHub API via `Fetch` domain interception |
| **Deploy** | Push ke `main` → GitHub Pages rebuild | Default build; **tanpa** `.github/workflows` khusus |

**Nol dependency runtime:** tak ada `package.json`, `node_modules`, atau CDN `<script>`. Satu-satunya
dependency vendor = library QR yang di-commit ke repo (`admin/vendor/qrcode-generator.js`), dipin + di-hash.

---

## 3. Struktur Repo

```
/                          root = galeri showcase (index.html)
├── data/menu.json         DATA situs pelanggan (sumber kebenaran)
├── images/                foto item + logo usaha (WebP)
├── assets/
│   ├── css/styles.css     style halaman pelanggan
│   ├── js/                ES modules pelanggan: menu.js (entry), render.js, util.js, i18n.js
│   └── img/               ikon, placeholder
├── admin/                 MESIN DASBOR BERSAMA (dipakai semua admin)
│   ├── dashboard-core.js    auth, idle, routing sidebar, orkestrasi
│   ├── dashboard-editor.js  tabel + form + dialog + pipeline gambar
│   ├── dashboard.css
│   ├── github-api.js        WRAPPER API (trust boundary): verifyAccess/getFile/putFile/deleteFile/listDir
│   ├── menu-model.js        validasi + normalisasi + `mutators.*` (fungsi (data)=>data)
│   ├── menu-store.js        load/save + retry saat konflik 409 (re-apply mutator)
│   ├── image.js             kompres WebP, nama unik, cari foto yatim
│   ├── qr.js                bangun QR (SVG/PNG) + logo di tengah
│   ├── token-store.js       simpan token (session/local), tak pernah di-log
│   └── vendor/qrcode-generator.js   library QR di-pin
├── showcase/
│   ├── lib.js               runtime bersama tema (resolveImg, renderHours, renderBrandLogo, skeleton)
│   ├── menu-view.js         engine tampilan tema 2..7
│   ├── skeleton.css         skeleton + gaya bersama tema
│   ├── menu-img/            foto contoh bersama semua tema
│   ├── 1/ 3/ 4/ 5/ 6/ 7/    tema alternatif — tiap folder: index.html, theme.js, theme.css,
│   │                          strings.js, data.json, admin/(index.html + boot.js [+ palette.css])
│   └── 2/                    SITUS PELANGGAN (dipindah dari /menu/), admin cafe di showcase/2/admin/
├── 404.html                home dihitung runtime (menunjuk situs pelanggan)
├── manifest.webmanifest    PWA manifest (start_url = situs pelanggan)
└── PLAN.md, SHOWCASE_PLAN.md, CLAUDE.md, README.md, PRD.md, TECH_STACK.md   dokumentasi
```

**Catatan penting arsitektur admin:** `admin/` bukan sekadar "admin cafe" — ia adalah **mesin dasbor
bersama** yang dipakai SEMUA admin (cafe + semua tema). Tiap admin cuma menyetel konfigurasi
(`window.__ADMIN_CONFIG` di `boot.js`-nya: owner/repo/dataPath/imageDir/siteUrl/...) lalu meng-import
`dashboard-core.js`. Karena CSP `script-src 'self'` melarang `<script>` inline, config ditaruh di modul
same-origin (`boot.js`) yang **dynamic-import** mesin.

---

## 4. Pola Arsitektur Kunci (WAJIB dipahami sebelum rewrite)

Ini bukan detail gaya — masing-masing menutup satu kelas bug/kerentanan nyata.

1. **Trust boundary tunggal (`github-api.js`).** Semua I/O ke penyimpanan lewat satu wrapper yang
   melempar error bertipe: `AuthError` (401/403), `RateLimitError`, `NotFoundError` (404),
   `ConflictError` (409 sha basi), `ValidationError` (422/JSON rusak), `NetworkError`. Pemanggil wajib
   menangani tiap tipe (mis. NetworkError → pertahankan isi form + tawarkan retry).
   → *Di rewrite: ini menjadi lapisan client API ke backend Anda; kontrak error yang sama tetap berguna.*

2. **Pola mutator + retry konflik.** Setiap edit direpresentasikan sebagai fungsi **`(data) => data`**
   (bukan snapshot hasil). `save(mutator)` menerapkannya; saat tulis balik ditolak karena data berubah
   (409/sha basi), ambil data terbaru, **terapkan ulang mutator yang sama**, coba lagi sekali. **Mutator
   harus cari berdasarkan `id`, tak pernah indeks/posisi.** Ini mencegah menimpa perubahan sesi lain.
   → *Di rewrite dengan DB transaksional, ini bisa jadi transaksi/optimistic-locking; polanya tetap relevan.*

3. **Urutan simpan: gambar DULU, data KEMUDIAN.** Kalau tulis data gagal → hanya foto yatim (murah).
   Sebaliknya (data menunjuk foto belum ada) → gambar rusak di halaman pelanggan.

4. **Nama file gambar unik per upload** (`{itemId}-{random}.webp`). Konsekuensi: PUT foto **selalu create**
   → tak butuh sha, tak pernah konflik, pelanggan tak pernah lihat foto lama dari cache CDN, foto lama
   utuh bila tulis data gagal.

5. **Render anti-XSS.** Halaman publik membangun DOM lewat `textContent`/`createElement`, **tidak pernah
   `innerHTML`.** Data berasal dari sumber yang bisa divandal.

6. **Allowlist path gambar** (`^(images|assets|showcase)/[A-Za-z0-9._/-]+$`, tolak `..`/skema/`//host`)
   divalidasi di sisi render — bukan bergantung pada `onerror`.

7. **Base64 aman UTF-8** saat menulis (TextEncoder → bytes → btoa), bukan `btoa()` langsung atas string
   JSON — nama Indonesia/emoji akan rusak.

8. **Fetch cache-busted** (`?v=<timestamp>`, `cache:'no-store'`) agar edit owner langsung terlihat meski
   CDN meng-cache.

9. **Anti-CLS**: tinggi elemen yang diisi setelah fetch (chip, tagline, kartu) di-reserve di shell HTML;
   skeleton mengisi ruang sebelum data datang.

10. **Resolusi path via `import.meta.url`**, bukan relatif-halaman: modul JS menghitung akar situs dari
    lokasi modulnya sendiri, sehingga halaman bisa dipindah folder tanpa mengubah logika fetch.

---

## 5. Model Keamanan

- **Repo publik** → semua data/kode terlihat dunia (read-only bagi publik). Tulis butuh akses collaborator
  atau token owner. Lihat bagian keamanan di `PRD.md`.
- **CSP ketat** dipasang via `<meta>`:
  - Admin: `script-src 'self'; connect-src 'self' https://api.github.com; img-src 'self' data: blob:;
    style-src 'self'`. (Catatan: `frame-ancestors` TIDAK berfungsi via `<meta>` — butuh header HTTP, yang
    GitHub Pages tak bisa set. Jangan mengandalkannya untuk anti-clickjacking.)
  - Tema: `style-src 'self'; connect-src 'self'; font-src 'self'` (perlu fetch data sendiri, pakai system font).
- **Nol script pihak ketiga di admin** — library QR di-vendor, dipin, di-hash (sha256 di header berkas).
- **Token**: `sessionStorage` default (bukan `localStorage`), tak pernah di-log/serialisasi.
- **Idle auto-logout** di panel admin.

---

## 6. Testing (kondisi saat ini)

Tanpa framework tes (konsisten dengan "tanpa npm"). Verifikasi pakai **Node + headless Chrome via CDP**:
- Serve repo dari server statis lokal.
- Untuk uji admin: **intercept `api.github.com`** via CDP `Fetch.enable` + `Fetch.fulfillRequest`
  (palsukan respons + header CORS + balas preflight OPTIONS). Sekaligus membuktikan halaman tak menghubungi
  host lain.
- Ukur metrik performa (FCP/LCP/TBT/CLS) via `PerformanceObserver` dengan throttling (CPU 4×, Slow 4G).
- Screenshot menangkap regresi visual yang tes fungsional lewatkan (mis. jebakan spesifisitas CSS
  `[hidden]` vs kelas ber-`display:`).
- QR di-decode dengan `jsQR` yang disuntik saat tes (Chrome headless mesin dev tak punya `BarcodeDetector`).

→ *Di rewrite, ganti dengan test runner konvensional (unit + integrasi + e2e). Kontrak yang perlu diuji:
alur mutator+retry, urutan gambar-lalu-data, validasi trust boundary, render anti-XSS, i18n fallback,
penggabungan rentang jam operasional.*

---

## 7. Deploy (kondisi saat ini)

- Push ke `main` → **GitHub Pages** rebuild otomatis (build default, bukan Actions workflow kustom).
- `.nojekyll` menonaktifkan pemrosesan Jekyll. `robots.txt` mengatur crawler.
- **Semua path di HTML/JS harus relatif** agar jalan baik di `user.github.io/cafe/` maupun di root domain.
- **Jangan commit folder kerja worktree** ke repo (pernah tak sengaja terjadi → di-`.gitignore`
  `.claude/worktrees/`; kalau tidak, gitlink tanpa `.gitmodules` membuat build Pages gagal di
  `git submodule update`).

---

## 8. Panduan Rewrite — Pemetaan ke Stack Konvensional

Kalau menulis ulang dengan backend/framework nyata (mis. Next.js + Postgres, Laravel, Rails, Go, dsb),
petakan komponen begini:

| Komponen sekarang | Padanan konvensional | Catatan rewrite |
|---|---|---|
| `data.json` di Git | Tabel DB (`cafes`, `categories`, `items`) + kolom JSON untuk `{id,en}` & `hours` | Pertahankan bentuk data & aturan (bilingual, order per-kategori, hours 7 entri) |
| Foto di `images/` (Git) | Object storage (S3/R2/GCS) atau `/uploads` + CDN | Pertahankan: nama unik, upload-dulu-baru-data |
| GitHub Contents API | REST/GraphQL backend Anda (`GET /menu`, `PUT /items/:id`, dll) | Pertahankan kontrak error bertipe |
| Fine-grained PAT | Session cookie / OAuth / JWT | Owner login biasa; RBAC tetap sederhana (1 peran) |
| Mutator + retry 409 | Transaksi DB / optimistic locking (`updated_at`/version) | Pola & alasan tetap sama |
| Kompres WebP di Canvas | Bisa tetap client-side, atau pindah ke server (sharp/imagemagick) | Tetap hasilkan WebP + nama unik |
| Library QR di-vendor | Library QR server/klien pilihan | Pertahankan logo-di-tengah + tetap ter-scan |
| Render `textContent` | Templating/JSX dengan auto-escaping | Jangan pernah render data mentah tanpa escape |
| CSP via `<meta>` | Header CSP dari server (lebih kuat; bisa `frame-ancestors`) | Server bisa set header HTTP → CSP lebih lengkap |
| Fetch cache-busted | Cache-Control/ETag yang benar dari server | Hindari menyajikan menu basi |
| Hosting GitHub Pages | Host statis + backend, atau full-stack host | Kalau tetap ingin nol-biaya, timbang trade-off |

**Yang WAJIB dipertahankan lintas-bahasa** (esensi, bukan detail):
1. Model data bilingual `{id,en}` + item/kategori + jam operasional per hari (7 entri).
2. Pemisahan **halaman pelanggan read-only** vs **panel admin swakelola**.
3. Alur **upload gambar dulu, tulis data kemudian** + **nama file unik**.
4. **Anti-timpa** (mutator/optimistic-lock berbasis `id`) saat penulisan bersamaan.
5. **Render anti-XSS** + **validasi di trust boundary** (harga bulat, URL https, path gambar allowlist).
6. **Budget performa & aksesibilitas** (lihat `PRD.md` §10).
7. **i18n dengan fallback `en→id`.**

**Yang BEBAS diganti:** bahasa, framework, DB vs Git, auth PAT vs session/OAuth, pipeline gambar
client vs server, hosting. Pilihan "nol build / nol server / Git-as-DB" adalah keputusan sadar demi
nol-biaya & nol-pemeliharaan — kalau target rewrite berbeda (mis. butuh skala, multi-cabang, atau tim),
backend nyata + DB jelas lebih tepat; dokumen ini sudah memisahkan *apa yang esensial* dari *apa yang
kebetulan begini karena kendala hosting gratis*.
