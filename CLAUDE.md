# Cafe Menu Website — Konteks Project

## Apa ini

Website statis untuk menampilkan menu cafe. Pelanggan scan QR di meja → langsung lihat menu.
**Tidak ada pemesanan/checkout** — murni etalase.

Requirement asli ada di `Product Discovery.md`. Rencana implementasi lengkap (sudah disetujui) ada di
**`PLAN.md`** — baca itu sebelum mulai bekerja.

## Status saat ini

Phase 0 selesai. Situs live dan menyajikan placeholder "Menu segera hadir".

| | |
|---|---|
| Fase terakhir selesai | **Phase 0** — skeleton + Pages aktif |
| Fase berikutnya | **Phase 1** — data + render publik |
| Direktori kerja | `D:\Project\cafe` |
| Git | `main` → `https://github.com/JustStartedHere/cafe` (publik) |
| Situs | `https://juststartedhere.github.io/cafe/` — Pages dari `main`, folder root |
| Blocker | — |

Update tabel ini setiap kali sebuah fase selesai.

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
- Rate limit REST authenticated: 5.000 request/jam — jauh di atas kebutuhan.
- GitHub Pages free: repo publik, cap 1 GB situs, 100 GB/bulan bandwidth, 10 build/jam. Semuanya *soft limit*.
- Semua path di HTML/JS harus **relatif**, agar situs jalan baik di `user.github.io/cafe/` maupun di root.

## Gaya kerja di project ini

- Bahasa untuk berkomunikasi dengan user: **Indonesia**.
- Copy UI: bilingual ID + EN, keduanya harus di-review (Phase 8).
- Budget performa: HTML+CSS+JS < 30 KB gzip; gambar terbesar < 300 KB; LCP < 2.0s; CLS < 0.05.
- Aksesibilitas: teks ≥ 16px, kontras WCAG AA ≥ 4.5:1, tap target ≥ 44×44px.
