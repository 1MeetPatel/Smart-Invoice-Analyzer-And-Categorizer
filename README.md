# 💎 Invocify — AI-Powered Financial Intelligence

**Invocify** is a state-of-the-art, high-fidelity invoice analyzer designed to transform raw financial documents into actionable insights. Leveraging advanced OCR technology, Google Generative AI, and a premium glassmorphic interface, Invocify automates the extraction, categorization, and visualization of invoice data with surgical precision.

![Invocify Dashboard](https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1200)

## 🚀 Key Features

- **Surgical OCR Extraction**: High-precision data extraction from PDF, JPG, PNG, and TIFF invoices using Tesseract and OpenCV preprocessing.
- **AI-Driven Categorization**: Leverages **Google Gemini Pro** to intelligently group expenses into financial categories with high confidence.
- **Cinematic Glassmorphic UI**: A hardware-inspired interface featuring immersive theme transitions, backdrop blurring, and premium design tokens.
- **Interactive Financial Analytics**: Deep spending insights visualized via interactive Chart.js dashboards.
- **Universal Export**: One-click high-fidelity CSV export optimized for accounting and reporting.
- **Fluid Notification System**: Professional glassmorphic "Toast" alerts with silky-smooth slide-down/up animations.
- **Dynamic Theme Engine**: Immersive Light/Dark mode with a custom-engineered sliding controller and trailing glow effects.

## 🛠️ Technology Stack

### Backend & AI
- **Framework**: Python 3.9+, Flask
- **Intelligence**: Google Generative AI (Gemini Pro API)
- **OCR Engine**: Tesseract OCR (via `pytesseract`)
- **Computer Vision**: OpenCV (`cv2`) for document alignment and cleaning
- **Data Handling**: `pdf2image`, `PyPDF2`, `Pillow`

### Frontend & Design
- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Visuals**: Chart.js for data visualization
- **Design Language**: Pure CSS Glassmorphism with `backdrop-filter` optics
- **Motion**: Custom `cubic-bezier` physics for fluid, non-elastic animations

## 📦 Installation & Setup

### Prerequisites
- Python 3.9 or higher
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) installed and added to your system path.

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

### 4. Run Invocify
```bash
python app.py
```
Or execute the included `run.bat` for a one-click launch on Windows.

## 🎨 Design Philosophy
Invocify is built on the principle of **Tactile Visibility**. Every interaction—from the sliding theme toggle to the sliding notification toasts—is engineered to provide a high-end, hardware-like experience that feels responsive, alive, and professional.

---
*Created with ❤️ by the Invocify Team.*
