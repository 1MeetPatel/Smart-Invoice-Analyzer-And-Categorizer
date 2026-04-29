# Smart Invoice Analyzer & Categorizer

A web-based system that automatically extracts, processes, and categorizes invoice data from uploaded files using OCR technology, and generates structured CSV files for easy analysis.

![Python](https://img.shields.io/badge/Python-3.8+-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.1-green?logo=flask)
![Tesseract](https://img.shields.io/badge/Tesseract-OCR-orange)

## Features

- **Multi-format Upload** — PDF, JPG, PNG, TIFF with drag & drop
- **OCR Text Extraction** — Powered by Tesseract with image preprocessing
- **Smart Parsing** — Regex-based extraction of invoice number, date, vendor, amounts
- **Auto Categorization** — Rule-based expense classification (10+ categories)
- **Inline Editing** — Edit extracted data before exporting
- **CSV Export** — Download structured data with one click
- **Premium UI** — Dark glassmorphic design with animations

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python (Flask) |
| OCR Engine | Tesseract OCR |
| Image Processing | OpenCV, Pillow |
| PDF Handling | PyPDF2, pdf2image |

## Prerequisites

### 1. Python 3.8+
Download from [python.org](https://www.python.org/downloads/)

### 2. Tesseract OCR
1. Download the installer from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)
2. Install to default path: `C:\Program Files\Tesseract-OCR\`
3. Verify: open CMD and run `tesseract --version`

### 3. Poppler (Optional — for PDF OCR)
Required only if your PDFs are scanned images (not text-based).
1. Download from [poppler releases](https://github.com/oschwartz10612/poppler-windows/releases)
2. Extract to `C:\Program Files\poppler\`
3. Add `C:\Program Files\poppler\Library\bin` to your PATH

## Quick Start

### Option 1: Run Script (Recommended)
```bash
run.bat
```

### Option 2: Manual Setup
```bash
pip install -r requirements.txt
python app.py
```

Then open **http://localhost:5000** in your browser.

## Usage

1. **Upload** — Drag & drop invoice files or click to browse
2. **Process** — Click "Process All Invoices" to run OCR
3. **Review** — Check extracted data in the results table
4. **Edit** — Click any cell to correct extracted values
5. **Export** — Click "Export CSV" to download structured data

## Project Structure

```
├── app.py              # Flask backend server
├── ocr_engine.py       # Image preprocessing + OCR extraction
├── parser.py           # Regex-based field extraction
├── categorizer.py      # Rule-based expense categorization
├── csv_generator.py    # CSV file generation
├── requirements.txt    # Python dependencies
├── run.bat             # One-click launcher
├── templates/
│   └── index.html      # Main web page
├── static/
│   ├── css/style.css   # Premium dark UI
│   └── js/app.js       # Frontend logic
├── uploads/            # Temporary uploaded files
└── exports/            # Generated CSV files
```

## Expense Categories

| Category | Example Keywords |
|----------|-----------------|
| Utilities | electricity, water, internet, phone |
| Office Supplies | paper, ink, printer, stationery |
| Travel & Transport | flight, hotel, taxi, fuel |
| Food & Dining | restaurant, grocery, catering |
| Software & IT | license, subscription, hosting, cloud |
| Professional Services | consulting, legal, accounting |
| Marketing & Advertising | ads, campaign, social media |
| Maintenance & Repairs | repair, cleaning, plumbing |
| Insurance | premium, policy, coverage |
| Medical & Healthcare | hospital, pharmacy, dental |

## Future Enhancements

- [ ] Machine learning-based categorization
- [ ] Multi-language invoice support
- [ ] Integration with accounting tools (QuickBooks, Tally)
- [ ] Web dashboard with charts & analytics
- [ ] Batch processing with progress tracking

## License

This project is for educational purposes.
