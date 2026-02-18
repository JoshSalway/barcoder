import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BarcodeRenderer from '../components/BarcodeRenderer';
import BottomNav from '../components/BottomNav';
import { getStatus, FORMATS, isQR, nextInSequence, prevInSequence } from '../services/barcode';
import { lookupBarcode, lookupFromWoolworthsUrl, getWoolworthsSearchUrl } from '../services/productLookup';
import storage from '../services/storage';

export default function CreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [digits, setDigits] = useState(searchParams.get('digits') || '');
  const [format, setFormat] = useState(searchParams.get('format') || 'auto');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [product, setProduct] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const lookupRef = useRef(null);

  const bs = getStatus(digits, format);
  const qr = isQR(format);

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
        if (result?.url && !url) {
          setUrl(result.url);
        }
        setLookingUp(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [bs.normalized, qr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Woolworths URL paste — extract barcode from product page
  async function handleUrlChange(newUrl) {
    setUrl(newUrl);
    if (newUrl.includes('woolworths.com.au/shop/productdetails/')) {
      setLookingUp(true);
      const result = await lookupFromWoolworthsUrl(newUrl);
      if (result) {
        setProduct(result);
        if (result.productName && !title) setTitle(result.productName);
        if (result.barcode && !digits) {
          setDigits(result.barcode);
        }
      }
      setLookingUp(false);
    }
  }

  function handleSave() {
    if (!bs.normalized) return;
    storage.save({
      title: title.trim() || bs.normalized,
      digits: bs.normalized,
      format: bs.resolvedFormat || format,
      url: url.trim() || null,
      productName: product?.productName || null,
      brand: product?.brand || null,
      imageUrl: product?.imageUrl || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function goToSequence(seqDigits) {
    setDigits(seqDigits);
    setTitle('');
    setUrl('');
    setProduct(null);
    setSaved(false);
    lookupRef.current = null;
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

      {bs.normalized && !qr && (() => {
        const seqPrev = /^\d+$/.test(bs.normalized) ? prevInSequence(bs.normalized, bs.resolvedFormat || format) : null;
        const seqNext = /^\d+$/.test(bs.normalized) ? nextInSequence(bs.normalized, bs.resolvedFormat || format) : null;
        if (!seqPrev && !seqNext) return null;
        const savedSet = new Set(storage.getAll().map((i) => i.digits));
        return (
          <div className="seq-nav">
            {seqPrev && (
              <button
                className={`btn btn-small seq-btn${savedSet.has(seqPrev) ? ' seq-saved' : ''}`}
                onClick={() => goToSequence(seqPrev)}
              >
                ← {seqPrev}{savedSet.has(seqPrev) ? ' (saved)' : ''}
              </button>
            )}
            {seqNext && (
              <button
                className={`btn btn-small seq-btn${savedSet.has(seqNext) ? ' seq-saved' : ' seq-missing'}`}
                onClick={() => goToSequence(seqNext)}
              >
                {seqNext} →{savedSet.has(seqNext) ? ' (saved)' : ' (missing)'}
              </button>
            )}
          </div>
        );
      })()}

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
        <div className="input-group">
          <label htmlFor="url-input">Product URL (optional — paste Woolworths link to auto-fill)</label>
          <input
            id="url-input"
            type="url"
            placeholder="https://woolworths.com.au/shop/productdetails/..."
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
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
