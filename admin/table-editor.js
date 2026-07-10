// Editor menu berbasis TABEL — dipakai bersama cafe + semua tema showcase.
// Semua teks lewat `textContent`; tidak ada `innerHTML`.
//
// Menyimpan seluruh invarian yang sudah teruji dari editor lama:
//   - URUTAN WAJIB: unggah gambar dulu, tulis menu.json kemudian.
//   - Nama file gambar unik per upload → PUT selalu create, tak pernah 409.
//   - Mutator `(menu)=>menu`; store yang retry saat 409 (re-apply di isi terbaru).
//   - Gagal tulis JSON setelah gambar naik → foto yatim (murah), retry ulangi langkah JSON.
//   - Isi form TIDAK dikosongkan saat gagal jaringan.
//
// Konfigurasi per desain lewat opsi: folder upload gambar, prefiks pratinjau, dan
// folder yang disapu saat membersihkan foto yatim (hanya folder upload sendiri —
// foto seed bersama tidak pernah ikut terhapus).

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

/**
 * @param {object} opts
 * @param {object} opts.store        menu-store
 * @param {object} opts.client       github client (menulis gambar langsung)
 * @param {Function} opts.onAuthError dipanggil saat token dicabut di tengah sesi
 * @param {string} [opts.imageDir]        folder upload foto (mis. 'images' | 'showcase/2/img')
 * @param {string} [opts.imagePreviewBase] prefiks agar path root-relative bisa dipratinjau
 *                                          dari halaman admin ini (mis. '../' | '../../../')
 */
export function createTableEditor({ store, client, onAuthError, imageDir = 'images', imagePreviewBase = '../' }) {
  const statusBox = el('status');
  const errorBox = el('editor-error');
  const tablesRoot = el('menu-tables');
  const categoryList = el('category-list');
  const itemForm = el('item-form');
  const categoryForm = el('category-form');
  const cafeForm = el('cafe-form');
  const cafeStatus = el('cafe-status');
  const photoInput = el('f-photo');
  const photoPreview = el('f-preview');
  const photoNote = el('f-photo-note');
  const photoClear = el('f-photo-clear');

  let editingId = null;
  let busy = false;

  // State foto form terbuka (lihat editor lama untuk rasional lengkap).
  let formItemId = null;
  let pendingImage = null;
  let uploadedPath = null;
  let removePhoto = false;

  /* ---------------------------------------------------------------- status */

  const setStatus = (text) => { statusBox.textContent = text; };

  function setError(error) {
    if (!error) { errorBox.hidden = true; clear(errorBox); return; }
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
    if (error instanceof NotFoundError) return 'File data menu tidak ditemukan di repositori.';
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

  async function exclusive(fn) {
    if (busy) return false;
    busy = true;
    try { return await fn(); } finally { busy = false; }
  }

  async function writeMenu(mutate, message, { onSuccess, statusEl = statusBox } = {}) {
    setError(null);
    statusEl.textContent = 'Menyimpan…';
    try {
      const { commit: sha, recovered } = await store.save(mutate, message);
      statusEl.textContent = recovered
        ? `Tersimpan (digabung dengan perubahan lain) · ${sha.slice(0, 7)}`
        : `Tersimpan · ${sha.slice(0, 7)}`;
      onSuccess?.();
      render();
      return true;
    } catch (error) {
      statusEl.textContent = '';
      if (error instanceof AuthError) { onAuthError(error); return false; }
      if (error instanceof StaleMenuError) { setError(error); render(); return false; }
      setError(error);
      return false;
    }
  }

  const commit = (mutate, message, options) => exclusive(() => writeMenu(mutate, message, options));

  /* ------------------------------------------------------------ form item */

  const formFields = () => ({
    categoryId: el('f-category').value,
    name: { id: el('f-name-id').value, en: el('f-name-en').value },
    description: { id: el('f-desc-id').value, en: el('f-desc-en').value },
    price: el('f-price').value === '' ? Number.NaN : Number(el('f-price').value),
    available: el('f-available').checked,
    featured: el('f-featured').checked,
    badge: el('f-new').checked ? 'new' : '',
  });

  /* ----------------------------------------------------------------- foto */

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
    photoPreview.src = imagePreviewBase + item.image;
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
      uploadedPath = null;
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

  /** URUTAN WAJIB: gambar dulu, menu.json kemudian. */
  async function resolveImagePath(existing, label) {
    if (uploadedPath) return uploadedPath;
    if (removePhoto) return '';
    if (!pendingImage) return existing ?? '';
    setStatus('Mengunggah foto…');
    const path = imagePath(formItemId, imageDir);
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
    el('f-new').checked = item ? item.badge === 'new' : false;
  }

  function openForm(item = null) {
    if (store.menu.categories.length === 0) {
      setError(new InvalidMenuError(['Buat minimal satu kategori sebelum menambah item.']));
      return;
    }
    editingId = item?.id ?? null;
    formItemId = item?.id ?? newItemId(new Set(store.menu.items.map((i) => i.id)));
    el('item-form-title').textContent = item ? `Edit: ${item.name.id}` : 'Item baru';
    renderCategoryOptions();
    fillForm(item);
    resetPhotoState();
    showExistingPhoto(item);
    itemForm.hidden = false;
    el('f-name-id').focus();
    itemForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeForm() {
    itemForm.hidden = true;
    editingId = null;
    formItemId = null;
    resetPhotoState();
    itemForm.reset();
  }

  /* -------------------------------------------------------------- branding */

  function fillCafeForm() {
    const cafe = store.menu.cafe ?? {};
    el('cf-name').value = cafe.name ?? '';
    el('cf-tag-id').value = cafe.tagline?.id ?? '';
    el('cf-tag-en').value = cafe.tagline?.en ?? '';
    el('cf-whatsapp').value = cafe.whatsapp ?? '';
    el('cf-instagram').value = cafe.instagram ?? '';
    el('cf-tiktok').value = cafe.tiktok ?? '';
    el('cf-maps').value = cafe.maps ?? '';
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
    const tr = node('tr', 'trow');
    if (item.available === false) tr.classList.add('trow--sold');

    // Foto
    const cPhoto = node('td', 'trow__photo');
    if (item.image) {
      const img = node('img', 'thumb');
      img.src = imagePreviewBase + item.image;
      img.alt = '';
      img.width = 48;
      img.height = 48;
      img.loading = 'lazy';
      cPhoto.append(img);
    } else {
      cPhoto.append(node('span', 'thumb thumb--empty', '—'));
    }
    tr.append(cPhoto);

    // Produk (nama id + en)
    const cName = node('td');
    const nameWrap = node('div', 'trow__name');
    nameWrap.append(node('span', 'trow__name-id', item.name.id));
    if (item.featured) nameWrap.append(node('span', 'tag tag--featured', 'Signature'));
    if (item.badge === 'new') nameWrap.append(node('span', 'tag tag--new', 'Baru'));
    cName.append(nameWrap);
    if (item.name.en) cName.append(node('div', 'trow__sub', item.name.en));
    tr.append(cName);

    // Harga
    const cPrice = node('td', 'trow__price', rupiah.format(item.price));
    tr.append(cPrice);

    // Status
    const cStatus = node('td');
    cStatus.append(
      node('span', item.available === false ? 'pill pill--sold' : 'pill pill--on',
        item.available === false ? 'Habis' : 'Tersedia'),
    );
    tr.append(cStatus);

    // Aksi
    const cActions = node('td', 'trow__actions');
    const up = button('↑', { action: 'item-up', id: item.id, title: 'Naikkan urutan' });
    const down = button('↓', { action: 'item-down', id: item.id, title: 'Turunkan urutan' });
    up.disabled = index === 0;
    down.disabled = index === total - 1;
    cActions.append(up, down);
    cActions.append(button(item.available === false ? 'Adakan' : 'Habiskan', {
      action: 'item-available', id: item.id, className: 'btn-text',
      title: item.available === false ? 'Tandai tersedia' : 'Tandai habis',
    }));
    cActions.append(button(item.featured ? 'Batal Signature' : 'Signature', {
      action: 'item-featured', id: item.id, className: 'btn-text',
      title: item.featured ? 'Hapus badge Signature' : 'Tandai sebagai Signature',
    }));
    cActions.append(button('Edit', { action: 'item-edit', id: item.id, className: 'btn-text' }));
    cActions.append(button('Hapus', { action: 'item-delete', id: item.id, className: 'btn-text btn-text--danger' }));
    tr.append(cActions);

    return tr;
  }

  /** Satu tabel per kategori — pemisahan yang jelas untuk owner. */
  function renderItems() {
    clear(tablesRoot);
    const { categories, items } = store.menu;

    if (categories.length === 0) {
      tablesRoot.append(node('p', 'panel__hint', 'Belum ada kategori. Tambahkan kategori di bawah dulu.'));
      return;
    }

    for (const category of [...categories].sort((a, b) => a.order - b.order)) {
      const group = items.filter((i) => i.categoryId === category.id).sort((a, b) => a.order - b.order);

      const block = node('section', 'cat-block');
      const head = node('div', 'cat-block__head');
      head.append(node('h3', 'cat-block__title', category.name.id));
      head.append(node('span', 'cat-block__count', `${group.length} item`));
      block.append(head);

      if (group.length === 0) {
        block.append(node('p', 'cat-block__empty', 'Belum ada item di kategori ini.'));
        tablesRoot.append(block);
        continue;
      }

      const scroll = node('div', 'table-scroll');
      const table = node('table', 'menu-table');
      const thead = node('thead');
      const trh = node('tr');
      for (const label of ['Foto', 'Produk', 'Harga', 'Status', 'Aksi']) {
        const th = node('th', null, label);
        th.scope = 'col';
        trh.append(th);
      }
      thead.append(trh);
      table.append(thead);

      const tbody = node('tbody');
      group.forEach((item, index) => tbody.append(renderItemRow(item, index, group.length)));
      table.append(tbody);
      scroll.append(table);
      block.append(scroll);
      tablesRoot.append(block);
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
      main.append(node('div', 'row__meta', `${category.name.en || '— tanpa nama English —'} · ${used} item`));
      row.append(main);

      const actions = node('div', 'row__actions');
      const up = button('↑', { action: 'cat-up', id: category.id, title: 'Naikkan urutan' });
      const down = button('↓', { action: 'cat-down', id: category.id, title: 'Turunkan urutan' });
      up.disabled = index === 0;
      down.disabled = index === sorted.length - 1;
      actions.append(up, down);
      actions.append(button('Ganti nama', { action: 'cat-rename', id: category.id, className: 'btn-text' }));
      const remove = button('Hapus', { action: 'cat-delete', id: category.id, className: 'btn-text btn-text--danger' });
      remove.disabled = used > 0;
      if (used > 0) remove.title = `Masih dipakai ${used} item`;
      actions.append(remove);
      row.append(actions);
      categoryList.append(row);
    });
  }

  function render() {
    fillCafeForm();
    renderCategories();
    renderCategoryOptions();
    renderItems();
  }

  /* ---------------------------------------------------- pemeliharaan foto */

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
        files = await client.listDir(imageDir);
      } catch (error) {
        if (error instanceof AuthError) { onAuthError(error); return false; }
        if (error instanceof NotFoundError) { orphanStatus.textContent = 'Tidak ada foto tersimpan.'; return true; }
        orphanStatus.textContent = '';
        setError(error);
        return false;
      }
      const orphans = findOrphans(files, store.menu);
      if (orphans.length === 0) { orphanStatus.textContent = 'Tidak ada foto tak terpakai.'; return true; }
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
          if (error instanceof AuthError) { onAuthError(error); return false; }
          break;
        }
      }
      orphanStatus.textContent = deleted === orphans.length
        ? `${deleted} foto tak terpakai dihapus.`
        : `${deleted} dari ${orphans.length} foto dihapus. Coba lagi untuk sisanya.`;
      return true;
    });
  }

  el('clean-orphans').addEventListener('click', cleanOrphans);

  /* ----------------------------------------------------------------- event */

  tablesRoot.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const { action, id } = target.dataset;
    const item = store.menu.items.find((i) => i.id === id);
    if (!item) return;

    switch (action) {
      case 'item-edit': openForm(item); break;
      case 'item-up': await commit(mutators.moveItem(id, -1), `Naikkan urutan ${item.name.id}`); break;
      case 'item-down': await commit(mutators.moveItem(id, +1), `Turunkan urutan ${item.name.id}`); break;
      case 'item-available':
        await commit(mutators.setItemFlag(id, 'available', item.available === false),
          `${item.available === false ? 'Adakan' : 'Habiskan'} ${item.name.id}`);
        break;
      case 'item-featured':
        await commit(mutators.setItemFlag(id, 'featured', !item.featured),
          `${item.featured ? 'Batalkan' : 'Tandai'} Signature ${item.name.id}`);
        break;
      case 'item-delete': {
        if (!confirm(`Hapus "${item.name.id}" dari menu?`)) return;
        if (editingId === id) closeForm();
        const image = item.image;
        const removed = await commit(mutators.removeItem(id), `Hapus item ${item.name.id}`);
        if (removed && image) await deletePhotoQuietly(image, item.name.id);
        break;
      }
      default: break;
    }
  });

  categoryList.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const { action, id } = target.dataset;
    const category = store.menu.categories.find((c) => c.id === id);
    if (!category) return;

    switch (action) {
      case 'cat-up': await commit(mutators.moveCategory(id, -1), `Naikkan kategori ${category.name.id}`); break;
      case 'cat-down': await commit(mutators.moveCategory(id, +1), `Turunkan kategori ${category.name.id}`); break;
      case 'cat-rename': {
        const nameId = prompt('Nama kategori (Indonesia)', category.name.id);
        if (nameId === null) return;
        const nameEn = prompt('Nama kategori (English, boleh kosong)', category.name.en ?? '');
        if (nameEn === null) return;
        await commit(mutators.updateCategory(id, { name: { id: nameId, en: nameEn } }),
          `Ganti nama kategori ${category.name.id}`);
        break;
      }
      case 'cat-delete':
        if (!confirm(`Hapus kategori "${category.name.id}"?`)) return;
        await commit(mutators.removeCategory(id), `Hapus kategori ${category.name.id}`);
        break;
      default: break;
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
        if (error instanceof AuthError) { onAuthError(error); return false; }
        setError(error);
        return false;
      }

      const withImage = { ...draft, image, id: id ?? formItemId };
      const mutate = id ? mutators.updateItem(id, withImage) : mutators.addItem(withImage);
      const saved = await writeMenu(mutate, id ? `Ubah item ${label}` : `Tambah item ${label}`, { onSuccess: closeForm });

      if (!saved && uploadedPath) {
        errorBox.append(node('p', 'panel__hint', 'Foto sudah tersimpan. Klik Simpan lagi — foto tidak akan diunggah ulang.'));
      }
      return saved;
    });
  });

  el('f-cancel').addEventListener('click', () => { closeForm(); setError(null); });
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

  cafeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    return exclusive(async () => {
      const fields = {
        name: el('cf-name').value,
        tagline: { id: el('cf-tag-id').value, en: el('cf-tag-en').value },
        whatsapp: el('cf-whatsapp').value,
        instagram: el('cf-instagram').value,
        tiktok: el('cf-tiktok').value,
        maps: el('cf-maps').value,
      };
      return writeMenu(mutators.updateCafe(fields), 'Perbarui identitas & sosial', { statusEl: cafeStatus });
    });
  });

  return {
    render,
    setStatus,
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
      clear(tablesRoot);
      clear(categoryList);
    },
  };
}
