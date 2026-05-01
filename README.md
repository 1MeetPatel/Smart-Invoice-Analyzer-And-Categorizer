# 🚀 Invocify — AI-Powered Financial Intelligence

**Invocify** is a state-of-the-art, high-fidelity invoice analyzer designed to transform raw financial documents into actionable insights. Featuring the **"Bulletproof Snappy"** performance architecture, Invocify delivers a premium, zero-lag experience while leveraging Google Gemini AI for surgical data extraction.

![Invocify Dashboard](https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1200)

## ✨ Key Features

- **🚀 Bulletproof Snappy UI**: A high-performance interface optimized for 60fps responsiveness. We've stripped expensive filters in favor of a high-contrast Indigo design language that feels buttery smooth on any hardware.
- **🤖 Gemini 1.5/2.0 Flash Integration**: High-fidelity AI fallback using Google's latest models. Invocify intelligently handles complex layouts and handwritten notes where traditional OCR fails.
- **📄 Native PDF Intelligence**: Process both digital and scanned PDFs natively. No local Poppler dependency required for AI fallback—Gemini handles the documents directly.
- **📊 Interactive Financial Analytics**: Real-time spending insights visualized via interactive Chart.js dashboards (Expenditure Flow, Category Splits, Vendor Rankings).
- **🛡️ Hardened Rendering Pipeline**: Zero-fail data rendering with robust HTML escaping, safe numeric formatting, and error-resilient state management.
- **🌗 Immersive Theme Engine**: Instant Light/Dark mode transitions with a trailing wash effect and custom design tokens.

## 🛠️ Technology Stack

### Backend & AI
- **Framework**: Python 3.9+, Flask
- **Intelligence**: Google Generative AI (Gemini 1.5/2.0 Flash)
- **OCR Engine**: Tesseract OCR 5.0+
- **Computer Vision**: OpenCV for high-contrast document preprocessing

### Frontend & Design
- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Visuals**: Chart.js for data visualization
- **Performance**: Zero-filter "Solid Glass" methodology for guaranteed 60fps interaction

## 🚀 Installation & Setup

### Prerequisites
- **Python 3.9+**
- **Tesseract OCR**: [Download Here](https://github.com/UB-Mannheim/tesseract/wiki). Note: Invocify automatically searches for Tesseract in common Windows paths (e.g., `D:\tesseract ocr\tesseract.exe`).

### 1. Clone & Enter
```bash
git clone https://github.com/1MeetPatel/Smart-Invoice-Analyzer-And-Categorizer.git
cd Smart-Invoice-Analyzer-And-Categorizer
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
Create a `.env` file in the root directory:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 4. Launch
```bash
python app.py
```
Or simply run `run.bat` for a one-click launch.

## 📈 Performance Notes
Invocify is designed for speed. By avoiding `backdrop-filter` and utilizing hardware-accelerated 2D transforms, we ensure that even large batches of invoices can be managed without UI jitter.

---
© 2024 Invocify | Built for High-Performance Finance
