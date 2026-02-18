import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BarcodeRenderer from '../components/BarcodeRenderer';
import { getFormat } from '../services/barcode';
import { getWoolworthsSearchUrl } from '../services/productLookup';
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
  const isQR = formatInfo.type === 'qrcode';

  return (
    <div className="page display-page">
      <button className="back-btn" onClick={() => navigate('/list')}>
        ← Back
      </button>

      <h2 className="display-title">{item.title}</h2>
      <span className="display-format">{formatInfo.label}</span>

      {item.brand && <span className="display-brand">{item.brand}</span>}

      <div className="display-barcode">
        <BarcodeRenderer digits={item.digits} format={item.format} large />
      </div>

      <button className="btn btn-secondary btn-full" onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy Digits'}
      </button>

      {(item.url || !isQR) && (
        <div className="display-links">
          {item.url && (
            <a
              className="btn btn-secondary btn-full"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Product
            </a>
          )}
          {!isQR && (
            <a
              className="btn btn-secondary btn-full"
              href={getWoolworthsSearchUrl(item.digits)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Search Woolworths
            </a>
          )}
        </div>
      )}
    </div>
  );
}
