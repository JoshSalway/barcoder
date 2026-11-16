import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import BarcodeRenderer from '../components/BarcodeRenderer';
import BottomNav from '../components/BottomNav';
import { getStatus, FORMATS, isQR } from '../services/barcode';
import storage from '../services/storage';
import { downloadBarcodePng } from '../services/download';

// In auto mode, switch the dropdown to a specifically detected format
// (not the CODE128 catch-all) so the user sees what was recognised.
const DETECTED_FORMATS = new Set(['EAN13', 'EAN8', 'UPC', 'ITF14']);
function pickFormat(digits, format) {
  if (format !== 'auto') return format;
  const s = getStatus(digits, 'auto');
  return s.normalized && DETECTED_FORMATS.has(s.resolvedFormat) ? s.resolvedFormat : 'auto';
}

export default function CreatePage() {
  const [searchParams] = useSearchParams();
  const [digits, setDigits] = useState(searchParams.get('digits') || '');
  const [format, setFormat] = useState(() => pickFormat(searchParams.get('digits') || '', searchParams.get('format') || 'auto'));
  const previewRef = useRef(null);
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const bs = getStatus(digits, format);
  const qr = isQR(format);

  function handleSave() {
    if (!bs.normalized) return;
    storage.save({
      title: title.trim() || bs.normalized,
      digits: bs.normalized,
      format: bs.resolvedFormat || format,
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
            setFormat(pickFormat(e.target.value, 'auto'));
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
          onChange={(e) => setFormat(pickFormat(digits, e.target.value))}
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
        <div className="barcode-preview" ref={previewRef}>
          <BarcodeRenderer digits={bs.normalized} format={bs.resolvedFormat || format} />
        </div>
      )}

      {bs.normalized && (
        <div className="action-row">
          <button className="btn btn-secondary" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Digits'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => downloadBarcodePng(previewRef.current, title.trim() || bs.normalized, qr ? '' : bs.normalized)}
          >
            Download PNG
          </button>
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
