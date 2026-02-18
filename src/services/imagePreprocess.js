/**
 * Image preprocessing utilities to improve barcode detection from photos.
 * Applies various canvas-based transformations before passing to zxing decoder.
 */

/**
 * Convert canvas to grayscale and stretch contrast to full 0-255 range.
 * Helps with uneven lighting conditions.
 */
function applyContrastEnhancement(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const srcCtx = sourceCanvas.getContext('2d');
  const imageData = srcCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // First pass: find min/max luminance
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }

  const range = max - min || 1;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const outCtx = out.getContext('2d');
  const outData = outCtx.createImageData(w, h);

  // Second pass: stretch contrast
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const stretched = Math.round(((gray - min) / range) * 255);
    outData.data[i] = stretched;
    outData.data[i + 1] = stretched;
    outData.data[i + 2] = stretched;
    outData.data[i + 3] = 255;
  }

  outCtx.putImageData(outData, 0, 0);
  return out;
}

/**
 * Apply 3x3 sharpening kernel to enhance barcode edges.
 * Barcodes are high-frequency edge patterns, so sharpening helps with blur.
 */
function applySharpen(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const srcCtx = sourceCanvas.getContext('2d');
  const imageData = srcCtx.getImageData(0, 0, w, h);
  const src = imageData.data;

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const outCtx = out.getContext('2d');
  const outData = outCtx.createImageData(w, h);
  const dst = outData.data;

  // Unsharp mask kernel: center=5, edges=-1
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
            val += src[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        dst[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, val));
      }
      dst[(y * w + x) * 4 + 3] = 255;
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return out;
}

/**
 * Binarize image using Otsu's automatic threshold method.
 * Converts to pure black/white which matches barcode structure exactly.
 */
function applyOtsuBinarize(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const srcCtx = sourceCanvas.getContext('2d');
  const imageData = srcCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Build grayscale histogram
  const histogram = new Array(256).fill(0);
  const grayValues = new Uint8Array(w * h);

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    grayValues[i / 4] = gray;
    histogram[gray]++;
  }

  // Otsu's method: find threshold that minimizes intra-class variance
  const total = w * h;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * histogram[i];

  let sumBg = 0, weightBg = 0;
  let maxVariance = 0, threshold = 0;

  for (let t = 0; t < 256; t++) {
    weightBg += histogram[t];
    if (weightBg === 0) continue;
    const weightFg = total - weightBg;
    if (weightFg === 0) break;

    sumBg += t * histogram[t];
    const meanBg = sumBg / weightBg;
    const meanFg = (sumAll - sumBg) / weightFg;
    const variance = weightBg * weightFg * (meanBg - meanFg) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  // Apply threshold
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const outCtx = out.getContext('2d');
  const outData = outCtx.createImageData(w, h);

  for (let i = 0; i < grayValues.length; i++) {
    const val = grayValues[i] > threshold ? 255 : 0;
    outData.data[i * 4] = val;
    outData.data[i * 4 + 1] = val;
    outData.data[i * 4 + 2] = val;
    outData.data[i * 4 + 3] = 255;
  }

  outCtx.putImageData(outData, 0, 0);
  return out;
}

/**
 * Scale canvas to a target width for consistent processing.
 * Very large images are slow to decode; very small ones lack detail.
 */
function normalizeScale(sourceCanvas, targetWidth = 1000) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  // Skip if already close to target
  if (w > targetWidth * 0.8 && w < targetWidth * 1.5) return null;

  const scale = targetWidth / w;
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);

  const out = document.createElement('canvas');
  out.width = newW;
  out.height = newH;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false; // nearest-neighbor for upscale
  ctx.drawImage(sourceCanvas, 0, 0, newW, newH);
  return out;
}

/**
 * Generate preprocessed variants of a source canvas for barcode detection.
 * Returns array of canvases to try decoding against.
 */
export function preprocessForBarcode(sourceCanvas) {
  const variants = [sourceCanvas];

  const scaled = normalizeScale(sourceCanvas);
  const base = scaled || sourceCanvas;
  if (scaled) variants.push(scaled);

  variants.push(applyContrastEnhancement(base));
  variants.push(applySharpen(base));
  variants.push(applyOtsuBinarize(base));

  return variants;
}
