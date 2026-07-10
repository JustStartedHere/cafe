# Website Menu Cafe — Static, $0 Selamanya, Owner Bisa CRUD

## Context

Cafe ingin pelanggan scan QR di meja lalu langsung melihat menu di website. Tidak ada pemesanan/checkout — murni etalase. Tiga batasan dari `Product Discovery.md` yang saling menekan:

1. **Gratis penuh** — tanpa domain, tanpa hosting, tanpa biaya maintenance.
2. **Responsive**, ringan, minimalis, membangkitkan selera.
3. **Owner bisa CRUD produk dan foto** sendiri.

Ketegangannya ada di (1) + (3): CRUD dengan upload foto biasanya butuh backend + object storage. Verifikasi free-tier per Juli 2026 mempersempit pilihan secara tegas:

| Opsi | Status |
|---|---|
| Firebase Storage | Butuh Blaze/billing sejak Feb 2026 — gugur |
| Supabase | Project di-pause setelah 7 hari DB idle — gugur (menu cafe sepi akan mati sendiri) |
| Netlify + Decap CMS | Netlify Identity deprecated; Decap butuh OAuth proxy eksternal — komponen tambahan yang bisa rusak |
| Cloudflare Pages + Worker + R2 | Free tier bagus, auth server-side lebih aman — tapi Worker adalah kode yang harus dipelihara |
| **GitHub Pages + Git sebagai database** | **Dipilih** |

**Hasil akhir:** situs statis di GitHub Pages, data menu adalah file `data/menu.json` di repo, foto adalah file gambar di repo. Admin panel client-side menulis keduanya lewat GitHub Contents API memakai fine-grained PAT. Nol server, nol build step, nol dependency runtime, nol kartu kredit, dan tidak ada layanan yang bisa tidur atau menagih.

**Keputusan yang sudah dikonfirmasi user:**
- Owner mengelola menu sendiri lewat GitHub token di `/admin`.
- Antarmuka **bilingual Indonesia + English** dengan toggle.
- Fitur **Standar**: chip kategori sticky + scroll-spy, kartu berfoto, badge Habis/Signature, skeleton loading, error/empty state, dark mode otomatis. Tanpa search, tanpa detail sheet.

---

## Kenapa arsitektur ini yang paling awet

Ini bukan promotional free tier yang bisa dicabut — ini penggunaan produk inti GitHub (repo publik + Pages) persis sebagaimana dimaksudkan. Fakta yang diverifikasi:

- GitHub Pages Free: repo publik, cap **1 GB** situs, **100 GB/bulan** bandwidth, **10 build/jam**. Semuanya *soft limit* (GitHub mengirim email, tidak menagih). Menu cafe dengan ~50 foto terkompresi tidak akan mendekatinya.
- Contents API authenticated: **5.000 request/jam**. Owner memakai belasan per sesi edit.
- Fine-grained PAT bisa di-scope ke **satu repo** dengan permission **Contents: Read and write** saja, dan untuk repo personal (non-org) **bisa tanpa expiry** — jadi tidak ada token yang perlu diperbarui berkala. Itu yang membuat klaim "tanpa biaya maintenance" benar-benar terpenuhi.

Dan kalaupun suatu hari GitHub berubah: datanya adalah file biasa di Git. Pindah ke Cloudflare Pages cukup `git push`. Portabilitas itulah asuransinya.

---

## Struktur file

```
cafe/                             repo publik, sekaligus sumber Pages (branch main, root)
├─ index.html                     Halaman menu pelanggan
├─ 404.html
├─ .nojekyll                      Matikan pemrosesan Jekyll
├─ manifest.webmanifest           PWA dasar (installable, theme-color). TANPA service worker.
├─ robots.txt
├─ README.md                      Runbook owner: cara buat token, cara edit, cara backup
├─ assets/
│  ├─ css/styles.css              Design system, dipakai publik + admin
│  ├─ js/
│  │  ├─ menu.js                  Fetch cache-busted + orkestrasi state
│  │  ├─ render.js                Render kartu & seksi (DOM API, bukan innerHTML)
│  │  ├─ i18n.js                  Kamus string statis ID/EN + deteksi & persist bahasa
│  │  └─ util.js                  Format harga, pilih bahasa dgn fallback, helper URL
│  └─ img/placeholder.webp
├─ admin/
│  ├─ index.html                  Shell admin + <meta CSP> ketat
│  ├─ admin.js                    Auth, orkestrasi CRUD, pemulihan partial failure
│  ├─ github-api.js               Wrapper Contents API — ini trust boundary
│  ├─ image.js                    Canvas resize/compress → WebP
│  ├─ qr.js                       Generate QR ke PNG/SVG
│  └─ vendor/qrcode.min.js        Di-vendor & di-pin. TIDAK dari CDN.
├─ data/menu.json                 SUMBER KEBENARAN
└─ images/                        Foto produk hasil upload owner
   └─ .gitkeep
```

Tidak ada `package.json`, `node_modules`, atau lockfile — tidak ada yang perlu di-audit atau di-update.

**Semua path relatif** agar situs berjalan baik di `user.github.io/cafe/` maupun di root.

### Kenapa tanpa build step

Nilai jual utama proyek ini adalah *nol maintenance selama bertahun-tahun*. Vite/npm membawa dependabot noise, transitive dependency rot, dan kepastian bahwa `npm run build` akan patah setelah 2–3 tahun tanpa update. Sementara admin CRUD-nya benar-benar sederhana: satu form, satu list, satu image picker, ~5 panggilan API. Browser adalah runtime-nya, dan browser tidak pernah patah. Trade-off yang diterima: JS admin sedikit lebih verbose, tanpa JSX/TS.

---

## Skema `data/menu.json`

Field teks bilingual memakai objek `{ id, en }`. Jika `en` kosong → fallback ke `id` saat render.

```json
{
  "schemaVersion": 1,
  "cafe": {
    "name": "Kopi Senja",
    "tagline": { "id": "Kopi & camilan, tiap hari", "en": "Coffee & bites, every day" },
    "currency": "IDR",
    "logo": "assets/img/logo.svg",
    "updatedAt": "2026-07-10T04:12:00Z"
  },
  "categories": [
    { "id": "coffee",    "name": { "id": "Kopi",     "en": "Coffee" },     "order": 1 },
    { "id": "noncoffee", "name": { "id": "Non-Kopi", "en": "Non-Coffee" }, "order": 2 },
    { "id": "food",      "name": { "id": "Makanan",  "en": "Food" },       "order": 3 }
  ],
  "items": [
    {
      "id": "itm_ax9f2",
      "categoryId": "coffee",
      "name": { "id": "Es Kopi Susu", "en": "Iced Milk Coffee" },
      "description": { "id": "Espresso, susu segar, gula aren.", "en": "Espresso, fresh milk, palm sugar." },
      "price": 22000,
      "image": "images/itm_ax9f2-k3m9.webp",
      "available": true,
      "featured": true,
      "order": 1
    }
  ]
}
```

Aturan yang divalidasi admin sebelum menulis:
- `price` — integer ≥ 0, rupiah bulat. Render lewat `Intl.NumberFormat(locale, { style:'currency', currency:'IDR', maximumFractionDigits:0 })`.
- `id` item — `itm_` + random pendek, tidak pernah dipakai ulang.
- `name.id` wajib; `name.en` opsional. `categoryId` harus ada di `categories`.
- `image` harus berada di bawah `images/` (cegah path traversal saat menulis).
- `updatedAt` di-bump tiap tulis.

---

## Halaman menu pelanggan (`index.html`)

**Struktur:** satu halaman scroll — header sticky (logo, nama cafe, toggle bahasa ID|EN) → chip kategori horizontal dengan scroll-spy → satu `<section>` per kategori → grid kartu. Tanpa routing, tanpa paginasi.

**Kartu:** foto 4:3 (`object-fit: cover`, lazy), nama, deskripsi satu baris, harga. `featured` → badge "Signature". `available: false` → gambar desaturasi + pill "Habis"/"Sold out", harga tetap tampil.

**Bahasa:** default dari `navigator.language` (diawali `id` → Indonesia, selain itu English), lalu di-persist ke `localStorage.lang`. Toggle mengganti teks tanpa reload dan meng-update atribut `<html lang>`. String statis UI ada di `i18n.js`; teks konten dari `menu.json`.

**Kesegaran data.** Pages menyajikan lewat Fastly dengan `Cache-Control: max-age=600`. Jadi data di-fetch cache-busted:

```js
fetch(`data/menu.json?v=${Date.now()}`, { cache: 'no-store' })
```

Foto tidak pernah stale karena setiap upload memakai **nama file unik** (lihat pipeline gambar) — file lama tidak pernah ditimpa, jadi tidak ada cache lama yang tersaji.

Sengaja **tanpa service worker**: satu-satunya hal yang bisa dilakukan SW di sini adalah menyajikan menu basi.

**State yang harus ada:**
- *Loading* — skeleton shimmer CSS murni, dirender dari shell HTML sehingga first paint instan dan tinggi kartu sudah ter-reserve (CLS ≈ 0).
- *Empty* — `items` kosong → "Menu segera hadir".
- *Error* — fetch gagal / JSON invalid → pesan + tombol "Coba lagi". Tidak pernah layar kosong.
- *Image error* — `onerror` → `placeholder.webp`.

**Keamanan render.** Isi `menu.json` di-render lewat `textContent` / `createElement` — **tidak pernah `innerHTML`**. Repo bersifat publik dan bisa saja divandal; halaman pelanggan tidak boleh jadi vektor XSS.

**Budget performa** (Android menengah, 4G): HTML+CSS+JS terkirim **< 30 KB** gzip, nol request eksternal selain gambar & `menu.json`. Gambar terbesar **< 300 KB**. Target LCP < 2.0s, CLS < 0.05, TBT ≈ 0.
Teknik: `loading="lazy"` + `decoding="async"` untuk gambar di bawah lipatan, `fetchpriority="high"` untuk 1–2 kartu pertama, WebP, `width`/`height`/`aspect-ratio` eksplisit, **system font stack** (nol download font).

**Membangkitkan selera.** Fotografi yang bekerja paling keras — paksa crop 4:3 konsisten, beri panduan di README (permukaan polos, cahaya siang). Palet hangat, whitespace lega, tipografi harga yang tegas, elevasi kartu halus. Strip "Rekomendasi" di atas untuk item `featured`.

Token warna awal (validasi rasio kontras di Phase 2 sebelum dikunci):

| | Light | Dark |
|---|---|---|
| background | `#FBF7F2` | `#17120E` |
| surface | `#FFFFFF` | `#221A15` |
| text | `#2B1D14` | `#F2E9E1` |
| muted | `#6B5648` | `#B6A493` |
| accent | `#B4531F` | `#E08A4F` |

**Aksesibilitas:** teks ≥ 16px, line-height ~1.5, kontras WCAG AA ≥ 4.5:1, tap target ≥ 44×44px (chip kategori, toggle bahasa, tombol retry), HTML semantik (`<main>`, `<section>`, `<h2>` per kategori, `<ul>/<li>`), `alt` = nama item, `:focus-visible`, `prefers-reduced-motion` mematikan shimmer & hover, `prefers-color-scheme` untuk dark mode.

---

## Admin panel (`/admin/`)

### Alur auth

1. Buka `/admin/`. Tanpa token → layar token: penjelasan singkat, link ke halaman pembuatan fine-grained PAT, field password untuk paste, checkbox **"Ingat di perangkat ini"**.
   - Tidak dicentang → `sessionStorage` (hilang saat tab ditutup) — ini **default yang aman**.
   - Dicentang → `localStorage`.
2. Validasi token dengan `GET /repos/{owner}/{repo}`. Berhasil → editor. 401/403 → hapus token, tampilkan error.
3. Tombol **Logout** menghapus kedua storage. Auto-logout setelah idle N menit.

> **Catatan jujur:** GitHub *tidak* mendokumentasikan query-param untuk pre-fill form fine-grained PAT (yang didukung hanya token classic). README karena itu berisi walkthrough 6 langkah + screenshot, bukan janji deep-link yang mengisi otomatis.

### Postur keamanan — token di browser storage

Sesuai konvensi proyek, security di trust boundary **tidak dipangkas** demi minimalisme.

**Blast radius bila token bocor:** token fine-grained, scope **satu repo publik**, permission **Contents R/W saja**. Penyerang paling jauh bisa mem-vandal JSON/gambar dari repo yang isinya memang sudah publik. Tidak bisa menyentuh repo lain, tidak bisa menghapus repo, tidak bisa membaca data privat, tidak bisa bertindak atas nama akun. Pemulihan: revoke token (satu klik) + `git revert`. Radius sekecil inilah alasan token single-repo jadi tumpuan seluruh desain.

**Mitigasi yang dibangun:**
- Storage session-only sebagai default; Logout eksplisit; auto-logout saat idle.
- **Token tidak pernah di-log** — tanpa `console.log`, tanpa analytics, tanpa error reporter yang bisa men-serialize header.
- **Nol script pihak ketiga di halaman admin.** Semuanya di-vendor lokal (inilah alasan `qrcode.min.js` di-commit, bukan diambil dari CDN). Satu script CDN yang disusupi cukup untuk mengeksfiltrasi token.
- Header CSP lewat `<meta http-equiv="Content-Security-Policy">` di `admin/index.html`:
  `default-src 'self'; connect-src 'self' https://api.github.com; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; base-uri 'none'; form-action 'none'`
- `Authorization: Bearer` hanya dikirim ke `api.github.com` via HTTPS.
- README: aktifkan 2FA di akun GitHub; buat token hanya di perangkat tepercaya.
- Pengingat di UI: *"Perangkat ini sekarang menyimpan kunci untuk mengubah menu. Logout di komputer bersama."*

**Ancaman yang diterima:** admin client-side tidak bisa menyembunyikan rahasia dari penyerang yang sudah menguasai perangkat owner — begitu pula aplikasi browser mana pun. Mengingat scope-nya sekecil ini, itu proporsional.

### Wrapper Contents API (`github-api.js`)

Base: `https://api.github.com/repos/{owner}/{repo}/contents/{path}`
Header: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`

| Operasi | Request |
|---|---|
| Baca | `GET .../contents/data/menu.json` → `{ content: <base64>, sha }` |
| Tulis | `PUT` body `{ message, content: <base64>, sha? }` — `sha` **wajib** saat meng-update file yang sudah ada |
| Hapus | `DELETE` body `{ message, sha }` |
| List folder | `GET .../contents/images` → array entri |

Encoding base64 harus UTF-8-safe (`TextEncoder` → `Uint8Array` → binary string → `btoa`), bukan `btoa()` langsung atas string JSON — nama item berbahasa Indonesia/emoji akan merusaknya.

### Alur CRUD

Pola umum tiap penulisan JSON: `GET` menu.json (simpan `sha`) → mutasi objek di memori → `PUT` dengan `sha` tersebut. Setelah sukses, ambil `sha` baru dari response agar edit berikutnya di sesi yang sama tidak 409.

- **Tambah/edit item** — form: kategori, nama (ID + EN), deskripsi (ID + EN), harga, ketersediaan, featured, foto. Field EN opsional dengan hint "kosongkan untuk memakai teks Indonesia".
- **Hapus item** — konfirmasi → keluarkan dari JSON → tulis → best-effort `DELETE` file gambarnya.
- **Urutan / ketersediaan / featured** — tombol naik-turun dan toggle (tanpa library drag-drop).
- **Kategori** — tambah/rename/urutkan/hapus; hapus diblokir bila masih ada item yang mereferensikannya.

### Pipeline gambar (`image.js`)

1. `<input type="file" accept="image/*" capture>` — `capture` membuat HP langsung membuka kamera.
2. `createImageBitmap` → gambar ke `<canvas>` dengan sisi terpanjang **≤ 1200px**.
3. `canvas.toBlob(cb, 'image/webp', 0.8)`. Jika hasil **> 300 KB**, encode ulang di 0.7 lalu 0.6. Jika masih **> 900 KB**, batalkan: "Foto terlalu besar, coba foto lain."
4. `PUT` ke **nama file unik**: `images/{itemId}-{random4}.webp`.

Nama unik per upload memberi tiga hal sekaligus: PUT gambar **selalu create** sehingga tidak pernah butuh `sha` dan tidak pernah kena 409; pelanggan tidak pernah melihat foto lama dari cache CDN; dan foto lama masih ada bila penulisan JSON gagal.

5. Tampilkan preview + ukuran file final sebelum simpan.

Aksi pemeliharaan **"Bersihkan foto tak terpakai"**: list `images/`, diff terhadap path yang direferensikan item, tawarkan hapus.

### Penanganan error

| Kondisi | Perilaku |
|---|---|
| **401 / 403** token invalid atau kedaluwarsa | Hapus token tersimpan, kembali ke layar auth, "Token tidak valid atau kedaluwarsa. Buat token baru." |
| **403** dengan `x-ratelimit-remaining: 0` | Dibedakan dari di atas — tampilkan waktu reset dari `x-ratelimit-reset` |
| **404** | Repo/path/scope token salah → arahkan cek ulang scope token |
| **409** sha basi | Auto-recovery (di bawah) |
| **422** validasi | Tampilkan pesan API; log ke console **tanpa token** |
| Offline / network gagal | Tangkap, **pertahankan isi form**, tawarkan Retry. Ketikan owner tidak boleh hilang. |

**Pemulihan 409.** Setiap edit direpresentasikan sebagai **fungsi mutator** `(menu) => menu`, bukan sebagai snapshot hasil. Saat PUT mengembalikan 409: `GET` ulang `menu.json` yang segar, terapkan ulang mutator ke isi terbaru, PUT sekali lagi. Bila masih konflik → "Menu berubah di tempat lain, dimuat ulang" dan reload state editor. **Tidak pernah menimpa diam-diam.**

**Partial failure — gambar terupload tapi `menu.json` gagal ditulis.** Urutan operasi selalu **gambar dulu, JSON kemudian**. Jika penulisan JSON gagal, gambar yang sudah naik menjadi *orphan* — tidak berbahaya dan murah. Tampilkan "Foto tersimpan tapi menu gagal disimpan, coba simpan lagi", dan **retry hanya langkah JSON** (path gambar sudah stabil, jadi retry idempoten). Urutan ini juga menjamin JSON tidak pernah menunjuk gambar yang belum ada — halaman pelanggan tak akan menampilkan gambar rusak akibat simpan separuh jalan.

### QR code

`admin/qr.js` memakai library yang di-vendor untuk meng-encode URL publik, menghasilkan PNG/SVG yang bisa diunduh dan dicetak. Tanpa layanan QR eksternal (privasi, nol dependency, jalan offline). URL tidak pernah berubah, jadi sekali cetak seumur hidup.

---

## Fase implementasi

Tiap fase bisa diverifikasi sendiri.

**Phase 0 — Repo & Pages.** Buat repo publik, `index.html` "Hello", `.nojekyll`, aktifkan Pages (main, root).
*Verifikasi:* URL publik merender.

**Phase 1 — Data + render publik.** `data/menu.json` contoh (3–4 item, 2 kategori, sudah bilingual) + beberapa gambar contoh. `index.html`, `menu.js`, `render.js`, `util.js` — fetch cache-busted, render kartu.
*Verifikasi:* menu tampil di desktop & HP; matikan network → error state; `items: []` → empty state.

**Phase 2 — Design system, i18n, states.** `styles.css` (grid responsif, palet hangat, dark mode, skeleton), `i18n.js` + toggle bahasa dengan persist, chip kategori + scroll-spy, badge Habis/Signature, semua state, pass aksesibilitas & performa.
*Verifikasi:* Lighthouse mobile ≥ 95 performance & ≥ 95 accessibility; CLS < 0.05; toggle bahasa mengganti string statis **dan** konten, fallback EN→ID bekerja; kontras semua token lolos AA.

**Phase 3 — Wrapper GitHub API.** `github-api.js`: `getFile`, `putFile`, `deleteFile`, `listDir`; base64 UTF-8-safe; penanganan seluruh status code.
*Verifikasi:* dari halaman scratch, baca `menu.json`, tulis perubahan sepele, commit muncul di history repo.

**Phase 4 — Auth admin.** Layar token, validasi, session/local storage, logout, idle timeout, meta CSP.
*Verifikasi:* token benar → editor; token salah → ditolak & storage bersih; logout menghapus keduanya; DevTools menunjukkan **hanya** request ke `api.github.com` dan same-origin.

**Phase 5 — CRUD teks (tanpa foto).** List/create/edit/delete/reorder item & kategori dengan form bilingual; refresh `sha` tiap tulis; auto-recovery 409 lewat mutator.
*Verifikasi:* CRUD penuh muncul di halaman publik dalam ~1 menit; paksa 409 (edit dari dua tab) → pulih tanpa kehilangan data.

**Phase 6 — Pipeline gambar.** `image.js` kompresi + upload, nama file unik, preview, guardrail ukuran, urutan gambar-dulu-JSON-kemudian, penanganan partial failure, aksi bersihkan orphan.
*Verifikasi:* upload foto HP 5 MB → file tersimpan < 300 KB; simulasikan kegagalan tulis JSON setelah gambar naik → pesan orphan-safe muncul dan retry berhasil.

**Phase 7 — QR, PWA, dokumentasi.** Vendor QR generator, unduh QR, `manifest.webmanifest`, `robots.txt`, `404.html`, README runbook owner (walkthrough PAT + screenshot, panduan foto, catatan backup/restore).
*Verifikasi:* cetak QR, scan dengan HP → mendarat di menu live.

**Phase 8 — Hardening & polish.** Audit ulang kontras & a11y, review copy Indonesia + English, hapus sisa `console.log`, konfirmasi nol request eksternal dari `/admin/`.

---

## Rencana verifikasi end-to-end

- **Perjalanan pelanggan:** cetak QR → scan pakai HP sungguhan di jaringan seluler → menu muncul < 2 detik, foto tajam, chip kategori bekerja, item habis terlihat jelas, matikan sinyal saat scroll → error + retry berfungsi. Ulangi dengan bahasa perangkat English → UI otomatis English.
- **Perjalanan owner:** buat token via README → login → tambah item + foto → dalam ~1 menit halaman pelanggan (hard reload) menampilkannya → ubah harga → toggle Habis → hapus item → semua terefleksi.
- **Uji kesegaran:** edit menu, langsung reload halaman pelanggan → data segar, bukan basi 10 menit.
- **Injeksi kegagalan:** revoke token di tengah sesi (harap 401 tertangani); paksa 403 rate-limit; edit dari dua browser untuk memicu 409; offline saat simpan (isi form bertahan); upload gambar raksasa/aneh (guardrail menyala).
- **Uji budget:** Lighthouse mobile; total byte untuk menu 15 item; tren ukuran repo setelah ~50 foto masih jauh di bawah 1 GB.
- **Uji XSS:** sisipkan `<img src=x onerror=alert(1)>` ke `name.id` di `menu.json` → harus tampil sebagai teks literal, bukan tereksekusi.

---

## Risiko & mitigasi

1. **GitHub mengubah/membatasi Pages atau Contents API.** Kita memakai fitur inti repo publik, bukan promo tier. Data adalah file biasa di Git → pindah ke Cloudflare Pages cukup `git push`. Portabilitas ini adalah asuransinya.
2. **Token bocor / perangkat disusupi.** Blast radius kecil dan tetap (lihat postur keamanan); default session-only; revoke satu klik; vandalisme bisa `git revert`.
3. **Owner bingung karena CDN stale.** Data di-fetch cache-busted; foto selalu bernama unik sehingga tidak pernah stale. README menjelaskan jeda rebuild ~1 menit.
4. **Owner kesulitan membuat PAT.** Walkthrough bergambar di README; opsi Anda yang memegang token; opsi migrasi ke Decap CMS + OAuth proxy nanti tanpa mengubah situs publik (datanya repo yang sama).
5. **Repo membengkak karena riwayat gambar.** Kompresi agresif (<300 KB), pembersihan orphan berkala. Ratusan foto pun jauh di bawah cap 1 GB.
6. **`/admin/` terlihat publik.** Dilindungi token, bukan obscurity. Tanpa token halaman itu tidak melakukan apa pun, dan repo memang publik.
7. **Akun GitHub jadi single point of auth.** Aktifkan 2FA (README); token di-scope sehingga tidak bisa eskalasi.

---

## File kritis

| File | Peran |
|---|---|
| `data/menu.json` | Sumber kebenaran; semua membaca/menulis ini |
| `admin/github-api.js` | Wrapper Contents API — trust boundary; base64, sha, 401/403/404/409/422/rate-limit |
| `admin/admin.js` | Auth, orkestrasi CRUD, mutator untuk pemulihan 409, partial-failure |
| `admin/image.js` | Kompresi Canvas → WebP, guardrail ukuran, urutan upload |
| `assets/js/menu.js` | Render publik, fetch cache-busted, seluruh state UI |
| `assets/js/i18n.js` | Kamus string ID/EN, deteksi & persist bahasa, fallback EN→ID |
