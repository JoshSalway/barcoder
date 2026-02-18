# Barcode

A Progressive Web App for supermarket staff to create, scan, and manage barcodes. Built for situations where product barcodes are damaged, missing, or hard to scan at the POS.

## Problem

In supermarkets, there are typically 5-20 items with damaged or missing barcodes that fail to scan at self-serve checkouts. Staff currently have to type long barcode numbers manually into the POS, which is slow and error-prone. This app lets you:

1. **Scan** a barcode with your phone camera or from a photo
2. **Create** a barcode by typing the digits — the app generates a scannable barcode
3. **Save** frequently-needed barcodes for quick access next time

You can then display the generated barcode on your phone screen and scan it directly into the POS.

## Features

- **Camera scanning** — real-time barcode detection from camera feed
- **Photo scanning** — upload a photo of a barcode with image preprocessing (contrast enhancement, sharpening, binarization) for better detection of damaged barcodes
- **Barcode creation** — supports 27+ formats including EAN-13, UPC-A, EAN-8, Code 128, QR codes, and more
- **Check digit validation** — automatically validates and appends check digits for EAN/UPC formats
- **Sequence detection** — navigate to next/previous barcodes in a numeric sequence, detect gaps in saved sequences
- **Product lookup** — auto-fetches product name, brand, and image from Open Food Facts when a barcode is entered
- **Woolworths search** — quick link to search Woolworths for the scanned product
- **Save & organize** — save barcodes with custom titles, search, edit, and delete
- **PWA** — installable, works offline, optimized for mobile

## Primary Use Case

Woolworths supermarket staff managing EAN-13 barcodes and some American UPC codes. The app is designed for mobile use at self-serve checkouts.

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

## Future Roadmap

- **Share & Print** — share barcodes with colleagues, generate printable barcode sheets for the wall
- **Authentication** — guest mode with cloud sync option to persist barcodes across devices
- **Team sharing** — share barcode collections with other staff at the same store
- **Date-based barcodes** — generate barcodes with encoded date info for deli/bakery items
