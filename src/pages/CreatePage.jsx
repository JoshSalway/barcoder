import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BarcodeRenderer from '../components/BarcodeRenderer';
import BottomNav from '../components/BottomNav';
import { getStatus, FORMATS, isQR } from '../services/barcode';
import { lookupBarcode, getWoolworthsSearchUrl } from '../services/productLookup';
import storage from '../services/storage';

export default function CreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [digits, setDigits] = useState(searchParams.get('digits') || '');
  const [format, setFormat] = useState(searchParams.get('format') || 'auto');
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [product, setProduct] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const lookupRef = useRef(null);

  const bs = getStatus(digits, format);
  const qr = isQR(format);

  // Auto-switch dropdown to detected format when in auto mode
  // Only switch for specifically detected formats (not the CODE128 catch-all)
  const DETECTED_FORMATS = new Set(['EAN13', 'EAN8', 'UPC', 'ITF14']);
  useEffect(() => {
    if (format === 'auto' && bs.resolvedFormat && bs.normalized && DETECTED_FORMATS.has(bs.resolvedFormat)) {
      setFormat(bs.resolvedFormat);
    }
  }, [bs.resolvedFormat, bs.normalized, format]);

  // Auto-lookup product when we have a valid normalized barcode
  useEffect(() => {
    if (!bs.normalized || qr) {
      setProduct(null);
      return;
    }

    const normalizedDigits = bs.normalized;
    if (lookupRef.current === normalizedDigits) return;

    const timeout = setTimeout(async () => {
      lookupRef.current = normalizedDigits;
      setLookingUp(true);
      const result = await lookupBarcode(normalizedDigits);
      if (lookupRef.current === normalizedDigits) {
        setProduct(result);
        if (result?.productName && !title) {
          setTitle(result.productName);
        }
        setLookingUp(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [bs.normalized, qr]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    if (!bs.normalized) return;
    storage.save({
      title: title.trim() || bs.normalized,
      digits: bs.normalized,
      format: bs.resolvedFormat || format,
      url: product?.url || product?.woolworthsUrl || null,
      productName: product?.productName || null,
      brand: product?.brand || null,
      imageUrl: product?.imageUrl || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleCopy() {
    if (!bs.normalized) return;
    navigator.clipboard.writeText(bs.normalized).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="page create-page">
      <h1>Create Barcode</h1>

      <div className="input-group">
        <label htmlFor="digits-input">{qr ? 'Content' : 'Digits'}</label>
        <input
          id="digits-input"
          type="text"
          inputMode={qr ? 'text' : 'numeric'}
          placeholder={qr ? 'Enter text or URL' : 'Enter barcode digits'}
          value={digits}
          onChange={(e) => {
            setDigits(e.target.value);
            setFormat('auto');
            setSaved(false);
          }}
          autoFocus
        />
      </div>

      <div className="input-group">
        <label htmlFor="format-select">Format</label>
        <select
          id="format-select"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {digits && (bs.error
        ? <p className="status-bar status-error">{bs.error}</p>
        : bs.status
          ? <p className="status-bar status-ok">{bs.status}</p>
          : null
      )}

      {bs.normalized && (
        <div className="barcode-preview">
          <BarcodeRenderer digits={bs.normalized} format={bs.resolvedFormat || format} />
        </div>
      )}

      {bs.normalized && !qr && product && (
        <div className="product-info">
          {product.imageUrl && (
            <img src={product.imageUrl} alt={product.productName || ''} className="product-image" />
          )}
          <div className="product-details">
            {product.productName && <span className="product-name">{product.productName}</span>}
            {product.brand && <span className="product-brand">{product.brand}</span>}
            {product.packageSize && <span className="product-meta">{product.packageSize}</span>}
            {product.price != null && (
              <span className={`product-price${product.isOnSpecial ? ' on-special' : ''}`}>
                ${product.price.toFixed(2)}{product.isOnSpecial ? ' (On Special)' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {lookingUp && <p className="lookup-status">Looking up product...</p>}

      {bs.normalized && (
        <div className="action-row">
          <button className="btn btn-secondary" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Digits'}
          </button>
          {bs.normalized && !qr && (
            <a
              className="btn btn-secondary"
              href={getWoolworthsSearchUrl(bs.normalized)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Woolworths
            </a>
          )}
        </div>
      )}

      <div className="save-section">
        <div className="input-group">
          <label htmlFor="title-input">Title (optional)</label>
          <input
            id="title-input"
            type="text"
            placeholder="e.g. Loyalty Card"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary btn-full"
          onClick={handleSave}
          disabled={!bs.normalized}
        >
          {saved ? 'Saved!' : 'Save Barcode'}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
