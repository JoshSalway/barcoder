import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BarcodeRenderer from '../components/BarcodeRenderer';
import BottomNav from '../components/BottomNav';
import { getStatus, FORMATS, isQR } from '../services/barcode';
import { lookupBarcode } from '../services/productLookup';
import storage from '../services/storage';

export default function CreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [digits, setDigits] = useState(searchParams.get('digits') || '');
  const [format, setFormat] = useState(searchParams.get('format') || 'auto');
  const [title, setTitle] = useState('');
  const [productId, setProductId] = useState('');
  const [aisle, setAisle] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stores, setStores] = useState(storage.getStores());
  const [selectedStore, setSelectedStore] = useState(storage.getActiveStore());
  const [newStoreName, setNewStoreName] = useState('');
  const [showAddStore, setShowAddStore] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [product, setProduct] = useState(null);
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

  // Auto-lookup product when we have a valid barcode
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
        if (result) {
          if (result.productName && !title) setTitle(result.productName);
          if (result.productId && !productId) setProductId(result.productId);
          if (result.category && !aisle) setAisle(result.category);
        }
        setLookingUp(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [bs.normalized, qr]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAddStore() {
    if (!newStoreName.trim()) return;
    const updated = storage.saveStore(newStoreName);
    setStores(updated);
    // Auto-select the newly added store
    const added = updated.find((s) => s.name.toLowerCase() === newStoreName.trim().toLowerCase());
    if (added) {
      setSelectedStore(added.id);
      storage.setActiveStore(added.id);
    }
    setNewStoreName('');
    setShowAddStore(false);
  }

  function handleStoreChange(e) {
    const val = e.target.value;
    if (val === '__add__') {
      setShowAddStore(true);
      return;
    }
    setSelectedStore(val);
    storage.setActiveStore(val);
  }

  function handleSave() {
    if (!bs.normalized) return;
    const storeName = stores.find((s) => s.id === selectedStore)?.name || '';
    storage.save({
      title: title.trim() || bs.normalized,
      digits: bs.normalized,
      format: bs.resolvedFormat || format,
      productId: productId.trim(),
      aisle: aisle.trim(),
      storeId: selectedStore,
      storeName,
      brand: product?.brand || null,
      imageUrl: product?.imageUrl || null,
      productUrl: product?.url || null,
      dataSource: product?.source || null,
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

      {lookingUp && <p className="lookup-status">Looking up product...</p>}

      {bs.normalized && !qr && product && (
        <div className="product-info">
          {product.imageUrl && (
            <img src={product.imageUrl} alt={product.productName || ''} className="product-image" />
          )}
          <div className="product-details">
            {product.productName && <span className="product-name">{product.productName}</span>}
            {product.brand && <span className="product-brand">{product.brand}</span>}
            {product.category && <span className="product-category">{product.category}</span>}
            {product.price != null && (
              <span className={`product-price${product.isOnSpecial ? ' on-special' : ''}`}>
                ${product.price.toFixed(2)}{product.isOnSpecial ? ' (On Special)' : ''}
              </span>
            )}
            <span className="product-source">via {product.source === 'woolworths' ? 'Woolworths' : 'Open Food Facts'}</span>
          </div>
        </div>
      )}

      {bs.normalized && (
        <div className="action-row">
          <button className="btn btn-secondary" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Digits'}
          </button>
        </div>
      )}

      <div className="save-section">
        <div className="input-group">
          <label htmlFor="store-select">Store</label>
          <div className="store-selector">
            <select
              id="store-select"
              value={selectedStore}
              onChange={handleStoreChange}
            >
              <option value="">No store selected</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="__add__">+ Add new store...</option>
            </select>
          </div>
          {showAddStore && (
            <div className="add-store-row">
              <input
                type="text"
                placeholder="Store name"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddStore()}
              />
              <button className="btn btn-small btn-primary" onClick={handleAddStore}>
                Add
              </button>
              <button className="btn btn-small btn-secondary" onClick={() => setShowAddStore(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="aisle-input">Aisle Number</label>
          <input
            id="aisle-input"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 5"
            value={aisle}
            onChange={(e) => setAisle(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label htmlFor="product-id-input">Product ID</label>
          <input
            id="product-id-input"
            type="text"
            placeholder="e.g. SKU-12345"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />
        </div>

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
