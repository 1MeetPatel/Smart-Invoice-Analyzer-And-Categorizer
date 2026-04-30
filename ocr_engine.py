"""
OCR Engine Module
Handles image preprocessing and text extraction using Tesseract OCR.
Supports PDF, JPG, PNG, and TIFF formats.
"""

import os
import cv2
import numpy as np
from PIL import Image
import pytesseract
from PyPDF2 import PdfReader

# Configure Tesseract path for Windows
if os.name == 'nt':
    # Common installation paths for Tesseract
    common_tesseract_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'D:\tesseract ocr\tesseract.exe',
        r'D:\Tesseract-OCR\tesseract.exe',
        os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Tesseract-OCR', 'tesseract.exe')
    ]
    
    for path in common_tesseract_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            break


def preprocess_image(image_path):
    """
    Optimized preprocessing for SPEED and ACCURACY.
    Targets < 2s total processing time.
    """
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    # 1. Faster Resizing: Resize to a standard height (2000px) for consistent OCR
    target_h = 2000
    h, w = img.shape[:2]
    if h < target_h:
        ratio = target_h / h
        img = cv2.resize(img, (int(w * ratio), target_h), interpolation=cv2.INTER_LINEAR)

    # 2. Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 3. Faster Enhancement: CLAHE instead of slow denoising
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrast = clahe.apply(gray)
    
    # 4. Otsu Binarization (Fastest)
    _, thresh = cv2.threshold(contrast, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return thresh


def extract_text_from_image(image_path):
    """
    Ultra-fast OCR extraction using optimized single-pass configuration.
    """
    try:
        # Preprocess the image
        processed = preprocess_image(image_path)

        # Convert back to PIL for Tesseract (In-memory)
        pil_img = Image.fromarray(processed)

        # Single-pass OCR with Optimized Config
        # OEM 1 = LSTM (Fastest/Most Accurate), PSM 3 = Auto Layout
        config = r'--oem 1 --psm 3'
        text = pytesseract.image_to_string(pil_img, config=config)

        # Fallback if empty
        if len(text.strip()) < 5:
            text = pytesseract.image_to_string(Image.open(image_path), config=r'--oem 1 --psm 3')

        return text.strip()

    except Exception as e:
        raise RuntimeError(f"OCR extraction failed: {str(e)}")


def extract_text_from_pdf(pdf_path):
    """
    Extract text from a PDF file.
    First tries embedded text extraction, falls back to OCR.
    """
    try:
        # Try extracting embedded text first
        reader = PdfReader(pdf_path)
        text_parts = []

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

        embedded_text = '\n'.join(text_parts).strip()

        # If embedded text is substantial, return it
        if len(embedded_text) > 50:
            return embedded_text

        # Fall back to OCR: convert PDF pages to images
        try:
            from pdf2image import convert_from_path

            # Try to find poppler on Windows
            poppler_path = None
            if os.name == 'nt':
                common_paths = [
                    r'C:\Program Files\poppler\Library\bin',
                    r'C:\Program Files\poppler\bin',
                    r'C:\poppler\Library\bin',
                    r'C:\poppler\bin',
                ]
                for p in common_paths:
                    if os.path.exists(p):
                        poppler_path = p
                        break

            images = convert_from_path(
                pdf_path,
                poppler_path=poppler_path,
                dpi=300
            )

            ocr_texts = []
            for i, img in enumerate(images):
                # Save page as temp image
                temp_img_path = pdf_path + f'_page_{i}.png'
                img.save(temp_img_path, 'PNG')

                # Extract text from the page image
                page_text = extract_text_from_image(temp_img_path)
                ocr_texts.append(page_text)

                # Clean up
                if os.path.exists(temp_img_path):
                    os.remove(temp_img_path)

            ocr_text = '\n'.join(ocr_texts).strip()

            # Return whichever result is better
            if len(ocr_text) > len(embedded_text):
                return ocr_text

        except ImportError:
            pass  # pdf2image not available, use embedded text
        except Exception:
            pass  # Poppler not found or conversion failed

        # Return whatever we have
        return embedded_text if embedded_text else "Could not extract text from PDF."

    except Exception as e:
        raise RuntimeError(f"PDF text extraction failed: {str(e)}")


def extract_text(file_path):
    """
    Main entry point: detect file type and extract text accordingly.
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext in ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.webp']:
        return extract_text_from_image(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")
