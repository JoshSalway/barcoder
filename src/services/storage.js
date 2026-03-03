import { nextInSequence } from './barcode.js';

const STORAGE_KEY = 'barcode_items';
const STORES_KEY = 'barcode_stores';
const ACTIVE_STORE_KEY = 'barcode_active_store';

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
    (i) =>
      i.title.toLowerCase().includes(q) ||
      i.digits.includes(q) ||
      (i.productId && i.productId.toLowerCase().includes(q)) ||
      (i.aisle && i.aisle.toLowerCase().includes(q))
  );
}

// --- Store management ---

function getStores() {
  try {
    return JSON.parse(localStorage.getItem(STORES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveStore(name) {
  const stores = getStores();
  const trimmed = name.trim();
  if (!trimmed) return stores;
  // Avoid duplicates
  if (stores.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return stores;
  stores.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: trimmed,
  });
  localStorage.setItem(STORES_KEY, JSON.stringify(stores));
  return stores;
}

function removeStore(id) {
  const stores = getStores().filter((s) => s.id !== id);
  localStorage.setItem(STORES_KEY, JSON.stringify(stores));
  // Clear active store if it was the removed one
  if (getActiveStore() === id) {
    setActiveStore('');
  }
  return stores;
}

function getActiveStore() {
  return localStorage.getItem(ACTIVE_STORE_KEY) || '';
}

function setActiveStore(storeId) {
  localStorage.setItem(ACTIVE_STORE_KEY, storeId);
}

/**
 * Finds barcodes that appear to be missing from numeric sequences in saved items.
 *
 * Groups saved barcodes by format + digit length (a proxy for "same series").
 * Within each group, any number between the saved minimum and maximum that is
 * absent is reported as a gap.  Groups whose range exceeds 500 are skipped to
 * avoid producing enormous gap lists.
 *
 * Returns an array of { digits, format } objects for each missing barcode.
 */
function findSequenceGaps() {
  const items = getAll().filter((i) => /^\d+$/.test(i.digits));
  if (items.length < 2) return [];

  // Group by format + digit length
  const groups = new Map();
  for (const item of items) {
    const key = `${item.format}|${item.digits.length}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const gaps = [];

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    // Sort numerically
    group.sort((a, b) => (BigInt(a.digits) < BigInt(b.digits) ? -1 : 1));

    const saved = new Set(group.map((i) => i.digits));
    const maxVal = BigInt(group[group.length - 1].digits);
    const minVal = BigInt(group[0].digits);

    if (maxVal - minVal > 500n) continue; // skip unreasonably large ranges

    // Walk forward from the minimum using nextInSequence; collect missing entries
    let current = group[0].digits;
    const format = group[0].format;

    for (;;) {
      const next = nextInSequence(current, format);
      if (!next) break;
      if (BigInt(next) > maxVal) break;
      if (!saved.has(next)) {
        gaps.push({ digits: next, format });
      }
      current = next;
    }
  }

  return gaps;
}

export default {
  getAll, save, remove, search, findSequenceGaps,
  getStores, saveStore, removeStore, getActiveStore, setActiveStore,
};
