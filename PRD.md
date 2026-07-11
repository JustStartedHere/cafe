# PRD — Website Menu Cafe (Etalase Digital)

> **Tujuan dokumen ini:** menjadi spesifikasi produk yang **lengkap dan language-agnostic**, sehingga
> siapa pun (termasuk agent AI) bisa **menulis ulang project ini dengan bahasa/stack lain** tanpa
> kehilangan scope, konteks, dan keputusan penting. Dokumen ini menjelaskan **APA** dan **KENAPA**.
> Untuk **BAGAIMANA** (teknologi + arsitektur + panduan rewrite), lihat `TECH_STACK.md`.

---

## 1. Ringkasan Produk

Website statis untuk menampilkan **menu sebuah cafe/restoran**. Pelanggan memindai QR di meja lalu
langsung melihat menu di HP mereka. **Tidak ada pemesanan, keranjang, pembayaran, atau akun pelanggan** —
ini murni **etalase (showcase) digital**, pengganti buku menu cetak.

Pemilik usaha mengelola menunya sendiri lewat **panel admin** (tambah/edit item, foto, harga, jam buka,
dll). Perubahan langsung tayang di situs pelanggan.

**Proposisi nilai inti:** situs yang **nol-biaya, nol-server, dan nol-pemeliharaan selama bertahun-tahun**.
Tidak ada langganan bulanan, tidak ada backend yang harus dipatch, tidak ada toolchain yang akan patah.

---

## 2. Masalah & Tujuan

**Masalah:** cafe kecil butuh menu digital yang bisa di-update sendiri, tanpa biaya langganan, tanpa
pengetahuan teknis mendalam, dan tanpa risiko "aplikasinya mati karena vendor menutup layanan / tagihan
tak terbayar".

**Tujuan:**
1. Pelanggan bisa melihat menu lengkap berfoto dalam < 2 detik setelah scan QR, di HP apa pun.
2. Pemilik bisa mengubah menu (item, foto, harga, ketersediaan, jam buka) sendiri, kapan saja, dari HP/laptop.
3. Biaya operasional **Rp 0** dan tidak ada komponen yang butuh pemeliharaan rutin.
4. Dua bahasa (Indonesia + English) untuk pelanggan lokal & asing.
5. Cepat, aksesibel (WCAG AA), dan aman (tak bisa dijadikan vektor serangan meski kode terbuka).

**Metrik keberhasilan:** LCP < 2.0s, CLS < 0.05, ukuran aset < 30 KB gzip (HTML+CSS+JS), foto terbesar
< 300 KB, kontras teks ≥ 4.5:1, semua teks ≥ 16px, tap target ≥ 44×44px.

---

## 3. Pengguna

| Persona | Kebutuhan | Frekuensi |
|---|---|---|
| **Pelanggan** | Lihat menu berfoto, harga, ketersediaan, info kontak/lokasi/jam buka. Ganti bahasa. Tanpa login. | Tiap kunjungan, di HP |
| **Pemilik usaha** (1 orang) | Kelola menu, foto, identitas usaha, sosial, jam buka, cetak QR. Login sekali. | Sesekali, HP/desktop |
| **Klien yang sedang memilih desain** | Membandingkan beberapa gaya tampilan menu sebelum memutuskan. | Sekali di awal (fase showcase) |

---

## 4. Ruang Lingkup

### Termasuk (In scope)
- Halaman menu pelanggan (read-only, bilingual, berfoto).
- Panel admin swakelola (CRUD menu, media, identitas, jam buka, QR).
- Galeri "showcase" berisi beberapa alternatif desain untuk dipilih klien.
- Generasi QR code (menunjuk ke halaman menu pelanggan).

### TIDAK termasuk (Out of scope / Non-Goals)
- **Tanpa pemesanan/checkout/pembayaran/keranjang.**
- **Tanpa akun/registrasi pelanggan.**
- **Tanpa fitur pencarian** di halaman pelanggan, **tanpa halaman detail** per item.
- Tanpa analitik/tracking, tanpa notifikasi, tanpa reservasi (selain tombol WhatsApp).
- Tanpa multi-tenant/multi-cabang dalam satu instance (satu deploy = satu usaha).
- Tanpa panel role/permission bertingkat (pemilik = satu orang).

---

## 5. Fitur — Halaman Pelanggan (publik, read-only)

1. **Header**: logo usaha (opsional), nama usaha, tagline, toggle bahasa (ID/EN).
2. **Navigasi kategori**: chip kategori yang *sticky* dengan **scroll-spy** (chip aktif menyorot kategori
   yang sedang dilihat). Klik chip → scroll ke kategori. Wajib jalan tanpa JS scroll-spy pun (anchor asli).
3. **Kartu item**: foto, nama, deskripsi, harga (format Rupiah). Lazy-load foto di bawah lipatan.
4. **Badge item**:
   - **"Habis"** bila `available:false` (foto juga di-desaturasi; badge tekstual wajib karena warna saja tak cukup a11y).
   - **"Signature"/"Terlaris"** bila `featured:true`.
   - **"Baru"** bila `badge:'new'`.
5. **State**: **skeleton loading** saat memuat data (jangan layar kosong lalu konten tiba-tiba muncul),
   **empty state** (menu kosong), **error state** dengan tombol "Coba lagi".
6. **Dark mode otomatis** mengikuti preferensi OS (`prefers-color-scheme`).
7. **Footer**: deskripsi usaha, alamat, **jam operasional per hari** (rentang hari ber-jam sama digabung,
   mis. "Senin–Kamis 09.00–22.00"), tombol WhatsApp, tautan Instagram/TikTok/Google Maps. Item yang tak
   diisi disembunyikan; footer hilang bila tak ada satu pun.
8. **Bilingual**: setiap field teks berbentuk `{id, en}`; bila `en` kosong → fallback ke `id`. Bahasa
   tersimpan (localStorage) + deteksi bahasa perangkat.

## 6. Fitur — Panel Admin (swakelola pemilik)

Antarmuka **berbahasa Indonesia saja** (pemilik satu orang). Layout **sidebar + bagian terpisah** agar
menu panjang tak jadi satu halaman menurun.

1. **Autentikasi**: pemilik menempel **token akses** (di implementasi saat ini: GitHub fine-grained PAT).
   Token disimpan di `sessionStorage` (default) atau `localStorage` bila centang "Ingat perangkat ini".
   **Token tak pernah di-log/dikirim ke pihak ketiga.** Idle timeout otomatis logout.
2. **Ringkasan**: statistik (jumlah item, kategori, item habis, dll) dengan skeleton saat memuat.
3. **Kelola menu** — satu tabel produk:
   - Cari (nama ID/EN), saring per kategori, urut kolom (nama/kategori/harga/status).
   - Checkbox + **aksi massal**: aktif/nonaktif/hapus banyak sekaligus (satu operasi tulis komposit).
   - Toggle status **Aktif/Nonaktif** per item (model hanya punya `available`, tak ada stok).
   - Reorder (panah naik/turun) hanya saat urutan default.
   - Form tambah/edit item di **modal**: nama {id,en}, deskripsi {id,en}, harga (masking ribuan id-ID,
     disimpan bilangan bulat), kategori, foto, toggle featured, badge "baru".
4. **Kategori**: tambah/edit/hapus; tolak nama duplikat (bukan hanya id duplikat).
5. **Identitas usaha**: nama, logo (upload), tagline {id,en}, deskripsi {id,en}, alamat, **jam operasional
   per hari** (7 baris Sen–Min: buka/tutup + jam, atau "Tutup").
6. **Media sosial**: WhatsApp (digit), Instagram/TikTok/Google Maps (wajib URL `https`).
7. **Kode QR**: generate QR yang menunjuk halaman menu pelanggan, **dengan logo usaha di tengah** (atau
   ikon bell bila belum ada logo). Unduh SVG/PNG. QR harus tetap ter-scan meski ada logo di tengah.
8. **Pemeliharaan**: bersihkan foto yatim (foto yang tak lagi dirujuk item mana pun).

### Invarian penting panel admin (WAJIB dipertahankan di rewrite mana pun)
- **Upload gambar DULU, baru tulis data.** Kalau tulis data gagal, yang tersisa hanya foto yatim yang murah
  — bukan data yang menunjuk foto tak ada.
- **Nama file gambar selalu unik** (`{itemId}-{random}.webp`) → penulisan foto selalu *create*, tak pernah
  menimpa, pelanggan tak pernah lihat foto lama dari cache CDN.
- **Setiap edit = fungsi mutator `(data) => data`, cari berdasarkan `id` (bukan indeks).** Saat konflik
  penulisan (data berubah oleh sesi lain), ambil data terbaru, terapkan ulang mutator, coba lagi. Jangan
  pernah menimpa perubahan orang lain diam-diam.
- **Validasi di trust boundary**: semua input divalidasi sebelum ditulis (harga bilangan bulat, URL https,
  path gambar allowlist, dll).

## 7. Fitur — Galeri Showcase (fase pemilihan desain)

Root situs menampilkan **galeri kartu** berisi beberapa **alternatif gaya tampilan** menu (tema visual
berbeda: fine-dining klasik, poster hijau organik, dessert dwiwarna, dll) + **situs pelanggan yang siap
pakai**. Klien membuka masing-masing untuk membandingkan, lalu memilih satu. Tiap tema punya `data.json`
sendiri dan admin sendiri lewat **mesin admin bersama**. Setelah klien memilih, tema lain boleh dihapus.

> Catatan sejarah: situs pelanggan sempat di `/menu/`, lalu **dipindah ke `/showcase/2/`** agar masuk
> penomoran katalog. Di rewrite, ini murni keputusan URL/penempatan — situs pelanggan dan tema showcase
> pada dasarnya adalah "instance halaman menu" dengan data & tema berbeda.

---

## 8. Model Data

Sumber kebenaran = satu berkas JSON per situs/tema (`data/menu.json` untuk pelanggan; `showcase/N/data.json`
untuk tiap tema). Foto = berkas di folder `images/` (atau `showcase/N/img/`).

```jsonc
{
  "schemaVersion": 1,
  "cafe": {
    "name": "Kopi Senja",
    "tagline":     { "id": "...", "en": "..." },   // opsional
    "description": { "id": "...", "en": "..." },   // opsional (blurb "tentang")
    "address":     { "id": "...", "en": "" },      // en boleh kosong
    "currency": "IDR",
    "logo": "images/logo-xxxx.webp",               // opsional; path allowlist
    "hours": [                                     // opsional; TEPAT 7 entri, index 0 = Senin
      { "closed": false, "open": "09:00", "close": "22:00" },
      { "closed": true }                            // hari tutup
      // ... 7 total (Senin..Minggu)
    ],
    "whatsapp": "6281234567890",                   // digit saja
    "instagram": "https://instagram.com/...",       // wajib https bila diisi
    "tiktok":    "https://tiktok.com/@...",
    "maps":      "https://maps.google.com/...",
    "updatedAt": "2026-07-11T00:00:00.000Z"
  },
  "categories": [
    { "id": "coffee", "name": { "id": "Kopi", "en": "Coffee" }, "order": 1 }
  ],
  "items": [
    {
      "id": "itm_ax9f2",                            // stabil, dikunci saat item dibuat
      "categoryId": "coffee",
      "name":        { "id": "Es Kopi Susu", "en": "Iced Milk Coffee" },
      "description": { "id": "...", "en": "..." },   // opsional
      "price": 22000,                               // bilangan BULAT (Rupiah)
      "image": "images/itm_ax9f2-2h5p.webp",         // path allowlist; "" = placeholder
      "available": true,                            // false → badge "Habis"
      "featured": true,                             // true → badge "Signature/Terlaris"
      "badge": "new",                               // opsional: "new" → badge "Baru"
      "order": 1                                    // urutan DALAM kategori
    }
  ]
}
```

**Aturan model:**
- Semua field teks yang dilihat pelanggan bilingual `{id, en}`; `en` kosong → fallback `id`.
- `price` selalu bilangan bulat non-negatif.
- `order` bersifat **per-kategori**, bukan global.
- `image` divalidasi allowlist (hanya folder gambar yang dikenal; tolak `javascript:`, `//host`, `..`).
- `hours` bila ada wajib tepat 7 entri; entri tak lengkap/tak valid dianggap "Tutup".
- Item dengan `categoryId` tak dikenal tidak ditampilkan (bukan dirender di kategori asal-asalan).

---

## 9. Alur Pengguna

**Pelanggan:** scan QR → buka URL menu → skeleton → data termuat → render menu berfoto → (opsional) ganti
bahasa, klik chip kategori, klik WhatsApp/Maps. Selesai. Tanpa login, tanpa interaksi tulis.

**Pemilik:** buka `/admin` → tempel token → (validasi akses) → dashboard → pilih bagian (Kelola menu /
Identitas / dll) → edit → simpan → sistem meng-commit perubahan ke penyimpanan → situs pelanggan
memuat data terbaru pada kunjungan berikutnya (cache-busted).

**Simpan item dengan foto (alur kritis):** pilih foto → kompres ke WebP di sisi klien → **upload foto
(create, nama unik)** → **tulis data JSON** yang menunjuk foto itu → bila tulis JSON gagal, foto jadi
yatim (aman), coba ulang hanya langkah JSON.

---

## 10. Persyaratan Non-Fungsional

**Performa:** LCP < 2.0s, CLS < 0.05 (tinggi elemen yang diisi setelah fetch harus di-reserve di shell HTML
agar tak menggeser layout), TBT rendah, HTML+CSS+JS < 30 KB gzip, foto terbesar < 300 KB.

**Aksesibilitas (WCAG AA):** teks ≥ 16px (pelanggan) / ≥ 15px (admin), kontras ≥ 4.5:1, tap target ≥ 44px,
fokus keyboard terlihat, `prefers-reduced-motion` dihormati, hierarki heading benar, alt text, `lang` benar.
Isyarat status tak boleh warna saja (mis. "Habis" ada badge tekstual, bukan hanya foto pudar).

**Keamanan (asumsi: sumber data bisa dilihat/diubah publik):**
- Halaman pelanggan me-render data lewat pembuatan node teks (`textContent`/createElement), **tidak pernah
  menyisipkan HTML mentah** → kebal XSS meski data divandal.
- Path gambar divalidasi allowlist di sisi render (jangan bergantung pada `onerror`).
- Panel admin: **nol script pihak ketiga dari CDN** (library QR di-vendor & di-commit). CSP ketat.
- Token akses tak pernah di-log/diserialisasi ke reporter error/analitik.
- Encoding aman UTF-8 saat menulis (nama berbahasa Indonesia/emoji tak boleh rusak).

**Internasionalisasi:** ID + EN, toggle runtime tanpa reload, fallback `en→id`.

**Keandalan/idempotensi:** pola mutator + retry saat konflik penulisan; penulisan foto idempoten (create,
nama unik). Data di-fetch cache-busted agar perubahan owner langsung terlihat.

---

## 11. Keputusan Terkunci & Batasan (konteks penting untuk rewrite)

Keputusan berikut membentuk karakter produk. Di rewrite, boleh diganti **secara sadar**, tapi pahami
alasannya dulu:

1. **Penyimpanan = berkas (Git) sebagai database, hosting statis gratis.** Dipilih demi nol-biaya &
   nol-pemeliharaan. (Alternatif Firebase/Supabase/Netlify-CMS ditolak karena butuh billing / auto-pause /
   komponen yang harus dipelihara.) → *Di rewrite dengan backend nyata, ini bisa jadi DB + object storage.*
2. **Owner mengelola menu sendiri** via token, tanpa panel server terpisah.
3. **Bilingual ID+EN** dengan field `{id,en}`.
4. **Fitur pelanggan "Standar"**: chip kategori + scroll-spy, kartu foto, badge, skeleton, error/empty,
   dark mode. **Tanpa search, tanpa detail sheet.**
5. **Tanpa build step / tanpa toolchain** (nilai jualnya: tak ada `npm run build` yang akan patah dalam
   2–3 tahun). → *Di rewrite, kalau pakai framework, sadari trade-off pemeliharaan jangka panjang ini.*
6. **Tanpa service worker** (satu-satunya efeknya di sini hanya menyajikan menu basi).

---

## 12. Ringkasan untuk yang akan me-rewrite

Yang **wajib dipertahankan** (esensi produk): model data bilingual `{id,en}` + item/kategori/jam, alur
"upload gambar dulu baru data", pola mutator anti-timpa, render anti-XSS, validasi di trust boundary,
budget performa & a11y, dan pemisahan **halaman pelanggan read-only** vs **panel admin swakelola**.

Yang **bebas diganti** (detail implementasi): bahasa/framework, mekanisme penyimpanan (Git → DB), mekanisme
auth (PAT → session/OAuth), pipeline gambar (client Canvas → server), dan strategi hosting/deploy.

Lihat `TECH_STACK.md` untuk pemetaan detail tiap komponen ke stack konvensional.
