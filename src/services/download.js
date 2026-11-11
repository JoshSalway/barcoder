// Export the rendered barcode (JsBarcode <svg> or QR <canvas>) inside `container` as a PNG.
// Adds a white quiet zone so the saved image still scans, and prints the digits under 1D codes.
const SCALE = 4; // ponytail: fixed 4x upscale, expose as an option if anyone needs print DPI control

export async function downloadBarcodePng(container, filename, caption = '') {
  const source = container?.querySelector('svg, canvas');
  if (!source) return false;

  let img = source;
  let w = source.width;
  let h = source.height;
  if (source instanceof SVGElement) {
    w = source.width.baseVal.value;
    h = source.height.baseVal.value;
    const xml = new XMLSerializer().serializeToString(source);
    img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    await img.decode();
  }
  if (!w || !h) return false;

  const pad = 10;
  const textH = caption ? 18 : 0;
  const canvas = document.createElement('canvas');
  canvas.width = (w + pad * 2) * SCALE;
  canvas.height = (h + pad * 2 + textH) * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, pad * SCALE, pad * SCALE, w * SCALE, h * SCALE);
  if (caption) {
    ctx.fillStyle = '#000';
    ctx.font = `${14 * SCALE}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(caption, canvas.width / 2, (pad + h + 4) * SCALE, canvas.width - pad * 2 * SCALE);
  }

  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${filename.replace(/[^\w.-]+/g, '_').slice(0, 60) || 'barcode'}.png`;
  a.click();
  return true;
}
