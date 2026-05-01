# 💎 Invocify — AI-Powered Financial Intelligence

**Invocify** is a state-of-the-art, high-fidelity invoice analyzer designed to transform raw financial documents into actionable insights. Leveraging advanced OCR technology and a premium glassmorphic interface, Invocify automates the extraction, categorization, and visualization of invoice data with surgical precision.

![Invocify Dashboard Mockup](https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1200)

## 🚀 Key Features

- **Advanced OCR Extraction**: Surgical data extraction from PDF, JPG, PNG, and TIFF invoices using Tesseract.
- **Intelligent Categorization**: Automatically groups expenses into categories (Utilities, Software, Rent, etc.) for better financial tracking.
- **Cinematic Glassmorphic UI**: A premium, hardware-inspired interface featuring immersive theme transitions and real-time feedback.
- **Interactive Analytics**: Deep financial insights via Chart.js visualizations, including spending trends and category distributions.
- **Universal Export**: One-click high-fidelity CSV export for seamless integration with accounting software.
- **Dynamic Theme Engine**: Immersive Light/Dark mode controller with cinematic "Theme Wash" transitions.

## 🛠️ Technology Stack

- **Backend**: Python, Flask
- **OCR Engine**: Tesseract OCR
- **Frontend**: Vanilla JS, HTML5, CSS3 (Glassmorphism)
- **Data Visualization**: Chart.js
- **Styling**: Pure CSS with Custom Design Tokens

## 📦 Installation & Setup

### Prerequisites
- Python 3.9+
- Tesseract OCR installed on your system

### 1. Clone the Repository
```bash
git clone https://github.com/1MeetPatel/Smart-Invoice-Analyzer-And-Categorizer.git
cd Smart-Invoice-Analyzer-And-Categorizer
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Tesseract Configuration
Ensure Tesseract is in your system PATH or configure the path in `app.py`:
```python
# app.py
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

### 4. Run Locally
```bash
python app.py
```
Visit `http://localhost:5000` to experience Invocify.

## 🎨 Design Philosophy
Invocify is built on the principle of **Premium Visibility**. Every component—from the sliding theme controller to the glassmorphic download buttons—is designed to provide a high-end, hardware-like interactive experience.

---
*Created with ❤️ by the Invocify Team.*
