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
| Fase terakhir selesai | **Phase 1** — data + render publik |
| Fase berikutnya | **Phase 2** — design system, i18n + toggle, chip kategori & scroll-spy |
| Direktori kerja | `D:\Project\cafe` |
| Git | `main` → `https://github.com/JustStartedHere/cafe` (publik) |
| Situs | `https://juststartedhere.github.io/cafe/` — Pages dari `main`, folder root |
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
- **String statis "Signature"/"Habis" masih inline di `render.js`.** Pindah ke `i18n.js` saat Phase 2, bersama toggle
  bahasa. Teks empty/error di `index.html` juga masih Indonesia saja — Phase 2 yang membilingualkannya.
- **`data/menu.json` belum punya foto asli** (`image: ""` → placeholder). Foto masuk lewat admin di Phase 6.

## Gaya kerja di project ini

- Bahasa untuk berkomunikasi dengan user: **Indonesia**.
- Copy UI: bilingual ID + EN, keduanya harus di-review (Phase 8).
- Budget performa: HTML+CSS+JS < 30 KB gzip; gambar terbesar < 300 KB; LCP < 2.0s; CLS < 0.05.
- Aksesibilitas: teks ≥ 16px, kontras WCAG AA ≥ 4.5:1, tap target ≥ 44×44px.
