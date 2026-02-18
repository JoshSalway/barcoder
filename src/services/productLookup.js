/**
 * Product lookup service.
 *
 * Data sources (tried in order):
 * 1. Woolworths Search API — search by barcode, returns product name/image/stockcode
 * 2. Woolworths Product Detail API — rich data by stockcode (used when URL pasted)
 * 3. Open Food Facts — free global barcode database (fallback)
 *
 * Woolworths product pages also publish JSON-LD structured data with gtin/name/brand/price,
 * which we parse when a user pastes a Woolworths product URL.
 */

const WOOLWORTHS_SEARCH_API = 'https://www.woolworths.com.au/apis/ui/Search/products';
const WOOLWORTHS_DETAIL_API = 'https://www.woolworths.com.au/apis/ui/product/detail';
const WOOLWORTHS_SEARCH_URL = 'https://www.woolworths.com.au/shop/search/products?searchTerm=';
const OPENFOODFACTS_API = 'https://world.openfoodfacts.org/api/v2/product';

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
      woolworthsUrl: stockcode
        ? `https://www.woolworths.com.au/shop/productdetails/${stockcode}`
        : null,
      stockcode: stockcode || null,
      source: 'woolworths',
    };
  } catch {
    return null;
  }
}

/**
 * Look up a Woolworths product by stockcode (parsed from a product URL).
 * Returns rich product data or null.
 */
async function lookupWoolworthsByStockcode(stockcode) {
  try {
    const res = await fetch(`${WOOLWORTHS_DETAIL_API}/${stockcode}`);
    if (!res.ok) return null;

    const p = await res.json();
    if (!p?.Product) return null;

    const prod = p.Product;
    return {
      productName: prod.Name || null,
      brand: prod.Brand || null,
      imageUrl: prod.MediumImageFile || prod.SmallImageFile || null,
      barcode: prod.Barcode || null,
      price: prod.Price || null,
      isOnSpecial: prod.IsOnSpecial || false,
      packageSize: prod.PackageSize || null,
      woolworthsUrl: `https://www.woolworths.com.au/shop/productdetails/${stockcode}`,
      stockcode: String(stockcode),
      source: 'woolworths-detail',
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
    return {
      productName: p.product_name || null,
      brand: p.brands || null,
      imageUrl: p.image_front_small_url || null,
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

  // Try Woolworths first (primary use case)
  const woolworths = await lookupWoolworths(digits);
  if (woolworths) {
    return {
      ...woolworths,
      url: woolworths.woolworthsUrl,
    };
  }

  // Fallback to Open Food Facts
  const off = await lookupOpenFoodFacts(digits);
  if (off) return off;

  return null;
}

/**
 * Parse a Woolworths product URL and look up the product by stockcode.
 * Supports URLs like: woolworths.com.au/shop/productdetails/123456
 * Returns product info with barcode, or null.
 */
export async function lookupFromWoolworthsUrl(url) {
  const match = url.match(/productdetails\/(\d+)/);
  if (!match) return null;
  return lookupWoolworthsByStockcode(match[1]);
}

/**
 * Get a Woolworths search URL for a barcode (opens their site to search).
 */
export function getWoolworthsSearchUrl(digits) {
  return `${WOOLWORTHS_SEARCH_URL}${encodeURIComponent(digits)}`;
}
