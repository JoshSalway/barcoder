import { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import BarcodeRenderer from '../components/BarcodeRenderer';
import { getFormat, isQR } from '../services/barcode';
import storage from '../services/storage';
import { downloadBarcodePng } from '../services/download';

export default function DisplayPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const barcodeRef = useRef(null);
  const item = storage.getAll().find((i) => i.id === id);

  function handleCopy() {
    if (!item) return;
    navigator.clipboard.writeText(item.digits).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!item) return <Navigate to="/list" replace />;

  const formatInfo = getFormat(item.format);

  return (
    <div className="page display-page">
      <button className="back-btn" onClick={() => navigate('/list')}>
        ← Back
      </button>

      <h2 className="display-title">{item.title}</h2>
      <span className="display-format">{formatInfo.label}</span>

      <div className="display-barcode" ref={barcodeRef}>
        <BarcodeRenderer digits={item.digits} format={item.format} large />
      </div>

      <button className="btn btn-secondary btn-full" onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy Digits'}
      </button>
      <button
        className="btn btn-secondary btn-full"
        style={{ marginTop: '0.75rem' }}
        onClick={() => downloadBarcodePng(barcodeRef.current, item.title, isQR(item.format) ? '' : item.digits)}
      >
        Download PNG
      </button>
    </div>
  );
}
