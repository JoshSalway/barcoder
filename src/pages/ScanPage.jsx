import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function ScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);

  const stopScanning = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!scanning) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
      if (result) {
        const text = result.getText();
        stopScanning();
        navigate(`/?digits=${encodeURIComponent(text)}`);
      }
      // Ignore not-found errors (they fire continuously while scanning)
      if (err && err.name !== 'NotFoundException') {
        // Only set error for real failures
      }
    }).then((controls) => {
      controlsRef.current = controls;
    }).catch((e) => {
      setError('Camera access denied or not available. Please allow camera access and try again.');
    });

    return () => {
      stopScanning();
    };
  }, [scanning, navigate, stopScanning]);

  return (
    <div className="page scan-page">
      <h1>Scan Barcode</h1>

      {error ? (
        <div className="error-box">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => { setError(null); setScanning(true); }}>
            Try Again
          </button>
        </div>
      ) : (
        <div className="camera-container">
          <video ref={videoRef} className="camera-video" playsInline />
          <div className="scan-overlay">
            <div className="scan-line" />
          </div>
          <p className="scan-hint">Point camera at a barcode</p>
        </div>
      )}

      <button
        className="btn btn-secondary btn-full"
        onClick={() => navigate('/')}
        style={{ marginTop: '1rem' }}
      >
        Or type digits manually
      </button>

      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => navigate('/')}>Create</button>
        <button className="nav-btn active" onClick={() => navigate('/scan')}>Scan</button>
        <button className="nav-btn" onClick={() => navigate('/list')}>Saved</button>
      </nav>
    </div>
  );
}
