// UI editor menu. Semua teks masuk lewat `textContent`; tidak ada `innerHTML`.
//
// Aturan penting soal form: saat penyimpanan gagal karena jaringan, isi form TIDAK
// dikosongkan. Ketikan owner tidak boleh hilang gara-gara sinyal putus.

import { mutators, InvalidMenuError, newItemId } from './menu-model.js';
import { StaleMenuError } from './menu-store.js';
import { AuthError, RateLimitError, NetworkError, ValidationError, NotFoundError } from './github-api.js';
import { compressImage, imagePath, formatBytes, findOrphans, ImageError } from './image.js';

const el = (id) => document.getElementById(id);
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function button(label, { action, id, className = 'btn-icon', title }) {
  const b = node('button', className, label);
  b.type = 'button';
  b.dataset.action = action;
  if (id) b.dataset.id = id;
  if (title) {
    b.title = title;
    b.setAttribute('aria-label', title);
  }
  return b;
}

const clear = (n) => {
  while (n.firstChild) n.removeChild(n.firstChild);
};

export function createEditor({ store, client, onAuthError }) {
  const statusBox = el('status');
  const errorBox = el('editor-error');
  const itemList = el('item-list');
  const categoryList = el('category-list');
  const itemForm = el('item-form');
  const categoryForm = el('category-form');
  const photoInput = el('f-photo');
  const photoPreview = el('f-preview');
  const photoNote = el('f-photo-note');
  const photoClear = el('f-photo-clear');

  /** Item yang sedang diedit; null berarti form dalam mode "tambah". */
  let editingId = null;
  let busy = false;

  /**
   * State foto untuk form yang sedang terbuka.
   * - `formItemId` dikunci saat form dibuka: nama file gambar memuat itemId, jadi id
   *   harus pasti sebelum gambar diunggah. Juga membuat retry idempoten.
   * - `uploadedPath` diisi setelah gambar BERHASIL diunggah. Kalau penulisan menu.json
   *   lalu gagal, retry hanya mengulang langkah JSON — gambar tidak diunggah dua kali.
   */
  let formItemId = null;
  let pendingImage = null; // hasil compressImage, belum diunggah
  let uploadedPath = null; // sudah di GitHub, menunggu menu.json
  let removePhoto = false;

  /* ---------------------------------------------------------------- status */

  const setStatus = (text) => {
    statusBox.textContent = text;
  };

  function setError(error) {
    if (!error) {
      errorBox.hidden = true;
      clear(errorBox);
      return;
    }
    clear(errorBox);
    const issues = error instanceof InvalidMenuError ? error.issues : [describe(error)];
    if (issues.length === 1) {
      errorBox.textContent = issues[0];
    } else {
      const ul = node('ul', 'issues');
      for (const issue of issues) ul.append(node('li', null, issue));
      errorBox.append(ul);
    }
    errorBox.hidden = false;
  }

  function describe(error) {
    if (error instanceof ImageError) return error.message;
    if (error instanceof NotFoundError) return 'File data/menu.json tidak ditemukan di repositori.';
    if (error instanceof RateLimitError) {
      if (error.retryAfter) return `Terlalu banyak permintaan. Coba lagi dalam ${error.retryAfter} detik.`;
      const at = error.resetAt?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return at ? `Kuota GitHub habis. Coba lagi setelah pukul ${at}.` : 'Kuota GitHub habis.';
    }
    if (error instanceof NetworkError) return 'Gagal menghubungi GitHub. Isian Anda masih ada — coba simpan lagi.';
    if (error instanceof ValidationError) return `GitHub menolak perubahan: ${error.message}`;
    if (error instanceof StaleMenuError) return error.message;
    return 'Terjadi kesalahan tak terduga. Coba lagi.';
  }

  /* ------------------------------------------------------------------ save */

  /** Satu operasi tulis pada satu waktu. Unggah foto + commit JSON berbagi kunci ini. */
  async function exclusive(fn) {
    if (busy) return false;
    busy = true;
    try {
      return await fn();
    } finally {
      busy = false;
    }
  }

  /**
   * Menulis menu.json. `mutate` adalah fungsi `(menu) => menu` — store yang mengurus
   * retry saat 409, dengan menerapkan ulang fungsi ini di atas isi terbaru.
   */
  async function writeMenu(mutate, message, { onSuccess } = {}) {
    setError(null);
    setStatus('Menyimpan…');

    try {
      const { commit: sha, recovered } = await store.save(mutate, message);
      setStatus(
        recovered
          ? `Tersimpan (menu sempat berubah di tempat lain, perubahan Anda digabungkan) · ${sha.slice(0, 7)}`
          : `Tersimpan · ${sha.slice(0, 7)}`,
      );
      onSuccess?.();
      render();
      return true;
    } catch (error) {
      setStatus('');
      if (error instanceof AuthError) {
        onAuthError(error);
        return false;
      }
      if (error instanceof StaleMenuError) {
        setError(error);
        render(); // store sudah memuat isi terbaru
        return false;
      }
      setError(error); // NetworkError: form sengaja tidak disentuh
      return false;
    }
  }

  /** Untuk aksi baris (toggle, urutkan, hapus) yang tidak menyentuh foto. */
  const commit = (mutate, message, options) => exclusive(() => writeMenu(mutate, message, options));

  /* ------------------------------------------------------------------ form */

  const formFields = () => ({
    categoryId: el('f-category').value,
    name: { id: el('f-name-id').value, en: el('f-name-en').value },
    description: { id: el('f-desc-id').value, en: el('f-desc-en').value },
    price: el('f-price').value === '' ? Number.NaN : Number(el('f-price').value),
    available: el('f-available').checked,
    featured: el('f-featured').checked,
  });

  /* ----------------------------------------------------------------- foto */

  /** URL blob preview harus dicabut, kalau tidak bocor selama sesi admin. */
  function releasePreview() {
    if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl);
  }

  function resetPhotoState() {
    releasePreview();
    pendingImage = null;
    uploadedPath = null;
    removePhoto = false;
    photoInput.value = '';
    photoPreview.hidden = true;
    photoPreview.removeAttribute('src');
    photoClear.hidden = true;
    photoNote.textContent = 'Foto dikecilkan otomatis dan disimpan sebagai WebP.';
  }

  function showExistingPhoto(item) {
    if (!item?.image) return;
    // Path di menu.json relatif terhadap root situs; halaman ini ada di /admin/.
    photoPreview.src = `../${item.image}`;
    photoPreview.alt = `Foto ${item.name.id}`;
    photoPreview.hidden = false;
    photoClear.hidden = false;
    photoNote.textContent = 'Pilih file untuk mengganti foto.';
  }

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;

    setError(null);
    photoNote.textContent = 'Memproses foto…';
    try {
      releasePreview();
      const result = await compressImage(file);
      pendingImage = result;
      uploadedPath = null; // foto berganti → unggahan lama (kalau ada) tidak relevan
      removePhoto = false;
      photoPreview.src = result.previewUrl;
      photoPreview.alt = 'Pratinjau foto';
      photoPreview.hidden = false;
      photoClear.hidden = false;
      photoNote.textContent = `${result.width}×${result.height} · ${formatBytes(result.size)} · WebP`;
    } catch (error) {
      pendingImage = null;
      photoInput.value = '';
      photoNote.textContent = 'Foto dikecilkan otomatis dan disimpan sebagai WebP.';
      setError(error);
    }
  });

  photoClear.addEventListener('click', () => {
    releasePreview();
    pendingImage = null;
    uploadedPath = null;
    removePhoto = true;
    photoInput.value = '';
    photoPreview.hidden = true;
    photoPreview.removeAttribute('src');
    photoClear.hidden = true;
    photoNote.textContent = 'Foto akan dihapus dari item ini saat disimpan.';
  });

  /**
   * Tentukan nilai `image` untuk menu.json, mengunggah foto lebih dulu bila perlu.
   *
   * URUTAN WAJIB: gambar dulu, menu.json kemudian. Kebalikannya membuat menu.json
   * menunjuk file yang belum ada, dan halaman pelanggan menampilkan gambar rusak.
   */
  async function resolveImagePath(existing, label) {
    if (uploadedPath) return uploadedPath; // sudah terunggah di percobaan sebelumnya
    if (removePhoto) return '';
    if (!pendingImage) return existing ?? '';

    setStatus('Mengunggah foto…');
    const path = imagePath(formItemId);
    // Nama unik → ini selalu operasi *create*: tanpa sha, tak pernah 409.
    await client.putFile({ path, content: pendingImage.bytes, message: `Unggah foto ${label}` });
    uploadedPath = path;
    return path;
  }

  function fillForm(item) {
    el('f-category').value = item?.categoryId ?? store.menu.categories[0]?.id ?? '';
    el('f-name-id').value = item?.name?.id ?? '';
    el('f-name-en').value = item?.name?.en ?? '';
    el('f-desc-id').value = item?.description?.id ?? '';
    el('f-desc-en').value = item?.description?.en ?? '';
    el('f-price').value = item ? String(item.price) : '';
    el('f-available').checked = item ? item.available !== false : true;
    el('f-featured').checked = item ? item.featured === true : false;
  }

  function openForm(item = null) {
    if (store.menu.categories.length === 0) {
      setError(new InvalidMenuError(['Buat minimal satu kategori sebelum menambah item.']));
      return;
    }
    editingId = item?.id ?? null;
    // Id dikunci sekarang, bukan saat menyimpan: nama file foto memuatnya.
    formItemId = item?.id ?? newItemId(new Set(store.menu.items.map((i) => i.id)));
    el('item-form-title').textContent = item ? `Edit: ${item.name.id}` : 'Item baru';
    renderCategoryOptions();
    fillForm(item);
    resetPhotoState();
    showExistingPhoto(item);
    itemForm.hidden = false;
    el('f-name-id').focus();
  }

  function closeForm() {
    itemForm.hidden = true;
    editingId = null;
    formItemId = null;
    resetPhotoState();
    itemForm.reset();
  }

  /* ---------------------------------------------------------------- render */

  function renderCategoryOptions() {
    const select = el('f-category');
    const current = select.value;
    clear(select);
    for (const category of [...store.menu.categories].sort((a, b) => a.order - b.order)) {
      const option = node('option', null, category.name.id);
      option.value = category.id;
      select.append(option);
    }
    if (current) select.value = current;
  }

  function renderItemRow(item, index, total) {
    const row = node('li', 'row');

    const main = node('div', 'row__main');
    const title = node('div', 'row__title');
    title.append(node('span', 'row__name', item.name.id));
    if (item.featured) title.append(node('span', 'tag tag--featured', 'Signature'));
    if (item.available === false) title.append(node('span', 'tag tag--sold', 'Habis'));
    main.append(title);

    const meta = [rupiah.format(item.price)];
    if (item.name.en) meta.push(item.name.en);
    main.append(node('div', 'row__meta', meta.join(' · ')));
    row.append(main);

    const actions = node('div', 'row__actions');
    const up = button('↑', { action: 'item-up', id: item.id, title: 'Naikkan urutan' });
    const down = button('↓', { action: 'item-down', id: item.id, title: 'Turunkan urutan' });
    up.disabled = index === 0;
    down.disabled = index === total - 1;
    actions.append(up, down);
    actions.append(
      button(item.available === false ? 'Adakan' : 'Habiskan', {
        action: 'item-available', id: item.id, className: 'btn-text',
        title: item.available === false ? 'Tandai tersedia' : 'Tandai habis',
      }),
    );
    actions.append(
      button(item.featured ? 'Batal Signature' : 'Signature', {
        action: 'item-featured', id: item.id, className: 'btn-text',
        title: item.featured ? 'Hapus badge Signature' : 'Tandai sebagai Signature',
      }),
    );
    actions.append(button('Edit', { action: 'item-edit', id: item.id, className: 'btn-text' }));
    actions.append(button('Hapus', { action: 'item-delete', id: item.id, className: 'btn-text btn-text--danger' }));
    row.append(actions);

    return row;
  }

  function renderItems() {
    clear(itemList);
    const { categories, items } = store.menu;

    if (items.length === 0) {
      itemList.append(node('p', 'panel__hint', 'Belum ada item. Klik “Tambah item”.'));
      return;
    }

    for (const category of [...categories].sort((a, b) => a.order - b.order)) {
      const group = items.filter((i) => i.categoryId === category.id).sort((a, b) => a.order - b.order);
      if (group.length === 0) continue;

      itemList.append(node('h3', 'group__title', category.name.id));
      const ul = node('ul', 'rows');
      group.forEach((item, index) => ul.append(renderItemRow(item, index, group.length)));
      itemList.append(ul);
    }
  }

  function renderCategories() {
    clear(categoryList);
    const sorted = [...store.menu.categories].sort((a, b) => a.order - b.order);

    if (sorted.length === 0) {
      categoryList.append(node('p', 'panel__hint', 'Belum ada kategori.'));
      return;
    }

    sorted.forEach((category, index) => {
      const row = node('li', 'row');
      const used = store.menu.items.filter((i) => i.categoryId === category.id).length;

      const main = node('div', 'row__main');
      main.append(node('div', 'row__name', category.name.id));
      main.append(
        node('div', 'row__meta', `${category.name.en || '— tanpa nama English —'} · ${used} item`),
      );
      row.append(main);

      const actions = node('div', 'row__actions');
      const up = button('↑', { action: 'cat-up', id: category.id, title: 'Naikkan urutan' });
      const down = button('↓', { action: 'cat-down', id: category.id, title: 'Turunkan urutan' });
      up.disabled = index === 0;
      down.disabled = index === sorted.length - 1;
      actions.append(up, down);
      actions.append(button('Ganti nama', { action: 'cat-rename', id: category.id, className: 'btn-text' }));

      const remove = button('Hapus', { action: 'cat-delete', id: category.id, className: 'btn-text btn-text--danger' });
      // Kategori yang masih dipakai tidak bisa dihapus — jangan pura-pura bisa diklik.
      remove.disabled = used > 0;
      if (used > 0) remove.title = `Masih dipakai ${used} item`;
      actions.append(remove);

      row.append(actions);
      categoryList.append(row);
    });
  }

  function render() {
    renderCategories();
    renderCategoryOptions();
    renderItems();
  }

  /* ---------------------------------------------------- pemeliharaan foto */

  /**
   * Hapus satu file gambar. Sengaja menelan kegagalan: menu.json sudah benar, dan
   * file yatim tidak merugikan siapa pun. AuthError tetap diteruskan.
   */
  async function deletePhotoQuietly(path, label) {
    try {
      const meta = await client.getMetadata(path);
      await client.deleteFile({ path, sha: meta.sha, message: `Hapus foto ${label}` });
      return true;
    } catch (error) {
      if (error instanceof AuthError) onAuthError(error);
      return false;
    }
  }

  const orphanStatus = el('orphan-status');

  async function cleanOrphans() {
    return exclusive(async () => {
      setError(null);
      orphanStatus.textContent = 'Memeriksa folder foto…';

      let files;
      try {
        files = await client.listDir('images');
      } catch (error) {
        if (error instanceof AuthError) {
          onAuthError(error);
          return false;
        }
        // Folder images/ kosong tidak ada di Git — bukan kondisi error.
        if (error instanceof NotFoundError) {
          orphanStatus.textContent = 'Tidak ada foto tersimpan.';
          return true;
        }
        orphanStatus.textContent = '';
        setError(error);
        return false;
      }

      const orphans = findOrphans(files, store.menu);
      if (orphans.length === 0) {
        orphanStatus.textContent = 'Tidak ada foto tak terpakai.';
        return true;
      }
      if (!confirm(`Hapus ${orphans.length} foto yang tidak dipakai item mana pun?`)) {
        orphanStatus.textContent = `${orphans.length} foto tak terpakai ditemukan.`;
        return false;
      }

      let deleted = 0;
      for (const file of orphans) {
        orphanStatus.textContent = `Menghapus ${deleted + 1} dari ${orphans.length}…`;
        try {
          await client.deleteFile({ path: file.path, sha: file.sha, message: `Hapus foto tak terpakai ${file.name}` });
          deleted++;
        } catch (error) {
          if (error instanceof AuthError) {
            onAuthError(error);
            return false;
          }
          break; // berhenti di kegagalan pertama; sisanya bisa disapu lain kali
        }
      }

      orphanStatus.textContent =
        deleted === orphans.length
          ? `${deleted} foto tak terpakai dihapus.`
          : `${deleted} dari ${orphans.length} foto dihapus. Coba lagi untuk sisanya.`;
      return true;
    });
  }

  el('clean-orphans').addEventListener('click', cleanOrphans);

  /* ----------------------------------------------------------------- event */

  itemList.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const { action, id } = target.dataset;
    const item = store.menu.items.find((i) => i.id === id);
    if (!item) return;

    switch (action) {
      case 'item-edit':
        openForm(item);
        break;
      case 'item-up':
        await commit(mutators.moveItem(id, -1), `Naikkan urutan ${item.name.id}`);
        break;
      case 'item-down':
        await commit(mutators.moveItem(id, +1), `Turunkan urutan ${item.name.id}`);
        break;
      case 'item-available':
        await commit(
          mutators.setItemFlag(id, 'available', item.available === false),
          `${item.available === false ? 'Adakan' : 'Habiskan'} ${item.name.id}`,
        );
        break;
      case 'item-featured':
        await commit(
          mutators.setItemFlag(id, 'featured', !item.featured),
          `${item.featured ? 'Batalkan' : 'Tandai'} Signature ${item.name.id}`,
        );
        break;
      case 'item-delete': {
        if (!confirm(`Hapus "${item.name.id}" dari menu?`)) return;
        if (editingId === id) closeForm();
        const image = item.image;
        const removed = await commit(mutators.removeItem(id), `Hapus item ${item.name.id}`);
        // Foto dihapus SETELAH menu.json, dan kegagalannya diabaikan: menu sudah benar,
        // dan yang tertinggal cuma file yatim yang bisa disapu lewat Pemeliharaan.
        if (removed && image) await deletePhotoQuietly(image, item.name.id);
        break;
      }
      default:
        break;
    }
  });

  categoryList.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const { action, id } = target.dataset;
    const category = store.menu.categories.find((c) => c.id === id);
    if (!category) return;

    switch (action) {
      case 'cat-up':
        await commit(mutators.moveCategory(id, -1), `Naikkan kategori ${category.name.id}`);
        break;
      case 'cat-down':
        await commit(mutators.moveCategory(id, +1), `Turunkan kategori ${category.name.id}`);
        break;
      case 'cat-rename': {
        const nameId = prompt('Nama kategori (Indonesia)', category.name.id);
        if (nameId === null) return;
        const nameEn = prompt('Nama kategori (English, boleh kosong)', category.name.en ?? '');
        if (nameEn === null) return;
        await commit(
          mutators.updateCategory(id, { name: { id: nameId, en: nameEn } }),
          `Ganti nama kategori ${category.name.id}`,
        );
        break;
      }
      case 'cat-delete':
        if (!confirm(`Hapus kategori "${category.name.id}"?`)) return;
        await commit(mutators.removeCategory(id), `Hapus kategori ${category.name.id}`);
        break;
      default:
        break;
    }
  });

  itemForm.addEventListener('submit', (event) => {
    event.preventDefault();

    return exclusive(async () => {
      const draft = formFields();
      const id = editingId;
      const label = draft.name.id.trim() || 'item';
      const existing = id ? store.menu.items.find((i) => i.id === id)?.image : '';

      let image;
      try {
        image = await resolveImagePath(existing, label);
      } catch (error) {
        setStatus('');
        if (error instanceof AuthError) {
          onAuthError(error);
          return false;
        }
        // Gagal SEBELUM menyentuh menu.json: tidak ada yang perlu dibersihkan.
        setError(error);
        return false;
      }

      const withImage = { ...draft, image, id: id ?? formItemId };
      const mutate = id ? mutators.updateItem(id, withImage) : mutators.addItem(withImage);
      const saved = await writeMenu(mutate, id ? `Ubah item ${label}` : `Tambah item ${label}`, {
        onSuccess: closeForm,
      });

      // Partial failure: foto sudah naik, menu.json gagal ditulis. Fotonya yatim —
      // tidak berbahaya dan murah. Retry cukup mengulang langkah JSON saja, karena
      // `uploadedPath` sudah stabil.
      if (!saved && uploadedPath) {
        errorBox.append(
          node('p', 'panel__hint', 'Foto sudah tersimpan. Klik Simpan lagi — foto tidak akan diunggah ulang.'),
        );
      }
      return saved;
    });
  });

  el('f-cancel').addEventListener('click', () => {
    closeForm();
    setError(null);
  });
  el('item-new').addEventListener('click', () => openForm());

  categoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const draft = { name: { id: el('c-name-id').value, en: el('c-name-en').value } };
    try {
      await commit(mutators.addCategory(draft), `Tambah kategori ${draft.name.id.trim()}`, {
        onSuccess: () => categoryForm.reset(),
      });
    } catch (error) {
      setError(error);
    }
  });

  return {
    render,
    setStatus,

    /**
     * Memuat menu gagal. Auth tetap sah — jangan usir owner; beri jalan mencoba lagi.
     * Kalau ini memblokir login, `data/menu.json` yang hilang akan mengunci admin sepenuhnya.
     */
    showLoadError(error, onRetry) {
      setStatus('');
      setError(error);
      const retry = node('button', 'button button--small', 'Muat ulang');
      retry.type = 'button';
      retry.addEventListener('click', onRetry, { once: true });
      errorBox.append(retry);
      errorBox.hidden = false;
    },

    reset() {
      closeForm();
      setError(null);
      setStatus('');
      clear(itemList);
      clear(categoryList);
    },
  };
}
