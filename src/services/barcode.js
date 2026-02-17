/**
 * All supported formats, grouped for the UI.
 * `type` is either 'jsbarcode' or 'qrcode' to pick the right renderer.
 */
export const FORMATS = [
  { value: 'auto',        label: 'Auto-detect',    type: 'jsbarcode' },
  // 2D
  { value: 'QR',          label: 'QR Code',         type: 'qrcode' },
  // EAN / UPC family
  { value: 'EAN13',       label: 'EAN-13',          type: 'jsbarcode' },
  { value: 'EAN8',        label: 'EAN-8',           type: 'jsbarcode' },
  { value: 'EAN5',        label: 'EAN-5',           type: 'jsbarcode' },
  { value: 'EAN2',        label: 'EAN-2',           type: 'jsbarcode' },
  { value: 'UPC',         label: 'UPC-A',           type: 'jsbarcode' },
  { value: 'UPCE',        label: 'UPC-E',           type: 'jsbarcode' },
  // Code family
  { value: 'CODE128',     label: 'Code 128',        type: 'jsbarcode' },
  { value: 'CODE128A',    label: 'Code 128 A',      type: 'jsbarcode' },
  { value: 'CODE128B',    label: 'Code 128 B',      type: 'jsbarcode' },
  { value: 'CODE128C',    label: 'Code 128 C',      type: 'jsbarcode' },
  { value: 'CODE39',      label: 'Code 39',         type: 'jsbarcode' },
  { value: 'CODE93',      label: 'Code 93',         type: 'jsbarcode' },
  // ITF
  { value: 'ITF14',       label: 'ITF-14',          type: 'jsbarcode' },
  { value: 'ITF',         label: 'ITF (Interleaved 2 of 5)', type: 'jsbarcode' },
  // MSI
  { value: 'MSI',         label: 'MSI',             type: 'jsbarcode' },
  { value: 'MSI10',       label: 'MSI Mod 10',      type: 'jsbarcode' },
  { value: 'MSI11',       label: 'MSI Mod 11',      type: 'jsbarcode' },
  { value: 'MSI1010',     label: 'MSI Mod 10/10',   type: 'jsbarcode' },
  { value: 'MSI1110',     label: 'MSI Mod 11/10',   type: 'jsbarcode' },
  // Others
  { value: 'pharmacode',  label: 'Pharmacode',      type: 'jsbarcode' },
  { value: 'codabar',     label: 'Codabar',         type: 'jsbarcode' },
];

/** Look up a format entry by value. */
export function getFormat(value) {
  return FORMATS.find((f) => f.value === value) || FORMATS[0];
}

/** Is this format a QR code? */
export function isQR(format) {
  return getFormat(format).type === 'qrcode';
}

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
 * Calculate EAN-8 check digit from 7 digits.
 */
export function calcEAN8CheckDigit(digits7) {
  if (digits7.length !== 7 || !/^\d{7}$/.test(digits7)) return null;
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += parseInt(digits7[i], 10) * (i % 2 === 0 ? 3 : 1);
  }
  const check = (10 - (sum % 10)) % 10;
  return check.toString();
}

/**
 * Calculate UPC-A check digit from 11 digits.
 */
export function calcUPCACheckDigit(digits11) {
  if (digits11.length !== 11 || !/^\d{11}$/.test(digits11)) return null;
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += parseInt(digits11[i], 10) * (i % 2 === 0 ? 3 : 1);
  }
  const check = (10 - (sum % 10)) % 10;
  return check.toString();
}

/**
 * Determine the JsBarcode format string from our format enum.
 * If 'auto', pick based on digit length.
 */
export function resolveFormat(digits, format) {
  if (format && format !== 'auto') return format;

  // Auto-detect from content
  if (/^\d{13}$/.test(digits)) return 'EAN13';
  if (/^\d{12}$/.test(digits)) return 'UPC';
  if (/^\d{8}$/.test(digits)) return 'EAN8';
  return 'CODE128';
}

/**
 * Validates rawDigits against format, auto-appends check digits where the
 * user is one digit short, and returns a structured result for the UI.
 *
 * Returns:
 *   {
 *     normalized:     string | null  — null means "do not render"
 *     resolvedFormat: string | null
 *     status:         string         — informational message (grey)
 *     error:          string | null  — validation error (red)
 *   }
 *
 * Formats with explicit validation: EAN13, UPC (UPC-A), EAN8.
 * All other explicit formats are passed through without validation.
 * Auto mode validates check digits for length-matched EAN/UPC inputs.
 */
export function getStatus(rawDigits, format) {
  const digits = rawDigits.trim();
  if (!digits) return { normalized: null, resolvedFormat: null, status: '', error: null };

  const onlyDigits = /^\d+$/.test(digits);

  function isValidCheck(fmt, full) {
    const payloadLen = { EAN13: 12, EAN8: 7, UPC: 11 }[fmt];
    if (!payloadLen || full.length !== payloadLen + 1) return false;
    let expected;
    if (fmt === 'EAN13') expected = calcEAN13CheckDigit(full.slice(0, 12));
    else if (fmt === 'EAN8') expected = calcEAN8CheckDigit(full.slice(0, 7));
    else expected = calcUPCACheckDigit(full.slice(0, 11));
    return expected === full[payloadLen];
  }

  // ── Auto ────────────────────────────────────────────────────────────────
  if (format === 'auto') {
    if (onlyDigits) {
      if (digits.length === 13) {
        return isValidCheck('EAN13', digits)
          ? { normalized: digits, resolvedFormat: 'EAN13', status: 'Auto: detected EAN-13 (valid)', error: null }
          : { normalized: null,   resolvedFormat: 'EAN13', status: '', error: 'EAN-13: invalid check digit' };
      }
      if (digits.length === 12) {
        return isValidCheck('UPC', digits)
          ? { normalized: digits, resolvedFormat: 'UPC', status: 'Auto: detected UPC-A (valid)', error: null }
          : { normalized: null,   resolvedFormat: 'UPC', status: '',
              error: 'UPC-A: invalid check digit — select EAN-13 to auto-add a check digit' };
      }
      if (digits.length === 8) {
        return isValidCheck('EAN8', digits)
          ? { normalized: digits, resolvedFormat: 'EAN8', status: 'Auto: detected EAN-8 (valid)', error: null }
          : { normalized: null,   resolvedFormat: 'EAN8', status: '', error: 'EAN-8: invalid check digit' };
      }
      if (digits.length === 14)
        return { normalized: digits, resolvedFormat: 'ITF14', status: 'Auto: detected ITF-14', error: null };
    }
    // Partial numeric, alpha, or any other length → Code 128
    return { normalized: digits, resolvedFormat: 'CODE128', status: 'Auto: Code 128', error: null };
  }

  // ── EAN-13 ──────────────────────────────────────────────────────────────
  if (format === 'EAN13') {
    if (!onlyDigits)
      return { normalized: null, resolvedFormat: 'EAN13', status: '', error: 'EAN-13: digits only' };
    if (digits.length === 12) {
      const check = calcEAN13CheckDigit(digits);
      return { normalized: digits + check, resolvedFormat: 'EAN13',
               status: `EAN-13: added check digit ${check}`, error: null };
    }
    if (digits.length === 13) {
      return isValidCheck('EAN13', digits)
        ? { normalized: digits, resolvedFormat: 'EAN13', status: 'EAN-13: valid', error: null }
        : { normalized: null,   resolvedFormat: 'EAN13', status: '', error: 'EAN-13: invalid check digit' };
    }
    if (digits.length > 13)
      return { normalized: null, resolvedFormat: 'EAN13', status: '', error: 'EAN-13: too many digits (max 13)' };
    return { normalized: null, resolvedFormat: 'EAN13',
             status: 'EAN-13: enter 12 digits (check digit auto-added) or 13', error: null };
  }

  // ── UPC-A ───────────────────────────────────────────────────────────────
  if (format === 'UPC') {
    if (!onlyDigits)
      return { normalized: null, resolvedFormat: 'UPC', status: '', error: 'UPC-A: digits only' };
    if (digits.length === 11) {
      const check = calcUPCACheckDigit(digits);
      return { normalized: digits + check, resolvedFormat: 'UPC',
               status: `UPC-A: added check digit ${check}`, error: null };
    }
    if (digits.length === 12) {
      return isValidCheck('UPC', digits)
        ? { normalized: digits, resolvedFormat: 'UPC', status: 'UPC-A: valid', error: null }
        : { normalized: null,   resolvedFormat: 'UPC', status: '', error: 'UPC-A: invalid check digit' };
    }
    if (digits.length > 12)
      return { normalized: null, resolvedFormat: 'UPC', status: '', error: 'UPC-A: too many digits (max 12)' };
    return { normalized: null, resolvedFormat: 'UPC',
             status: 'UPC-A: enter 11 digits (check digit auto-added) or 12', error: null };
  }

  // ── EAN-8 ───────────────────────────────────────────────────────────────
  if (format === 'EAN8') {
    if (!onlyDigits)
      return { normalized: null, resolvedFormat: 'EAN8', status: '', error: 'EAN-8: digits only' };
    if (digits.length === 7) {
      const check = calcEAN8CheckDigit(digits);
      return { normalized: digits + check, resolvedFormat: 'EAN8',
               status: `EAN-8: added check digit ${check}`, error: null };
    }
    if (digits.length === 8) {
      return isValidCheck('EAN8', digits)
        ? { normalized: digits, resolvedFormat: 'EAN8', status: 'EAN-8: valid', error: null }
        : { normalized: null,   resolvedFormat: 'EAN8', status: '', error: 'EAN-8: invalid check digit' };
    }
    if (digits.length > 8)
      return { normalized: null, resolvedFormat: 'EAN8', status: '', error: 'EAN-8: too many digits (max 8)' };
    return { normalized: null, resolvedFormat: 'EAN8',
             status: 'EAN-8: enter 7 digits (check digit auto-added) or 8', error: null };
  }

  // ── All other explicit formats (Code128, Code39, ITF-14, QR, …) ─────────
  return { normalized: digits, resolvedFormat: format, status: '', error: null };
}

/**
 * Shift a barcode by `delta` steps in the numeric sequence.
 * For EAN/UPC formats the payload (all digits except the check digit) is
 * incremented and the check digit is recalculated automatically.
 * For other purely-numeric formats the whole string is treated as the number.
 * Returns null when the shift is not applicable or would overflow/underflow.
 */
function _shiftSequence(digits, format, delta) {
  const resolved = resolveFormat(digits, format);

  if (resolved === 'EAN13' && /^\d{13}$/.test(digits)) {
    const next = BigInt(digits.slice(0, 12)) + delta;
    if (next < 0n) return null;
    const nextStr = next.toString().padStart(12, '0');
    if (nextStr.length !== 12) return null;
    const check = calcEAN13CheckDigit(nextStr);
    return check !== null ? nextStr + check : null;
  }

  if (resolved === 'EAN8' && /^\d{8}$/.test(digits)) {
    const next = BigInt(digits.slice(0, 7)) + delta;
    if (next < 0n) return null;
    const nextStr = next.toString().padStart(7, '0');
    if (nextStr.length !== 7) return null;
    const check = calcEAN8CheckDigit(nextStr);
    return check !== null ? nextStr + check : null;
  }

  if (resolved === 'UPC' && /^\d{12}$/.test(digits)) {
    const next = BigInt(digits.slice(0, 11)) + delta;
    if (next < 0n) return null;
    const nextStr = next.toString().padStart(11, '0');
    if (nextStr.length !== 11) return null;
    const check = calcUPCACheckDigit(nextStr);
    return check !== null ? nextStr + check : null;
  }

  if (/^\d+$/.test(digits)) {
    const next = BigInt(digits) + delta;
    if (next < 0n) return null;
    const nextStr = next.toString().padStart(digits.length, '0');
    if (nextStr.length > digits.length) return null; // overflow
    return nextStr;
  }

  return null;
}

/**
 * Returns the next barcode in the numeric sequence.
 * For EAN/UPC the check digit is recalculated automatically.
 * Returns null if not applicable.
 */
export function nextInSequence(digits, format) {
  return _shiftSequence(digits, format, 1n);
}

/**
 * Returns the previous barcode in the numeric sequence.
 * Returns null if not applicable or would go below zero.
 */
export function prevInSequence(digits, format) {
  return _shiftSequence(digits, format, -1n);
}

/**
 * Normalize digits: auto-append check digits for EAN/UPC when the user
 * types one digit short.
 */
export function normalizeDigits(digits, format) {
  const resolved = resolveFormat(digits, format);

  // EAN-13: 12 digits → add check digit
  if (resolved === 'EAN13' && digits.length === 12 && /^\d{12}$/.test(digits)) {
    return digits + calcEAN13CheckDigit(digits);
  }
  // EAN-8: 7 digits → add check digit
  if (resolved === 'EAN8' && digits.length === 7 && /^\d{7}$/.test(digits)) {
    return digits + calcEAN8CheckDigit(digits);
  }
  // UPC-A: 11 digits → add check digit
  if (resolved === 'UPC' && digits.length === 11 && /^\d{11}$/.test(digits)) {
    return digits + calcUPCACheckDigit(digits);
  }

  return digits;
}
