import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import BottomNav from '../components/BottomNav';
import { preprocessForBarcode } from '../services/imagePreprocess';

// Map @zxing BarcodeFormat enum to our format values
const ZXING_TO_FORMAT = {
  [BarcodeFormat.QR_CODE]: 'QR',
  [BarcodeFormat.EAN_13]: 'EAN13',
  [BarcodeFormat.EAN_8]: 'EAN8',
  [BarcodeFormat.UPC_A]: 'UPC',
  [BarcodeFormat.UPC_E]: 'UPCE',
  [BarcodeFormat.CODE_128]: 'CODE128',
  [BarcodeFormat.CODE_39]: 'CODE39',
  [BarcodeFormat.CODE_93]: 'CODE93',
  [BarcodeFormat.ITF]: 'ITF',
  [BarcodeFormat.CODABAR]: 'codabar',
  [BarcodeFormat.DATA_MATRIX]: 'QR',  // closest we support
  [BarcodeFormat.AZTEC]: 'QR',
  [BarcodeFormat.PDF_417]: 'CODE128',
  [BarcodeFormat.RSS_14]: 'EAN13',
  [BarcodeFormat.RSS_EXPANDED]: 'CODE128',
};

const SCAN_HINTS = (() => {
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
  return hints;
})();

function buildResultUrl(result) {
  const digits = encodeURIComponent(result.getText());
  const format = ZXING_TO_FORMAT[result.getBarcodeFormat()] || 'auto';
  return `/?digits=${digits}&format=${format}`;
}

export default function ScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);

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

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
      if (result) {
        stopScanning();
        navigate(buildResultUrl(result));
      }
      if (err && err.name !== 'NotFoundException') {
        // Real camera errors handled by catch below
      }
    }).then((controls) => {
      controlsRef.current = controls;
    }).catch(() => {
      setError('Camera access denied or not available. Please allow camera access and try again.');
    });

    return () => {
      stopScanning();
    };
  }, [scanning, navigate, stopScanning]);

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setError(null);

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        // Region crops to try
        const regions = [
          { sx: 0, sy: 0, sw: w, sh: h },
          { sx: w * 0.2, sy: h * 0.2, sw: w * 0.6, sh: h * 0.6 },
          { sx: 0, sy: h * 0.4, sw: w, sh: h * 0.6 },
          { sx: 0, sy: 0, sw: w, sh: h * 0.6 },
          { sx: 0, sy: h * 0.25, sw: w, sh: h * 0.5 },
        ];

        let found = null;
        for (const { sx, sy, sw, sh } of regions) {
          const canvas = document.createElement('canvas');
          canvas.width = sw;
          canvas.height = sh;
          canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

          // Try original and preprocessed variants
          const variants = preprocessForBarcode(canvas);
          for (const variant of variants) {
            const reader = new BrowserMultiFormatReader(SCAN_HINTS);
            try {
              found = await reader.decodeFromCanvas(variant);
              if (found) break;
            } catch {
              // Try next variant
            }
          }
          if (found) break;
        }

        if (found) {
          navigate(buildResultUrl(found));
        } else {
          setError('Could not find a barcode in this image. Try cropping closer to the barcode.');
        }
      } finally {
        URL.revokeObjectURL(url);
        setProcessing(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setProcessing(false);
      setError('Could not load the image. Please try a different photo.');
    };
    img.src = url;
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
        disabled={processing}
        style={{ marginTop: '1rem' }}
      >
        {processing ? 'Analyzing photo...' : 'Upload Photo'}
      </button>

      <button
        className="btn btn-secondary btn-full"
        onClick={() => navigate('/')}
        style={{ marginTop: '0.75rem' }}
      >
        Or type digits manually
      </button>

      <BottomNav />
    </div>
  );
}
