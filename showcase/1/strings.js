// Tema 1 — string UI tetap (chrome) + slide hero. BUKAN konten menu.
// Konten menu (nama/harga/deskripsi item, brand, sosial) datang dari data.json,
// diedit owner lewat /admin. Yang di sini tidak diedit owner: label tombol, judul
// seksi, teks About, dan foto hero dekoratif milik tema.
//
// Semua field teks berbentuk { id, en } agar pickLang() dipakai apa adanya.

export const STRINGS = {
  skip: { id: 'Langsung ke menu', en: 'Skip to the menu' },

  // topbar
  langGroup: { id: 'Pilih bahasa', en: 'Select language' },
  langId: { id: 'Bahasa Indonesia', en: 'Indonesian' },
  langEn: { id: 'Bahasa Inggris', en: 'English' },
  social: { id: 'Media sosial', en: 'Social media' },
  socialInstagram: { id: 'Instagram kami', en: 'Our Instagram' },
  socialMaps: { id: 'Lokasi di Google Maps', en: 'Location on Google Maps' },
  socialTiktok: { id: 'TikTok kami', en: 'Our TikTok' },

  // nav
  navHome: { id: 'Beranda', en: 'Home' },
  navMenu: { id: 'Menu', en: 'Menu' },
  navAbout: { id: 'Tentang', en: 'About' },
  navReserve: { id: 'Reservasi', en: 'Reservation' },
  tagline: { id: 'Fine Dining', en: 'Fine Dining' },

  // hero
  heroBook: { id: 'Pesan Meja', en: 'Book a Table' },
  heroExplore: { id: 'Lihat Menu', en: 'Explore Menu' },
  heroSlides: { id: 'Pilih slide', en: 'Choose slide' },
  heroSlide: { id: 'Slide', en: 'Slide' },
  heroPrev: { id: 'Slide sebelumnya', en: 'Previous slide' },
  heroNext: { id: 'Slide berikutnya', en: 'Next slide' },

  // kategori
  catsTitle: { id: 'Kategori Menu Kami', en: 'Our Menu Categories' },

  // menu
  menuTitle: { id: 'Menu', en: 'Menu' },
  filterAll: { id: 'Semua', en: 'All Items' },
  badgeBest: { id: 'Terlaris', en: 'Bestseller' },
  badgeNew: { id: 'Baru', en: 'New' },
  badgeSold: { id: 'Habis', en: 'Sold out' },
  emptyFilter: { id: 'Belum ada hidangan di kategori ini.', en: 'No dishes in this category yet.' },
  countLabel: { id: 'hidangan ditampilkan', en: 'dishes shown' },
  loading: { id: 'Memuat menu…', en: 'Loading the menu…' },
  errorTitle: { id: 'Menu gagal dimuat', en: "Couldn't load the menu" },
  retry: { id: 'Coba lagi', en: 'Try again' },

  // about
  aboutEyebrow: { id: 'Tentang Kami', en: 'About Us' },
  aboutTitle: { id: 'Masakan yang Dibuat dengan Sepenuh Hati', en: 'Food Made With Whole Heart' },
  aboutText1: {
    id: 'Kami memasak dengan bahan yang dipilih setiap pagi dari pasar dan petani lokal. Tidak ada yang disimpan semalam.',
    en: 'We cook with ingredients picked each morning from the market and local farmers. Nothing is kept overnight.',
  },
  aboutText2: {
    id: 'Dapur kami terbuka — Anda bisa melihat sendiri setiap hidangan disiapkan.',
    en: 'Our kitchen is open — you can watch every dish being prepared.',
  },
  aboutAlt: { id: 'Ruang makan restoran', en: 'Restaurant dining room' },

  // features
  feat1: { id: 'Bahan Segar', en: 'Fresh Ingredients' },
  feat1sub: { id: 'Dari kebun ke meja', en: 'Farm to table' },
  feat2: { id: 'Chef Berpengalaman', en: 'Expert Chefs' },
  feat2sub: { id: 'Penuh dedikasi', en: 'Passionate & experienced' },
  feat3: { id: 'Suasana Hangat', en: 'Cozy Ambience' },
  feat3sub: { id: 'Nyaman untuk semua', en: 'Perfect for everyone' },

  // footer
  footHours: { id: 'Jam Buka', en: 'Opening Hours' },
  footHoursValue: { id: 'Setiap hari, 10.00 – 22.00', en: 'Every day, 10:00 – 22:00' },
  footContact: { id: 'Kontak', en: 'Contact' },
  footReserve: { id: 'Reservasi lewat WhatsApp', en: 'Reserve via WhatsApp' },
  footNote: { id: 'Contoh desain — bukan restoran sungguhan.', en: 'Design sample — not a real restaurant.' },
  backToGallery: { id: '← Kembali ke galeri desain', en: '← Back to the design gallery' },
};

/** Prefiks pesan reservasi WhatsApp; nama restoran ditambahkan runtime dari data.json. */
export const RESERVE_PREFIX = {
  id: 'Halo, saya ingin memesan meja di ',
  en: 'Hello, I would like to book a table at ',
};

/** Kontak topbar dekoratif (chrome tema). Nomor wa.me sebenarnya diambil dari data.json. */
export const CONTACT = {
  phoneDisplay: '+62 812-3456-7890',
  email: 'halo@yourrestaurant.id',
};

/** Slide hero. `accent` = bagian judul berwarna emas. Foto milik tema (showcase/1/img). */
export const HERO = [
  {
    image: 'img/hero-1.webp',
    eyebrow: { id: 'Rasakan Fine Dining', en: 'Experience Fine Dining' },
    title: { id: 'Hidangan Lezat,', en: 'Delicious Food,' },
    titleRest: { id: 'Momen Tak', en: 'Unforgettable' },
    accent: { id: 'Terlupakan', en: 'Moments' },
    text: {
      id: 'Perpaduan rasa, seni, dan suasana. Dibuat untuk memanjakan indra Anda.',
      en: 'A perfect blend of taste, art, and ambiance. Crafted to delight your senses.',
    },
    alt: { id: 'Salmon panggang di atas piring putih', en: 'Grilled salmon on a white plate' },
  },
  {
    image: 'img/hero-2.webp',
    eyebrow: { id: 'Dimasak Hari Ini', en: 'Cooked Today' },
    title: { id: 'Bahan Segar,', en: 'Fresh Ingredients,' },
    titleRest: { id: 'Rasa yang', en: 'Flavours You' },
    accent: { id: 'Diingat', en: 'Remember' },
    text: {
      id: 'Seafood dipilih tiap pagi, diolah saat Anda memesannya — tidak pernah menunggu di lemari.',
      en: 'Seafood picked each morning, cooked when you order — never left waiting in a fridge.',
    },
    alt: { id: 'Risoto seafood dengan udang', en: 'Seafood risotto with prawns' },
  },
  {
    image: 'img/hero-3.webp',
    eyebrow: { id: 'Dari Tungku Kayu', en: 'From the Wood Oven' },
    title: { id: 'Sederhana,', en: 'Simple,' },
    titleRest: { id: 'Dikerjakan', en: 'Done' },
    accent: { id: 'Sempurna', en: 'Right' },
    text: {
      id: 'Tepung, tomat, mozzarella, basil. Empat bahan, delapan puluh detik, satu tungku kayu.',
      en: 'Flour, tomato, mozzarella, basil. Four ingredients, eighty seconds, one wood-fired oven.',
    },
    alt: { id: 'Pizza margherita dari tungku kayu', en: 'Wood-fired margherita pizza' },
  },
];
