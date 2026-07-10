# Menu Cafe — Panduan Pemilik

Website menu untuk pelanggan yang scan QR di meja. Tidak ada pemesanan — murni etalase.

| | |
|---|---|
| Halaman pelanggan | <https://juststartedhere.github.io/cafe/menu/> |
| Halaman pengelola | <https://juststartedhere.github.io/cafe/admin/> |
| Tempat data disimpan | `data/menu.json` di repositori ini |

Tidak ada server, tidak ada tagihan bulanan, tidak ada yang perlu diperbarui. Menu Anda adalah sebuah file
di GitHub, dan halaman admin menulis langsung ke file itu.

---

## 1. Membuat token (sekali seumur hidup)

Halaman admin perlu izin untuk mengubah repositori ini. Izin itu berupa **fine-grained personal access token** —
sebuah kata sandi panjang yang hanya berlaku untuk satu repositori dan hanya untuk mengubah isinya.

> Buat token dari akun **pemilik repositori ini**. Token milik akun lain tidak akan bisa mengaksesnya, meskipun
> akun itu punya izin menulis sebagai kolaborator. Ini batasan GitHub, bukan pilihan kami.

**Langkah:**

1. Buka <https://github.com/settings/personal-access-tokens/new>
   (jalur manualnya: foto profil → **Settings** → **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → **Generate new token**).
2. **Token name** — isi bebas, misalnya `Menu Cafe`. Maksimal 40 karakter.
3. **Resource owner** — pilih akun pemilik repositori ini.
4. **Expiration** — pilih **No expiration**. Repositori ini milik akun personal, jadi token tanpa masa berlaku
   diizinkan. Inilah yang membuat Anda tidak perlu membuat token baru setiap tahun.
5. **Repository access** — pilih **Only select repositories**, lalu pilih **satu** repositori: `cafe`.
6. **Permissions** → **Repository permissions** → cari **Contents** → ubah menjadi **Read and write**.
   Jangan menyalakan izin lain. (**Metadata: Read-only** akan menyala sendiri — itu wajib dan tidak apa-apa.)
7. Klik **Generate token**, lalu **salin token yang muncul**.

**Token hanya ditampilkan satu kali.** Kalau hilang, hapus yang lama dan buat baru — tidak ada ruginya.

### Seberapa berbahaya kalau token bocor?

Kecil, dan itu disengaja. Token ini hanya bisa mengubah isi **satu repositori publik** yang isinya memang sudah
bisa dilihat siapa saja. Ia tidak bisa menyentuh repositori lain, tidak bisa menghapus repositori, tidak bisa
membaca data pribadi, dan tidak bisa bertindak atas nama akun Anda.

Kalau Anda curiga token bocor: buka <https://github.com/settings/tokens?type=beta>, klik token itu, **Delete**.
Selesai. Kalau ada yang sempat merusak menu, seluruh riwayat perubahan tersimpan di Git dan bisa dikembalikan.

Saran: nyalakan **two-factor authentication** di akun GitHub Anda, dan buat token hanya dari perangkat pribadi.

---

## 2. Masuk ke halaman admin

1. Buka <https://juststartedhere.github.io/cafe/admin/>
2. Tempelkan token, lalu klik **Masuk**.
3. **"Ingat di perangkat ini"** — biarkan **tidak dicentang** di komputer bersama. Kalau tidak dicentang, token
   hilang begitu tab ditutup. Kalau dicentang, token tersimpan di perangkat itu sampai Anda klik **Keluar**.

Sesi menutup dirinya sendiri setelah 20 menit tanpa aktivitas.

---

## 3. Mengubah menu

| Yang ingin dilakukan | Caranya |
|---|---|
| Tambah item | **Tambah item** → isi form → **Simpan** |
| Ubah harga / nama / deskripsi | **Edit** pada baris item |
| Ganti atau hapus foto | **Edit** → bagian **Foto** |
| Tandai habis | **Habiskan** (klik **Adakan** untuk mengembalikan) |
| Tandai unggulan | **Signature** — item akan berbadge di halaman pelanggan |
| Ubah urutan | Tombol **↑** dan **↓** |
| Hapus item | **Hapus** pada baris item |
| Tambah / hapus kategori | Bagian **Kategori** di bawah |
| Cetak QR meja | Bagian **QR untuk meja** |

Beberapa hal yang perlu diketahui:

- **Nama Indonesia wajib. Nama English boleh dikosongkan** — kalau kosong, halaman pelanggan memakai teks
  Indonesia untuk kedua bahasa. Sama untuk deskripsi.
- **Harga ditulis sebagai angka bulat**, tanpa titik atau "Rp". Ketik `22000`, bukan `22.000`.
- **Kategori yang masih dipakai item tidak bisa dihapus.** Pindahkan atau hapus item-nya dulu.
- **Perubahan muncul di halaman pelanggan sekitar satu menit setelah disimpan** — GitHub perlu waktu membangun
  ulang situs. Kalau belum berubah, tunggu sebentar lalu muat ulang halaman.

### Kalau dua orang mengubah menu bersamaan

Tidak ada yang hilang. Halaman admin mendeteksinya, mengambil versi terbaru, menerapkan ulang perubahan Anda
di atasnya, lalu menyimpan. Anda akan melihat catatan *"menu sempat berubah di tempat lain, perubahan Anda
digabungkan"*. Kalau bentrokannya terjadi dua kali beruntun, halaman akan memuat ulang isi terbaru dan meminta
Anda mengulang — sengaja, agar tidak ada perubahan yang tertimpa diam-diam.

### Kalau koneksi putus saat menyimpan

Isian form Anda **tidak akan hilang**. Perbaiki koneksi lalu klik **Simpan** lagi.

---

## 4. Kalau ada yang salah

| Pesan | Artinya |
|---|---|
| *Token tidak valid atau kedaluwarsa* | Token salah ketik, atau sudah dihapus. Buat token baru. |
| *Token ditolak. Pastikan izinnya Contents: Read and write* | Token benar, tapi izinnya kurang. Ulangi langkah 6 di atas. |
| *Repositori … tidak terjangkau token ini* | Saat membuat token, repositori `cafe` tidak terpilih di **Only select repositories**. |
| *Kuota GitHub habis* | Terlalu banyak permintaan. Tunggu sampai jam yang disebutkan. Praktis mustahil terjadi. |
| *Gagal menghubungi GitHub* | Koneksi internet putus. Isian Anda aman; coba lagi. |
| *File data/menu.json tidak ditemukan* | File menu terhapus. Klik **Muat ulang**; kalau tetap gagal, lihat "Mengembalikan menu" di bawah. |

### Mengembalikan menu yang rusak

Setiap perubahan tersimpan sebagai satu commit di Git. Untuk melihat riwayatnya, buka
<https://github.com/JustStartedHere/cafe/commits/main/data/menu.json>.
Klik commit mana pun untuk melihat isinya saat itu, lalu salin balik lewat tombol **Edit** di GitHub.
Tidak ada yang benar-benar hilang.

### Mencadangkan menu

Buka <https://github.com/JustStartedHere/cafe/blob/main/data/menu.json> dan simpan file-nya. Itu saja —
seluruh menu Anda ada di satu file itu.

---

## 5. Foto item

Buka **Edit** pada item (atau **Tambah item**), lalu pilih **Foto**. Dari HP, tombol itu langsung membuka kamera.

Foto Anda diperkecil dan dikompresi **di dalam peramban** sebelum dikirim — foto 10 MB dari kamera HP biasanya
menjadi sekitar 100–200 KB. Anda akan melihat pratinjau dan ukuran akhirnya sebelum menyimpan.

**Foto yang bekerja paling keras:**

- Ambil di dekat jendela pada siang hari. Matikan lampu blitz.
- Latar polos: meja kayu, kertas nasi, nampan. Hindari latar ramai.
- Ambil dari atas (flat-lay) atau 45°. Konsisten untuk semua item — kartu menu akan terlihat rapi.
- Isi bingkai dengan makanannya. Kartu memotong foto menjadi 4:3.

**Yang perlu diketahui:**

- Mengganti foto **tidak menghapus foto lama.** Itu disengaja: kalau penyimpanan gagal di tengah jalan, foto lama
  masih utuh dan menu Anda tidak pernah menunjuk gambar yang hilang. Foto lama menjadi "tak terpakai".
- Bersihkan foto tak terpakai lewat tombol di bagian **Pemeliharaan** kapan pun Anda mau. Tidak mendesak.
- Kalau koneksi putus setelah foto terunggah tapi sebelum menu tersimpan, Anda akan melihat pesan
  *"Foto sudah tersimpan. Klik Simpan lagi"* — dan foto **tidak** akan diunggah dua kali.

---

## 6. QR untuk meja

Di bagian **QR untuk meja**, tersedia dua unduhan:

- **SVG** — pakai ini untuk mencetak. Ia vektor, jadi tetap tajam pada ukuran berapa pun, dari stiker meja
  sampai poster.
- **PNG** — untuk ditempel di chat, dokumen, atau media sosial.

QR-nya dibuat di perangkat Anda, bukan lewat layanan QR online. Tidak ada yang tahu alamat menu Anda kecuali
orang yang memindainya.

> **Jangan cetak QR sebelum repositori dipindahkan ke akun tetap.** Memindahkan repositori mengubah alamat
> situs, dan QR yang sudah dicetak akan mati. Kalau Anda berencana memindahkannya, lakukan itu dulu.

## 7. Memasang menu di layar utama HP

Situs ini adalah PWA sederhana. Buka menu di HP, lalu pilih **"Tambahkan ke layar utama"** dari menu peramban.
Ia akan muncul seperti aplikasi, lengkap dengan ikon.

Sengaja **tidak** ada mode offline. Satu-satunya hal yang bisa dilakukan mode offline di sini adalah menyajikan
menu yang sudah basi — harga lama, item yang sudah habis. Lebih baik gagal jujur daripada berbohong.

---

## Mengganti nama cafe

Nama dan tagline diambil dari `data/menu.json` (`cafe.name`, `cafe.tagline`) — halaman pelanggan memakainya
secara otomatis. Dua tempat yang **tidak** ikut berubah dan harus disunting manual:

- `manifest.webmanifest` — nama yang muncul saat menu dipasang ke layar utama HP.
- `index.html` — `<meta name="description">`.

---

## Untuk yang membaca kodenya

Konteks project, keputusan yang sudah dikunci, dan invarian yang tidak boleh dilanggar ada di
[`CLAUDE.md`](CLAUDE.md). Rencana implementasi lengkap ada di [`PLAN.md`](PLAN.md).

Tidak ada `package.json`, tidak ada build step, tidak ada dependency. Buka `index.html` lewat server statis
apa pun dan situs ini jalan.
