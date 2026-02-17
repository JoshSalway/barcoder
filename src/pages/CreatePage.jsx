import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BarcodeRenderer from '../components/BarcodeRenderer';
import { normalizeDigits } from '../services/barcode';
import storage from '../services/storage';

export default function CreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [digits, setDigits] = useState(searchParams.get('digits') || '');
  const [format, setFormat] = useState(searchParams.get('format') || 'auto');
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleSave() {
    if (!digits.trim()) return;
    const normalized = normalizeDigits(digits, format);
    storage.save({ title: title.trim() || normalized, digits: normalized, format });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleCopy() {
    const normalized = normalizeDigits(digits, format);
    navigator.clipboard.writeText(normalized).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="page create-page">
      <h1>Create Barcode</h1>

      <div className="input-group">
        <label htmlFor="digits-input">Digits</label>
        <input
          id="digits-input"
          type="text"
          inputMode="numeric"
          placeholder="Enter barcode digits"
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
          <option value="auto">Auto</option>
          <option value="EAN13">EAN-13</option>
          <option value="CODE128">Code 128</option>
        </select>
      </div>

      {digits && (
        <div className="barcode-preview">
          <BarcodeRenderer digits={digits} format={format} />
        </div>
      )}

      {digits && (
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
          disabled={!digits.trim()}
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
