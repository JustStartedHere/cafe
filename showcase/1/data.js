// Data tema 1 — hardcoded. Tema showcase TIDAK menyentuh data/menu.json.
// Semua field teks berbentuk { id, en }, sama seperti situs pelanggan, supaya
// pickLang() dari assets/js/util.js bisa dipakai apa adanya.

/** String statis UI. Kunci dipakai lewat atribut `data-t` di index.html. */
export const STRINGS = {
  skip: { id: 'Langsung ke menu', en: 'Skip to the menu' },

  // topbar
  freeDelivery: { id: 'Gratis antar untuk pesanan di atas Rp 100.000', en: 'Free delivery on orders above Rp 100,000' },
  langGroup: { id: 'Pilih bahasa', en: 'Select language' },
  langId: { id: 'Bahasa Indonesia', en: 'Indonesian' },
  langEn: { id: 'Bahasa Inggris', en: 'English' },

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

  // kategori
  catsTitle: { id: 'Kategori Menu Kami', en: 'Our Menu Categories' },

  // menu
  menuTitle: { id: 'Rekomendasi Chef', en: "Chef's Recommendations" },
  filterAll: { id: 'Semua', en: 'All Items' },
  badgeBest: { id: 'Terlaris', en: 'Bestseller' },
  badgeNew: { id: 'Baru', en: 'New' },
  emptyFilter: { id: 'Belum ada hidangan di kategori ini.', en: 'No dishes in this category yet.' },
  countLabel: { id: 'hidangan ditampilkan', en: 'dishes shown' },

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
  feat4: { id: 'Antar Cepat', en: 'Fast Delivery' },
  feat4sub: { id: 'Tepat waktu, setiap saat', en: 'On time, every time' },

  // footer
  footHours: { id: 'Jam Buka', en: 'Opening Hours' },
  footHoursValue: { id: 'Setiap hari, 10.00 – 22.00', en: 'Every day, 10:00 – 22:00' },
  footContact: { id: 'Kontak', en: 'Contact' },
  footReserve: { id: 'Reservasi lewat WhatsApp', en: 'Reserve via WhatsApp' },
  footNote: { id: 'Contoh desain — bukan restoran sungguhan.', en: 'Design sample — not a real restaurant.' },
  backToGallery: { id: '← Kembali ke galeri desain', en: '← Back to the design gallery' },
};

/** Pesan WhatsApp untuk tombol reservasi. */
export const RESERVE_MESSAGE = {
  id: 'Halo, saya ingin memesan meja di Your Restaurant.',
  en: 'Hello, I would like to book a table at Your Restaurant.',
};

/** Slide hero. `accent` adalah bagian judul yang diberi warna emas. */
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

export const CATEGORIES = [
  { id: 'starters', name: { id: 'Pembuka', en: 'Starters' }, image: 'img/bruschetta.webp' },
  { id: 'mains', name: { id: 'Hidangan Utama', en: 'Main Course' }, image: 'img/grilled-salmon.webp' },
  { id: 'pizza', name: { id: 'Pizza', en: 'Pizza' }, image: 'img/margherita-pizza.webp' },
  { id: 'desserts', name: { id: 'Pencuci Mulut', en: 'Desserts' }, image: 'img/berry-cheesecake.webp' },
  { id: 'drinks', name: { id: 'Minuman', en: 'Beverages' }, image: 'img/watermelon-cooler.webp' },
  { id: 'specials', name: { id: 'Spesial Chef', en: 'Chef Specials' }, image: 'img/ribeye-steak.webp' },
];

/** `badge`: 'best' | 'new' | null. Harga rupiah, bilangan bulat. */
export const ITEMS = [
  {
    id: 'bruschetta', categoryId: 'starters', image: 'img/bruschetta.webp', price: 55000, badge: null,
    name: { id: 'Bruschetta Tomat', en: 'Tomato Bruschetta' },
    description: { id: 'Roti panggang, tomat segar, balsamic', en: 'Toasted bread, fresh tomato, balsamic' },
  },
  {
    id: 'caesar-salad', categoryId: 'starters', image: 'img/caesar-salad.webp', price: 78000, badge: null,
    name: { id: 'Salad Caesar Udang', en: 'Prawn Caesar Salad' },
    description: { id: 'Romaine, udang panggang, parmesan', en: 'Romaine, grilled prawns, parmesan' },
  },
  {
    id: 'grilled-salmon', categoryId: 'mains', image: 'img/grilled-salmon.webp', price: 145000, badge: 'best',
    name: { id: 'Salmon Panggang', en: 'Grilled Salmon' },
    description: { id: 'Disajikan dengan saus mentega lemon', en: 'Served with lemon butter sauce' },
  },
  {
    id: 'prawn-pasta', categoryId: 'mains', image: 'img/prawn-pasta.webp', price: 128000, badge: 'new',
    name: { id: 'Pasta Seafood Krim', en: 'Creamy Seafood Pasta' },
    description: { id: 'Linguine, udang, cumi, saus krim bawang', en: 'Linguine, prawns, squid, garlic cream' },
  },
  {
    id: 'seafood-risotto', categoryId: 'mains', image: 'img/seafood-risotto.webp', price: 135000, badge: null,
    name: { id: 'Risoto Seafood', en: 'Seafood Risotto' },
    description: { id: 'Beras arborio, kaldu udang, sedikit pedas', en: 'Arborio rice, prawn stock, mild chilli' },
  },
  {
    id: 'margherita-pizza', categoryId: 'pizza', image: 'img/margherita-pizza.webp', price: 98000, badge: null,
    name: { id: 'Pizza Margherita', en: 'Margherita Pizza' },
    description: { id: 'Basil segar & mozzarella, tungku kayu', en: 'Fresh basil & mozzarella, wood-fired' },
  },
  {
    id: 'creme-brulee', categoryId: 'desserts', image: 'img/creme-brulee.webp', price: 62000, badge: null,
    name: { id: 'Crème Brûlée', en: 'Crème Brûlée' },
    description: { id: 'Vanila, gula karamel, raspberry', en: 'Vanilla, caramelised sugar, raspberry' },
  },
  {
    id: 'berry-cheesecake', categoryId: 'desserts', image: 'img/berry-cheesecake.webp', price: 68000, badge: null,
    name: { id: 'Cheesecake Beri', en: 'Berry Cheesecake' },
    description: { id: 'Lembut, dengan saus beri asam manis', en: 'Silky, with a sweet-tart berry coulis' },
  },
  {
    id: 'chocolate-cake', categoryId: 'desserts', image: 'img/chocolate-cake.webp', price: 58000, badge: null,
    name: { id: 'Kue Cokelat', en: 'Chocolate Cake' },
    description: { id: 'Tiga lapis, cokelat 70%', en: 'Three layers, 70% dark chocolate' },
  },
  {
    id: 'watermelon-cooler', categoryId: 'drinks', image: 'img/watermelon-cooler.webp', price: 45000, badge: 'new',
    name: { id: 'Semangka Basil', en: 'Watermelon Basil Cooler' },
    description: { id: 'Semangka segar, basil, tanpa alkohol', en: 'Fresh watermelon, basil, alcohol free' },
  },
  {
    id: 'cold-brew', categoryId: 'drinks', image: 'img/cold-brew.webp', price: 38000, badge: null,
    name: { id: 'Cold Brew', en: 'Cold Brew' },
    description: { id: 'Diseduh dingin 18 jam', en: 'Steeped cold for 18 hours' },
  },
  {
    id: 'ribeye-steak', categoryId: 'specials', image: 'img/ribeye-steak.webp', price: 285000, badge: 'best',
    name: { id: 'Steik Ribeye', en: 'Ribeye Steak' },
    description: { id: 'Dipanggang sesuai tingkat kematangan Anda', en: 'Grilled to your preferred doneness' },
  },
  {
    id: 'chef-plate', categoryId: 'specials', image: 'img/chef-plate.webp', price: 175000, badge: null,
    name: { id: 'Sajian Chef', en: "Chef's Tasting Plate" },
    description: { id: 'Berubah tiap minggu, tanya pelayan kami', en: 'Changes weekly, ask our server' },
  },
];
