// Dasbor menu: satu tabel produk dengan cari / saring / urut / seleksi massal, plus
// form identitas, media sosial, kategori, ringkasan, dan pemeliharaan foto. Dipakai
// bersama cafe + semua tema showcase (dikonfigurasi lewat opsi). Semua teks lewat
// `textContent`; tidak ada `innerHTML`.
//
// Menyimpan seluruh invarian yang sudah teruji dari editor lama:
//   - URUTAN WAJIB: unggah gambar dulu, tulis menu.json kemudian.
//   - Nama file gambar unik per upload → PUT selalu create, tak pernah 409.
//   - Mutator `(menu)=>menu`; store yang retry saat 409 (re-apply di isi terbaru).
//   - Gagal tulis JSON setelah gambar naik → foto yatim (murah), retry ulangi langkah JSON.
//   - Isi form TIDAK dikosongkan saat gagal jaringan.

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

function iconButton(label, { action, id, className = 'iconbtn', title }) {
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

const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };

export function createDashboard({ store, client, onAuthError, imageDir = 'images', imagePreviewBase = '../' }) {
  const statusBox = el('status');
  const errorBox = el('editor-error');

  // Bagian menu
  const tbody = el('menu-tbody');
  const menuEmpty = el('menu-empty');
  const searchInput = el('menu-search');
  const filterSelect = el('menu-filter');
  const checkAll = el('check-all');
  const bulkBar = el('bulk-bar');
  const bulkCount = el('bulk-count');

  // Dialog item
  const dialog = el('item-dialog');
  const itemForm = el('item-form');
  const itemError = el('item-form-error');
  const photoInput = el('f-photo');
  const photoPreview = el('f-preview');
  const photoNote = el('f-photo-note');
  const photoClear = el('f-photo-clear');

  // Kategori / identitas / sosial
  const categoryList = el('category-list');
  const categoryForm = el('category-form');
  const categoryError = el('category-error');
  const cafeForm = el('cafe-form');
  const cafeStatus = el('cafe-status');
  const socialForm = el('social-form');
  const socialStatus = el('social-status');

  let editingId = null;
  let busy = false;

  // State foto form terbuka.
  let formItemId = null;
  let pendingImage = null;
  let uploadedPath = null;
  let removePhoto = false;

  // State tabel.
  let searchTerm = '';
  let filterCategory = 'all';
  let sortKey = 'category';
  let sortDir = 'asc';
  const selected = new Set();

  /* --------------------------------------------------------------- status */

  const setStatus = (text) => { statusBox.textContent = text; };

  function renderIssues(box, error) {
    clear(box);
    const issues = error instanceof InvalidMenuError ? error.issues : [describe(error)];
    if (issues.length === 1) {
      box.textContent = issues[0];
    } else {
      const ul = node('ul', 'issues');
      for (const issue of issues) ul.append(node('li', null, issue));
      box.append(ul);
    }
    box.hidden = false;
  }

  function setError(error, box = errorBox) {
    if (!error) { box.hidden = true; clear(box); return; }
    renderIssues(box, error);
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

  async function writeMenu(mutate, message, { onSuccess, statusEl = statusBox, errorEl = errorBox } = {}) {
    setError(null, errorEl);
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
      if (error instanceof StaleMenuError) { setError(error, errorEl); render(); return false; }
      setError(error, errorEl);
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
    setError(null, itemError);
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
      setError(error, itemError);
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
    setError(null, itemError);
    if (!dialog.open) dialog.showModal();
    el('f-name-id').focus();
  }

  function closeForm() {
    if (dialog.open) dialog.close();
    editingId = null;
    formItemId = null;
    resetPhotoState();
    setError(null, itemError);
    itemForm.reset();
  }

  // Esc / klik luar menutup <dialog> lewat event 'close' — bersihkan state foto di sana.
  dialog.addEventListener('close', () => {
    editingId = null;
    formItemId = null;
    resetPhotoState();
    setError(null, itemError);
  });

  /* -------------------------------------------------------------- branding */

  function fillCafeForm() {
    const cafe = store.menu.cafe ?? {};
    el('cf-name').value = cafe.name ?? '';
    el('cf-tag-id').value = cafe.tagline?.id ?? '';
    el('cf-tag-en').value = cafe.tagline?.en ?? '';
    el('cf-desc-id').value = cafe.description?.id ?? '';
    el('cf-desc-en').value = cafe.description?.en ?? '';
    el('cf-address-id').value = cafe.address?.id ?? '';
    el('cf-address-en').value = cafe.address?.en ?? '';
    el('cf-whatsapp').value = cafe.whatsapp ?? '';
    el('cf-instagram').value = cafe.instagram ?? '';
    el('cf-tiktok').value = cafe.tiktok ?? '';
    el('cf-maps').value = cafe.maps ?? '';
    el('brand-name').textContent = cafe.name || 'Menu Cafe';
  }

  /* -------------------------------------------------------------- seleksi */

  function updateBulkBar() {
    const count = selected.size;
    bulkBar.hidden = count === 0;
    bulkCount.textContent = `${count} terpilih`;
  }

  function pruneSelection() {
    const ids = new Set(store.menu.items.map((i) => i.id));
    for (const id of [...selected]) if (!ids.has(id)) selected.delete(id);
  }

  /* ---------------------------------------------------------------- tabel */

  function categoryName(id) {
    return store.menu.categories.find((c) => c.id === id)?.name.id ?? '—';
  }

  function visibleItems() {
    const term = searchTerm.trim().toLowerCase();
    let rows = store.menu.items;
    if (filterCategory !== 'all') rows = rows.filter((i) => i.categoryId === filterCategory);
    if (term) {
      rows = rows.filter((i) => `${i.name.id} ${i.name.en ?? ''}`.toLowerCase().includes(term));
    }
    return sortRows(rows);
  }

  function sortRows(items) {
    const catOrder = new Map(store.menu.categories.map((c) => [c.id, c.order]));
    const dir = sortDir === 'asc' ? 1 : -1;
    const byName = (a, b) => a.name.id.localeCompare(b.name.id, 'id');
    const byDefault = (a, b) =>
      (catOrder.get(a.categoryId) - catOrder.get(b.categoryId)) || (a.order - b.order);

    let cmp;
    switch (sortKey) {
      case 'name': cmp = byName; break;
      case 'price': cmp = (a, b) => (a.price - b.price) || byName(a, b); break;
      case 'status':
        cmp = (a, b) => (Number(a.available === false) - Number(b.available === false)) || byName(a, b);
        break;
      case 'category':
      default: cmp = byDefault; break;
    }
    return [...items].sort((a, b) => dir * cmp(a, b));
  }

  // Reorder hanya bermakna saat tabel menampilkan urutan default per kategori.
  const inDefaultOrder = () =>
    sortKey === 'category' && sortDir === 'asc' && searchTerm.trim() === '' && filterCategory === 'all';

  function categoryPosition(item) {
    const siblings = store.menu.items
      .filter((i) => i.categoryId === item.categoryId)
      .sort((a, b) => a.order - b.order);
    return { index: siblings.findIndex((i) => i.id === item.id), total: siblings.length };
  }

  function renderRow(item) {
    const tr = node('tr', 'drow');
    if (item.available === false) tr.classList.add('drow--off');

    // Checkbox
    const cCheck = node('td', 'dtable__check');
    const box = node('input');
    box.type = 'checkbox';
    box.className = 'check__box';
    box.checked = selected.has(item.id);
    box.dataset.select = item.id;
    box.setAttribute('aria-label', `Pilih ${item.name.id}`);
    cCheck.append(box);
    tr.append(cCheck);

    // Foto
    const cPhoto = node('td', 'drow__photo');
    if (item.image) {
      const img = node('img', 'thumb');
      img.src = imagePreviewBase + item.image;
      img.alt = '';
      img.width = 44;
      img.height = 44;
      img.loading = 'lazy';
      cPhoto.append(img);
    } else {
      cPhoto.append(node('span', 'thumb thumb--empty', '—'));
    }
    tr.append(cPhoto);

    // Nama (id + en + badge)
    const cName = node('td');
    const nameWrap = node('div', 'drow__name');
    nameWrap.append(node('span', 'drow__name-id', item.name.id));
    if (item.featured) nameWrap.append(node('span', 'tag tag--featured', 'Signature'));
    if (item.badge === 'new') nameWrap.append(node('span', 'tag tag--new', 'Baru'));
    cName.append(nameWrap);
    if (item.name.en) cName.append(node('div', 'drow__sub', item.name.en));
    tr.append(cName);

    // Kategori
    tr.append(node('td', 'drow__cat', categoryName(item.categoryId)));

    // Harga
    tr.append(node('td', 'drow__price', rupiah.format(item.price)));

    // Status — tombol toggle Aktif/Nonaktif
    const cStatus = node('td');
    const on = item.available !== false;
    const toggle = iconButton(on ? 'Aktif' : 'Nonaktif', {
      action: 'toggle-available', id: item.id,
      className: `status-toggle ${on ? 'status-toggle--on' : 'status-toggle--off'}`,
      title: on ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan',
    });
    const dot = node('span', 'status-toggle__dot');
    dot.setAttribute('aria-hidden', 'true');
    toggle.prepend(dot);
    cStatus.append(toggle);
    tr.append(cStatus);

    // Aksi
    const cActions = node('td', 'drow__actions');
    if (inDefaultOrder()) {
      const { index, total } = categoryPosition(item);
      const up = iconButton('↑', { action: 'item-up', id: item.id, title: 'Naikkan dalam kategori' });
      const down = iconButton('↓', { action: 'item-down', id: item.id, title: 'Turunkan dalam kategori' });
      up.disabled = index <= 0;
      down.disabled = index >= total - 1;
      cActions.append(up, down);
    }
    cActions.append(iconButton('✎', { action: 'item-edit', id: item.id, title: 'Edit item' }));
    cActions.append(iconButton('✕', {
      action: 'item-delete', id: item.id, className: 'iconbtn iconbtn--danger', title: 'Hapus item',
    }));
    tr.append(cActions);

    return tr;
  }

  function renderSortIndicators() {
    for (const th of document.querySelectorAll('.th-sort')) {
      const active = th.dataset.sort === sortKey;
      th.classList.toggle('th-sort--active', active);
      th.setAttribute('aria-sort', active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      const arrow = active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
      th.dataset.arrow = arrow;
    }
  }

  function renderTable() {
    clear(tbody);
    const rows = visibleItems();
    menuEmpty.hidden = rows.length > 0;
    for (const item of rows) tbody.append(renderRow(item));

    // Centang "semua" mencerminkan baris yang terlihat.
    const visibleIds = rows.map((i) => i.id);
    const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
    checkAll.checked = allChecked;
    checkAll.indeterminate = !allChecked && visibleIds.some((id) => selected.has(id));

    renderSortIndicators();
    updateBulkBar();
  }

  function renderFilterOptions() {
    const current = filterSelect.value || 'all';
    clear(filterSelect);
    const all = node('option', null, 'Semua kategori');
    all.value = 'all';
    filterSelect.append(all);
    for (const category of [...store.menu.categories].sort((a, b) => a.order - b.order)) {
      const option = node('option', null, `${category.name.id} (${store.menu.items.filter((i) => i.categoryId === category.id).length})`);
      option.value = category.id;
      filterSelect.append(option);
    }
    // Pertahankan pilihan jika kategorinya masih ada.
    filterCategory = [...filterSelect.options].some((o) => o.value === current) ? current : 'all';
    filterSelect.value = filterCategory;
  }

  function renderCategoryOptions() {
    const select = el('f-category');
    const currentVal = select.value;
    clear(select);
    for (const category of [...store.menu.categories].sort((a, b) => a.order - b.order)) {
      const option = node('option', null, category.name.id);
      option.value = category.id;
      select.append(option);
    }
    if (currentVal) select.value = currentVal;
  }

  /* ------------------------------------------------------------ ringkasan */

  function renderSummary() {
    const { items, categories, cafe } = store.menu;
    const active = items.filter((i) => i.available !== false).length;
    el('stat-items').textContent = String(items.length);
    el('stat-active').textContent = String(active);
    el('stat-inactive').textContent = String(items.length - active);
    el('stat-categories').textContent = String(categories.length);

    const note = el('updated-note');
    if (cafe?.updatedAt) {
      const when = new Date(cafe.updatedAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
      note.textContent = `Terakhir diperbarui: ${when}.`;
    } else {
      note.textContent = '';
    }
  }

  /* ------------------------------------------------------------ kategori */

  function renderCategories() {
    clear(categoryList);
    const sorted = [...store.menu.categories].sort((a, b) => a.order - b.order);
    if (sorted.length === 0) {
      categoryList.append(node('p', 'hint', 'Belum ada kategori.'));
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
      const up = iconButton('↑', { action: 'cat-up', id: category.id, title: 'Naikkan urutan' });
      const down = iconButton('↓', { action: 'cat-down', id: category.id, title: 'Turunkan urutan' });
      up.disabled = index === 0;
      down.disabled = index === sorted.length - 1;
      actions.append(up, down);
      actions.append(iconButton('Ganti nama', { action: 'cat-rename', id: category.id, className: 'btn-text' }));
      const remove = iconButton('Hapus', { action: 'cat-delete', id: category.id, className: 'btn-text btn-text--danger' });
      remove.disabled = used > 0;
      if (used > 0) remove.title = `Masih dipakai ${used} item`;
      actions.append(remove);
      row.append(actions);
      categoryList.append(row);
    });
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    pruneSelection();
    fillCafeForm();
    renderSummary();
    renderCategories();
    renderCategoryOptions();
    renderFilterOptions();
    renderTable();
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

  /* ---------------------------------------------------------- event tabel */

  searchInput.addEventListener('input', () => { searchTerm = searchInput.value; renderTable(); });
  filterSelect.addEventListener('change', () => { filterCategory = filterSelect.value; renderTable(); });

  for (const th of document.querySelectorAll('.th-sort')) {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortKey = key; sortDir = 'asc'; }
      renderTable();
    });
  }

  checkAll.addEventListener('change', () => {
    const ids = visibleItems().map((i) => i.id);
    if (checkAll.checked) ids.forEach((id) => selected.add(id));
    else ids.forEach((id) => selected.delete(id));
    renderTable();
  });

  tbody.addEventListener('change', (event) => {
    const box = event.target.closest('[data-select]');
    if (!box) return;
    if (box.checked) selected.add(box.dataset.select);
    else selected.delete(box.dataset.select);
    updateBulkBar();
    // Sinkronkan "pilih semua" tanpa merender ulang (jaga posisi scroll).
    const ids = visibleItems().map((i) => i.id);
    const allChecked = ids.length > 0 && ids.every((id) => selected.has(id));
    checkAll.checked = allChecked;
    checkAll.indeterminate = !allChecked && ids.some((id) => selected.has(id));
  });

  tbody.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const { action, id } = target.dataset;
    const item = store.menu.items.find((i) => i.id === id);
    if (!item) return;

    switch (action) {
      case 'item-edit': openForm(item); break;
      case 'item-up': await commit(mutators.moveItem(id, -1), `Naikkan urutan ${item.name.id}`); break;
      case 'item-down': await commit(mutators.moveItem(id, +1), `Turunkan urutan ${item.name.id}`); break;
      case 'toggle-available':
        await commit(mutators.setItemFlag(id, 'available', item.available === false),
          `${item.available === false ? 'Aktifkan' : 'Nonaktifkan'} ${item.name.id}`);
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

  /* ---------------------------------------------------------- bulk actions */

  bulkBar.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-bulk]');
    if (!target || target.disabled) return;
    const kind = target.dataset.bulk;
    if (kind === 'clear') { selected.clear(); renderTable(); return; }

    const ids = [...selected];
    if (ids.length === 0) return;

    if (kind === 'delete') {
      if (!confirm(`Hapus ${ids.length} item terpilih dari menu?`)) return;
      // Foto item yang akan dihapus, disapu best-effort SETELAH menu.json benar.
      const images = ids
        .map((id) => store.menu.items.find((i) => i.id === id))
        .filter(Boolean)
        .filter((i) => i.image)
        .map((i) => ({ image: i.image, label: i.name.id }));
      // Satu commit untuk semua penghapusan; removeItem aman untuk id yang sudah hilang.
      const mutate = (menu) => ids.reduce((m, id) => mutators.removeItem(id)(m), menu);
      const removed = await commit(mutate, `Hapus ${ids.length} item`, { onSuccess: () => selected.clear() });
      if (removed) for (const { image, label } of images) await deletePhotoQuietly(image, label);
      return;
    }

    // activate / deactivate: satu commit; lewati id yang sudah hilang tanpa menggagalkan sisanya.
    const value = kind === 'activate';
    const mutate = (menu) => ids.reduce((m, id) => {
      try { return mutators.setItemFlag(id, 'available', value)(m); } catch { return m; }
    }, menu);
    await commit(mutate, `${value ? 'Aktifkan' : 'Nonaktifkan'} ${ids.length} item`, {
      onSuccess: () => selected.clear(),
    });
  });

  /* ---------------------------------------------------------- event forms */

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
        setError(error, itemError);
        return false;
      }

      const withImage = { ...draft, image, id: id ?? formItemId };
      const mutate = id ? mutators.updateItem(id, withImage) : mutators.addItem(withImage);
      const saved = await writeMenu(mutate, id ? `Ubah item ${label}` : `Tambah item ${label}`, {
        onSuccess: closeForm,
        errorEl: itemError,
      });

      if (!saved && uploadedPath) {
        itemError.append(node('p', 'hint', 'Foto sudah tersimpan. Klik Simpan lagi — foto tidak akan diunggah ulang.'));
      }
      return saved;
    });
  });

  el('f-cancel').addEventListener('click', closeForm);
  el('f-close').addEventListener('click', closeForm);
  el('item-new').addEventListener('click', () => openForm());

  categoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const draft = { name: { id: el('c-name-id').value, en: el('c-name-en').value } };
    await commit(mutators.addCategory(draft), `Tambah kategori ${draft.name.id.trim()}`, {
      onSuccess: () => categoryForm.reset(),
      errorEl: categoryError,
    });
  });

  categoryList.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const { action, id } = target.dataset;
    const category = store.menu.categories.find((c) => c.id === id);
    if (!category) return;

    switch (action) {
      case 'cat-up': await commit(mutators.moveCategory(id, -1), `Naikkan kategori ${category.name.id}`, { errorEl: categoryError }); break;
      case 'cat-down': await commit(mutators.moveCategory(id, +1), `Turunkan kategori ${category.name.id}`, { errorEl: categoryError }); break;
      case 'cat-rename': {
        const nameId = prompt('Nama kategori (Indonesia)', category.name.id);
        if (nameId === null) return;
        const nameEn = prompt('Nama kategori (English, boleh kosong)', category.name.en ?? '');
        if (nameEn === null) return;
        await commit(mutators.updateCategory(id, { name: { id: nameId, en: nameEn } }),
          `Ganti nama kategori ${category.name.id}`, { errorEl: categoryError });
        break;
      }
      case 'cat-delete':
        if (!confirm(`Hapus kategori "${category.name.id}"?`)) return;
        await commit(mutators.removeCategory(id), `Hapus kategori ${category.name.id}`, { errorEl: categoryError });
        break;
      default: break;
    }
  });

  cafeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    return exclusive(async () => {
      const fields = {
        name: el('cf-name').value,
        tagline: { id: el('cf-tag-id').value, en: el('cf-tag-en').value },
        description: { id: el('cf-desc-id').value, en: el('cf-desc-en').value },
        address: { id: el('cf-address-id').value, en: el('cf-address-en').value },
      };
      return writeMenu(mutators.updateCafe(fields), 'Perbarui identitas usaha', { statusEl: cafeStatus });
    });
  });

  socialForm.addEventListener('submit', (event) => {
    event.preventDefault();
    return exclusive(async () => {
      const fields = {
        whatsapp: el('cf-whatsapp').value,
        instagram: el('cf-instagram').value,
        tiktok: el('cf-tiktok').value,
        maps: el('cf-maps').value,
      };
      return writeMenu(mutators.updateCafe(fields), 'Perbarui media sosial', { statusEl: socialStatus });
    });
  });

  /* ------------------------------------------------------------- publik */

  return {
    render,
    setStatus,
    newItem() { openForm(); },
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
      selected.clear();
      searchTerm = '';
      filterCategory = 'all';
      searchInput.value = '';
      setError(null);
      setError(null, itemError);
      setError(null, categoryError);
      setStatus('');
      clear(tbody);
      clear(categoryList);
      updateBulkBar();
    },
  };
}
