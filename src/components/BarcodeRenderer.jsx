import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { resolveFormat, normalizeDigits } from '../services/barcode';

export default function BarcodeRenderer({ digits, format = 'auto', large = false }) {
  const svgRef = useRef(null);
  const normalized = normalizeDigits(digits, format);
  const resolvedFormat = resolveFormat(normalized, format);

  useEffect(() => {
    if (!svgRef.current || !normalized) return;
    try {
      JsBarcode(svgRef.current, normalized, {
        format: resolvedFormat,
        width: large ? 3 : 2,
        height: large ? 160 : 100,
        displayValue: false,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // Invalid barcode data - clear the SVG
      if (svgRef.current) {
        svgRef.current.innerHTML = '';
      }
    }
  }, [normalized, resolvedFormat, large]);

  if (!digits) return null;

  return (
    <div className={`barcode-render ${large ? 'barcode-large' : ''}`}>
      <svg ref={svgRef} />
      <div className={`barcode-digits ${large ? 'digits-large' : ''}`}>
        {normalized}
      </div>
    </div>
  );
}
