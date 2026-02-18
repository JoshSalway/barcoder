/**
 * Product lookup service using Open Food Facts API (free, no key required).
 * Returns product info for EAN/UPC barcodes found in their food product database.
 */

const OPENFOODFACTS_API = 'https://world.openfoodfacts.org/api/v2/product';
const WOOLWORTHS_SEARCH = 'https://www.woolworths.com.au/shop/search/products?searchTerm=';

/**
 * Look up product details by barcode digits.
 * Returns null if product not found or network error.
 */
export async function lookupBarcode(digits) {
  if (!digits || digits.length < 8) return null;

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
    };
  } catch {
    return null;
  }
}

/**
 * Get a Woolworths search URL for a barcode (opens their site to search).
 */
export function getWoolworthsSearchUrl(digits) {
  return `${WOOLWORTHS_SEARCH}${encodeURIComponent(digits)}`;
}
