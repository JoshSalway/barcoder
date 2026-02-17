/**
 * Calculate EAN-13 check digit from 12 digits.
 */
export function calcEAN13CheckDigit(digits12) {
  if (digits12.length !== 12 || !/^\d{12}$/.test(digits12)) return null;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits12[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check.toString();
}

/**
 * Determine the JsBarcode format string from our format enum.
 * If 'auto', pick based on digit length.
 */
export function resolveFormat(digits, format) {
  if (format === 'EAN13' || format === 'ean13') return 'EAN13';
  if (format === 'CODE128' || format === 'code128') return 'CODE128';

  // auto
  if (/^\d{13}$/.test(digits)) return 'EAN13';
  if (/^\d{12}$/.test(digits)) return 'EAN13'; // will need check digit added
  return 'CODE128';
}

/**
 * Normalize digits: if user typed 12 digits and format resolves to EAN-13,
 * auto-append check digit.
 */
export function normalizeDigits(digits, format) {
  const resolved = resolveFormat(digits, format);
  if (resolved === 'EAN13' && digits.length === 12 && /^\d{12}$/.test(digits)) {
    return digits + calcEAN13CheckDigit(digits);
  }
  return digits;
}
