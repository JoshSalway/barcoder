/**
 * Product lookup service.
 *
 * Data sources (tried in order):
 * 1. Woolworths Search API — search by barcode, returns product name/image/price/category
 *    Note: CORS-blocked on localhost but works when deployed or via proxy
 * 2. Open Food Facts — free global barcode database (fallback, no CORS issues)
 */

const WOOLWORTHS_SEARCH_API = 'https://www.woolworths.com.au/apis/ui/Search/products';
const OPENFOODFACTS_API = 'https://world.openfoodfacts.org/api/v2/product';

/**
 * Parse the Woolworths "Source" field (e.g. "Aisle.Pantry.Cooking")
 * into a human-readable category path.
 */
function parseWoolworthsCategory(source) {
  if (!source) return null;
  // Source format: "Aisle.Department.Category" or similar
  const parts = source.split('.');
  // Remove the leading "Aisle" if present
  if (parts[0] === 'Aisle' && parts.length > 1) {
    return parts.slice(1).join(' > ');
  }
  return parts.join(' > ');
}

/**
 * Try Woolworths search API with a barcode as the search term.
 * Returns product info or null.
 */
async function lookupWoolworths(digits) {
  try {
    const res = await fetch(WOOLWORTHS_SEARCH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SearchTerm: digits,
        PageSize: 1,
        PageNumber: 1,
        SortType: 'TraderRelevance',
        Location: '',
        IsSpecial: false,
      }),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const products = data?.Products;
    if (!products?.length) return null;

    const p = products[0]?.Products?.[0];
    if (!p) return null;

    const stockcode = p.Stockcode;
    return {
      productName: p.Name || null,
      brand: p.Brand || null,
      imageUrl: p.MediumImageFile || p.SmallImageFile || null,
      price: p.Price || null,
      isOnSpecial: p.IsOnSpecial || false,
      packageSize: p.PackageSize || null,
      productId: stockcode ? String(stockcode) : null,
      category: parseWoolworthsCategory(p.Source),
      url: stockcode
        ? `https://www.woolworths.com.au/shop/productdetails/${stockcode}`
        : null,
      source: 'woolworths',
    };
  } catch {
    return null;
  }
}

/**
 * Try Open Food Facts as a fallback barcode lookup.
 */
async function lookupOpenFoodFacts(digits) {
  try {
    const res = await fetch(`${OPENFOODFACTS_API}/${digits}.json`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;

    // Extract category for aisle hint
    const categories = p.categories_tags || [];
    const categoryName = categories.length > 0
      ? categories[categories.length - 1].replace(/^en:/, '').replace(/-/g, ' ')
      : (p.categories || null);

    return {
      productName: p.product_name || null,
      brand: p.brands || null,
      imageUrl: p.image_front_small_url || null,
      productId: p.code || digits,
      category: categoryName,
      url: `https://world.openfoodfacts.org/product/${digits}`,
      source: 'openfoodfacts',
    };
  } catch {
    return null;
  }
}

/**
 * Look up product details by barcode digits.
 * Tries Woolworths first, falls back to Open Food Facts.
 * Returns null if product not found or network error.
 */
export async function lookupBarcode(digits) {
  if (!digits || digits.length < 8) return null;

  // Try Woolworths first (may be CORS-blocked on localhost)
  const woolworths = await lookupWoolworths(digits);
  if (woolworths) return woolworths;

  // Fallback to Open Food Facts
  const off = await lookupOpenFoodFacts(digits);
  if (off) return off;

  return null;
}
