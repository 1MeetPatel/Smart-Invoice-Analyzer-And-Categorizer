import os
import json
from ocr_engine import extract_text
from parser import parse_invoice
from ai_parser import parse_with_gemini

# Test files found in the uploads folder
test_files = [
    r'c:\Users\91704\Desktop\Smart-Invoice-Analyzer-And-Categorizer\uploads\batch1-0002.jpg',
    r'c:\Users\91704\Desktop\Smart-Invoice-Analyzer-And-Categorizer\uploads\batch1-0004.jpg'
]

def debug_file(filepath):
    print(f"\n{'='*50}")
    print(f"DEBUGGING: {os.path.basename(filepath)}")
    print(f"{'='*50}")
    
    # 1. OCR + Regex
    print("\n[STEP 1] OCR + REGEX EXTRACTION...")
    try:
        raw_text = extract_text(filepath)
        regex_result = parse_invoice(raw_text)
        print(json.dumps(regex_result, indent=2))
    except Exception as e:
        print(f"Regex Error: {e}")

    # 2. Gemini AI
    print("\n[STEP 2] GEMINI AI EXTRACTION...")
    try:
        ai_result = parse_with_gemini(filepath)
        print(json.dumps(ai_result, indent=2))
    except Exception as e:
        print(f"AI Error: {e}")

if __name__ == "__main__":
    for f in test_files:
        if os.path.exists(f):
            debug_file(f)
        else:
            print(f"File not found: {f}")
