"""
Invocify — AI Financial Intelligence
Flask Backend Application
"""

import os
import json
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from ocr_engine import extract_text
from parser import parse_invoice
from categorizer import categorize_invoice
from csv_generator import generate_csv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['EXPORT_FOLDER'] = os.path.join(os.path.dirname(__file__), 'exports')

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp', 'webp'}

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['EXPORT_FOLDER'], exist_ok=True)


def allowed_file(filename):
    """Check if uploaded file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    """Serve the main application page."""
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Handle file upload, process with OCR, parse and categorize.
    Returns extracted invoice data as JSON.
    """
    # Check if file was provided
    if 'file' not in request.files:
        return jsonify({
            'status': 'error',
            'message': 'No file uploaded'
        }), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({
            'status': 'error',
            'message': 'No file selected'
        }), 400

    if not allowed_file(file.filename):
        return jsonify({
            'status': 'error',
            'message': f'Unsupported file format. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400

    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Step 1: Extract text using OCR (Local & Fast)
        raw_text = extract_text(filepath)
        
        # Step 2: Try Fast Local Parser first (sub-0.1s)
        parsed_data = parse_invoice(raw_text)
        
        # Step 3: Performance Gate
        # If local parser math is verified (confidence > 0.9), skip Gemini for speed (< 2s total)
        has_api_key = os.getenv("GOOGLE_API_KEY") and "your_api_key" not in os.getenv("GOOGLE_API_KEY")
        
        if parsed_data.get('confidence', 0) < 0.9 and has_api_key:
            # Fallback to AI only if local math failed or confidence is low
            try:
                from ai_parser import parse_with_gemini
                ai_data = parse_with_gemini(filepath)
                if ai_data.get('status') == 'success':
                    ai_data['raw_text'] = raw_text
                    parsed_data = ai_data
            except:
                pass # Continue with local data if AI fails
        
        # Step 4: Categorize (Local & Fast)
        category_result = categorize_invoice(
            parsed_data.get('vendor', ''),
            raw_text,
            parsed_data.get('total', '0.00')
        )

        # Merge category info into parsed data
        parsed_data['category'] = category_result['category']
        parsed_data['cat_confidence'] = category_result['confidence']
        
        # Explicitly mention what kind of product it is (Category: Description)
        if parsed_data.get('product') and parsed_data['category'] != 'Other':
            parsed_data['product'] = f"{parsed_data['category']}: {parsed_data['product']}"
        elif not parsed_data.get('product'):
            parsed_data['product'] = parsed_data['category']
            
        parsed_data['filename'] = filename

        # Clean up uploaded file (best-effort — ignore lock errors on Windows)
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except OSError:
            pass  # File will be cleaned up on next request or manually

        return jsonify({
            'status': 'success',
            'data': parsed_data
        })

    except Exception as e:
        # Clean up on error
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)

        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/export-csv', methods=['POST'])
def export_csv():
    """
    Generate CSV from provided invoice records.
    Expects JSON body with 'records' array.
    """
    try:
        data = request.get_json()
        if not data or 'records' not in data:
            return jsonify({
                'status': 'error',
                'message': 'No records provided'
            }), 400

        records = data['records']
        if not records:
            return jsonify({
                'status': 'error',
                'message': 'Records list is empty'
            }), 400

        # Generate CSV
        result = generate_csv(records, app.config['EXPORT_FOLDER'])

        if result['status'] == 'success':
            return jsonify({
                'status': 'success',
                'filename': result['filename'],
                'record_count': result['record_count']
            })
        else:
            return jsonify(result), 500

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/download/<filename>')
def download_file(filename):
    """Download a generated CSV file."""
    filepath = os.path.join(app.config['EXPORT_FOLDER'], secure_filename(filename))

    if not os.path.exists(filepath):
        return jsonify({
            'status': 'error',
            'message': 'File not found'
        }), 404

    return send_file(
        filepath,
        mimetype='text/csv',
        as_attachment=True,
        download_name=filename
    )


@app.route('/health')
def health_check():
    """Health check endpoint."""
    # Check Tesseract availability
    tesseract_available = False
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        tesseract_available = True
    except Exception:
        pass

    return jsonify({
        'status': 'running',
        'tesseract_available': tesseract_available
    })


if __name__ == '__main__':
    print("\n" + "=" * 55)
    print("  Invocify — Professional AI Financial Intelligence")
    print("  Running at: http://localhost:5000")
    print("=" * 55 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
