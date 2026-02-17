import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';

export default function ScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
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

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        // Set up hints for aggressive scanning
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
          BarcodeFormat.ITF, BarcodeFormat.CODABAR,
          BarcodeFormat.RSS_14, BarcodeFormat.RSS_EXPANDED,
          BarcodeFormat.AZTEC, BarcodeFormat.PDF_417,
        ]);

        const w = img.naturalWidth;
        const h = img.naturalHeight;

        // Try at multiple scales/crops to find the barcode in a busy image
        const attempts = [
          // Full image
          { sx: 0, sy: 0, sw: w, sh: h },
          // Center crop (middle 60%)
          { sx: w * 0.2, sy: h * 0.2, sw: w * 0.6, sh: h * 0.6 },
          // Bottom half (barcodes often at bottom of products)
          { sx: 0, sy: h * 0.4, sw: w, sh: h * 0.6 },
          // Top half
          { sx: 0, sy: 0, sw: w, sh: h * 0.6 },
          // Middle horizontal strip
          { sx: 0, sy: h * 0.25, sw: w, sh: h * 0.5 },
        ];

        let found = null;
        for (const { sx, sy, sw, sh } of attempts) {
          const canvas = document.createElement('canvas');
          canvas.width = sw;
          canvas.height = sh;
          canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

          const reader = new BrowserMultiFormatReader(hints);
          try {
            found = await reader.decodeFromCanvas(canvas);
            if (found) break;
          } catch {
            // Try next region
          }
        }

        if (found) {
          navigate(`/?digits=${encodeURIComponent(found.getText())}`);
        } else {
          setError('Could not find a barcode in this image. Try cropping closer to the barcode.');
        }
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.src = url;
    // Reset so same file can be re-selected
    e.target.value = '';
  }

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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        style={{ display: 'none' }}
      />

      <button
        className="btn btn-secondary btn-full"
        onClick={() => fileInputRef.current?.click()}
        style={{ marginTop: '1rem' }}
      >
        Upload Photo
      </button>

      <button
        className="btn btn-secondary btn-full"
        onClick={() => navigate('/')}
        style={{ marginTop: '0.75rem' }}
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
