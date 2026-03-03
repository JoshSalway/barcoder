import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BarcodeRenderer from '../components/BarcodeRenderer';
import { getFormat } from '../services/barcode';
import storage from '../services/storage';

export default function DisplayPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const all = storage.getAll();
    const found = all.find((i) => i.id === id);
    if (found) {
      setItem(found);
    } else {
      navigate('/list');
    }
  }, [id, navigate]);

  function handleCopy() {
    if (!item) return;
    navigator.clipboard.writeText(item.digits).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!item) return null;

  const formatInfo = getFormat(item.format);

  return (
    <div className="page display-page">
      <button className="back-btn" onClick={() => navigate('/list')}>
        ← Back
      </button>

      <h2 className="display-title">{item.title}</h2>
      <span className="display-format">{formatInfo.label}</span>

      {item.brand && <span className="display-brand">{item.brand}</span>}

      {(item.storeName || item.aisle || item.productId) && (
        <div className="display-info">
          {item.productId && (
            <div className="display-info-row">
              <span className="display-info-label">Product ID</span>
              <span className="display-info-value">{item.productId}</span>
            </div>
          )}
          {item.storeName && (
            <div className="display-info-row">
              <span className="display-info-label">Store</span>
              <span className="display-info-value">{item.storeName}</span>
            </div>
          )}
          {item.aisle && (
            <div className="display-info-row">
              <span className="display-info-label">Aisle</span>
              <span className="display-info-value">{item.aisle}</span>
            </div>
          )}
        </div>
      )}

      <div className="display-barcode">
        <BarcodeRenderer digits={item.digits} format={item.format} large />
      </div>

      <button className="btn btn-secondary btn-full" onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy Digits'}
      </button>

      {item.productUrl && (
        <a
          className="btn btn-secondary btn-full"
          href={item.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginTop: '0.5rem' }}
        >
          View Product
        </a>
      )}
    </div>
  );
}
