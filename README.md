# 🚀 Invocify — Enterprise AI Invoice Analytics

**Invocify** is a professional-grade, high-performance invoice analyzer that transforms chaotic financial documents into structured, actionable intelligence. It combines the speed of local OCR with the deep reasoning of Google Gemini AI to deliver surgical extraction precision.


##  The "Bulletproof Snappy" Experience
Designed for zero-lag interactions, Invocify utilizes a custom-engineered UI architecture that avoids expensive browser filters.
- **60FPS Guaranteed**: Smooth animations even on low-end hardware.
- **Instant Response**: No more waiting for UI transitions; every click is immediate.
- **Indigo Contrast Shield**: A modern, high-fidelity design language optimized for focus.

---

##  Key Features

###  Intelligent Extraction
- **Dual-Engine Processing**: Uses local Tesseract OCR for speed and Google Gemini 1.5/2.0 Flash for complex, low-quality, or handwritten documents.
- **Native PDF Intelligence**: Direct PDF processing without local Poppler dependencies—perfect for scanned financial records.
- **Handwriting Support**: AI fallback ensures even messy handwritten totals are captured with high accuracy.

###  Advanced Analytics
- **Expenditure Flow**: Real-time line charts tracking spending trends over time.
- **Category Intelligence**: Automated grouping into Utilities, Software, Marketing, Office, Travel, Food, and more.
- **Vendor Insights**: Rank your top vendors by spend to identify potential savings.
- **Tax Efficiency**: Breakdown of tax/VAT contributions across all processed transactions.

### Production-Grade UX
- **Hardened Rendering**: Error-resilient table engine with safe numeric formatting and HTML escaping.
- **Snappy Modal System**: Profile management and document previews that snap into view instantly.
- **Real-Time Toasts**: Beautifully animated notifications for success, warnings, and error reporting.
- **Universal Export**: One-click high-fidelity CSV export for accounting software integration.

---

##  Architecture & Logic

Invocify follows a **"Local-First, AI-Always"** strategy:
1. **Preprocessing**: Invoices are cleaned and contrasted via OpenCV.
2. **Local Parse**: Tesseract attempts to find core fields (Invoice ID, Date, Amount).
3. **AI Fallback**: If local confidence is < 90% or OCR fails, the document is sent directly to **Gemini Flash**.
4. **Categorization**: Data is merged with AI-driven category classification.
5. **Visualization**: The frontend reactively updates charts and tables using the new dataset.

---

##  Installation & Setup

###  Prerequisites
- **Python 3.9+**
- **Tesseract OCR**: 
  - [Windows Installer](https://github.com/UB-Mannheim/tesseract/wiki)
  - Ensure Tesseract is installed (Standard paths like `C:\Program Files\Tesseract-OCR` or `D:\tesseract ocr` are auto-detected).

### 1. Clone the Repository
```bash
git clone https://github.com/1MeetPatel/Smart-Invoice-Analyzer-And-Categorizer.git
cd Smart-Invoice-Analyzer-And-Categorizer
```

### 2. Set Up Environment
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. API Configuration
Create a `.env` file in the root directory:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
FLASK_ENV=development
```

### 4. Run the Application
```bash
python app.py
```
**Windows Tip:** Double-click `run.bat` for a one-click automated startup.

---

##  Project Structure

```text
├── app.py              # Main Flask Server & Routing
├── ai_parser.py        # Gemini AI Integration & PDF Logic
├── ocr_engine.py       # Tesseract & Image Preprocessing
├── parser.py           # Local Regex-based Extraction Logic
├── static/
│   ├── css/style.css   # "Bulletproof Snappy" Styling
│   └── js/app.js       # Core Frontend Engine & State
└── templates/
    └── index.html      # Main Dashboard Template
```

---

##  Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **"Tesseract Not Found"** | Check your installation path. Ensure `tesseract.exe` is in `C:\Program Files\Tesseract-OCR` or update the path in `ocr_engine.py`. |
| **PDF processing fails** | Ensure your `GOOGLE_API_KEY` is valid. Native PDF support relies on Gemini when local Poppler is missing. |
| **UI is blank after upload** | Open Browser Console (F12). Check for logs starting with `Rendering results`. Most issues are fixed by clearing cache. |
| **API Quota Errors** | Invocify includes retry logic, but if you hit limits, wait 60 seconds or use a Gemini Pro tier key. |

---

## 📜 License
This project is licensed under the MIT License - see the LICENSE file for details.

