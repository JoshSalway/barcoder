import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { resolveFormat, normalizeDigits, isQR } from '../services/barcode';

export default function BarcodeRenderer({ digits, format = 'auto', large = false }) {
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const qr = isQR(format);
  const normalized = normalizeDigits(digits, format);
  const resolvedFormat = resolveFormat(normalized, format);

  // 1D barcode via JsBarcode
  useEffect(() => {
    if (qr || !svgRef.current || !normalized) return;
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
      if (svgRef.current) svgRef.current.innerHTML = '';
    }
  }, [normalized, resolvedFormat, large, qr]);

  // QR code via qrcode library
  useEffect(() => {
    if (!qr || !canvasRef.current || !normalized) return;
    QRCode.toCanvas(canvasRef.current, normalized, {
      width: large ? 280 : 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(() => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    });
  }, [normalized, large, qr]);

  if (!digits) return null;

  return (
    <div className={`barcode-render ${large ? 'barcode-large' : ''}`}>
      {qr ? (
        <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
      ) : (
        <svg ref={svgRef} />
      )}
      <div className={`barcode-digits ${large ? 'digits-large' : ''}`}>
        {normalized}
      </div>
    </div>
  );
}
