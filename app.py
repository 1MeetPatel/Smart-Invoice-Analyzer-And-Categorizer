"""
Smart Invoice Analyzer and Categorizer
Flask Backend Application
"""

import os
import json
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename

from ocr_engine import extract_text
from parser import parse_invoice
from categorizer import categorize_invoice
from csv_generator import generate_csv

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

        # Step 1: Extract text using OCR
        raw_text = extract_text(filepath)

        # Step 2: Parse invoice fields
        parsed_data = parse_invoice(raw_text)

        # Step 3: Categorize the invoice
        category_result = categorize_invoice(
            parsed_data.get('vendor', ''),
            raw_text,
            parsed_data.get('total', '0.00')
        )

        # Merge category info into parsed data
        parsed_data['category'] = category_result['category']
        parsed_data['confidence'] = category_result['confidence']
        parsed_data['filename'] = filename

        # Clean up uploaded file
        if os.path.exists(filepath):
            os.remove(filepath)

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
    print("  Smart Invoice Analyzer and Categorizer")
    print("  Running at: http://localhost:5000")
    print("=" * 55 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
