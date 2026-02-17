import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BarcodeRenderer from '../components/BarcodeRenderer';
import { getStatus, FORMATS, isQR, nextInSequence, prevInSequence } from '../services/barcode';
import storage from '../services/storage';

export default function CreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [digits, setDigits] = useState(searchParams.get('digits') || '');
  const [format, setFormat] = useState(searchParams.get('format') || 'auto');
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const bs = getStatus(digits, format); // { normalized, resolvedFormat, status, error }
  const qr = isQR(format);

  function handleSave() {
    if (!bs.normalized) return;
    storage.save({ title: title.trim() || bs.normalized, digits: bs.normalized, format: bs.resolvedFormat || format });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function goToSequence(seqDigits) {
    setDigits(seqDigits);
    setTitle('');
    setSaved(false);
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

      <nav className="bottom-nav">
        <button className="nav-btn active" onClick={() => navigate('/')}>Create</button>
        <button className="nav-btn" onClick={() => navigate('/scan')}>Scan</button>
        <button className="nav-btn" onClick={() => navigate('/list')}>Saved</button>
      </nav>
    </div>
  );
}
