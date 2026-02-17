const STORAGE_KEY = 'barcode_items';

function getAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save(item) {
  const items = getAll();
  const existing = items.findIndex((i) => i.id === item.id);
  if (existing >= 0) {
    items[existing] = { ...items[existing], ...item };
  } else {
    items.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ...item,
      createdAt: Date.now(),
    });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

function remove(id) {
  const items = getAll().filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

function search(query) {
  const q = query.toLowerCase().trim();
  if (!q) return getAll();
  return getAll().filter(
    (i) => i.title.toLowerCase().includes(q) || i.digits.includes(q)
  );
}

export default { getAll, save, remove, search };
