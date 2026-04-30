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
    Apply advanced preprocessing pipeline to improve OCR accuracy.
    Steps: Upscale → Grayscale → Denoise → Adaptive Threshold → Deskew
    """
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    # 1. Upscale if image is too small (helps Tesseract with small fonts)
    height, width = img.shape[:2]
    if width < 1500:
        scale_factor = 2
        img = cv2.resize(img, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_CUBIC)

    # 2. Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 3. Advanced Denoising (Non-Local Means Denoising is better than Gaussian for text)
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

    # 4. Adaptive Thresholding (Otsu's Binarization works well for scanned docs)
    # We use a mix of CLAHE and thresholding
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrast_enhanced = clahe.apply(denoised)
    
    _, thresh = cv2.threshold(contrast_enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 5. Deskew the image
    deskewed = deskew_image(thresh)

    return deskewed


def deskew_image(image):
    """Correct skew in scanned documents using contour detection."""
    coords = np.column_stack(np.where(image > 0))
    if len(coords) < 5:
        return image

    try:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        # Only deskew if angle is significant
        if 0.5 < abs(angle) < 45:
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                image, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
            return rotated
    except Exception:
        pass

    return image


def extract_text_from_image(image_path):
    """
    Extract text from an image file using multi-pass Tesseract OCR.
    Tries different PSM modes to find the best result.
    """
    try:
        # Preprocess the image
        processed = preprocess_image(image_path)

        # Save processed image temporarily
        temp_path = image_path + '_processed.png'
        cv2.imwrite(temp_path, processed)

        # Multi-pass OCR: Try PSM 6 (uniform block) then PSM 3 (fully automatic)
        best_text = ""
        configs = [r'--oem 3 --psm 6', r'--oem 3 --psm 3']
        
        for config in configs:
            text = pytesseract.image_to_string(Image.open(temp_path), config=config)
            if len(text.strip()) > len(best_text.strip()):
                best_text = text

        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

        # Final check: if processed is still empty, try original image as last resort
        if len(best_text.strip()) < 10:
            text_original = pytesseract.image_to_string(Image.open(image_path), config=r'--oem 3 --psm 3')
            if len(text_original.strip()) > len(best_text.strip()):
                best_text = text_original

        return best_text.strip()

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
