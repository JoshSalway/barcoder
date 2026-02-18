# Barcoder

A Progressive Web App to create, scan, and manage barcodes. Built for situations where product barcodes are damaged, missing, or hard to scan.

## Problem

Items with damaged or missing barcodes fail to scan at the register. Staff have to type long barcode numbers manually, which is slow and error-prone. This app lets you:

1. **Scan** a barcode with your phone camera or from a photo
2. **Create** a barcode by typing the digits — the app generates a scannable barcode
3. **Save** frequently-needed barcodes for quick access next time

You can then display the generated barcode on your phone screen and scan it directly at the register.

## Features

- **Camera scanning** — real-time barcode detection from camera feed
- **Photo scanning** — upload a photo of a barcode with image preprocessing (contrast enhancement, sharpening, binarization) for better detection of damaged barcodes
- **Barcode creation** — supports 27+ formats including EAN-13, UPC-A, EAN-8, Code 128, QR codes, and more
- **Check digit validation** — automatically validates and appends check digits for EAN/UPC formats
- **Sequence detection** — detect gaps in saved barcode sequences
- **Save & organize** — save barcodes with custom titles, search, edit, and delete
- **PWA** — installable, works offline, optimized for mobile

## Tech Stack

- React 19 + Vite
- React Router DOM v7
- JsBarcode (1D barcode rendering)
- qrcode (QR code rendering)
- @zxing/browser + @zxing/library (barcode scanning)
- PWA with Service Worker (offline support)
- localStorage for data persistence

## Getting Started

```bash
npm install
npm run dev
```
