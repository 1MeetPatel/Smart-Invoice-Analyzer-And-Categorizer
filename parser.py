"""
Invoice Parser Module
Extracts structured fields from raw OCR text using regex patterns.
"""

import re
from datetime import datetime


def extract_invoice_number(text):
    """Extract invoice number from text using multiple patterns."""
    patterns = [
        # Standard invoice number labels
        r'(?:Invoice|Inv|Bill|Receipt|Order|Reference|Ref)[\s]*(?:No|Number|#|Num|ID)?[\s]*[:\-\.]?\s*([A-Za-z0-9\-\/\.]+)',
        # standalone INV patterns
        r'(INV[\-\s]?\d[\w\-\.]*)',
        # Standalone numeric patterns (e.g. # 12345)
        r'#\s*(\d{4,})',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result = match.group(1).strip()
            # Clean trailing punctuation
            result = re.sub(r'[\.\-\/]+$', '', result).strip()
            if len(result) >= 3:
                return result

    return "N/A"


def extract_date(text):
    """Extract date from text, supporting multiple formats and month names."""
    # List of common date labels
    labels = r'(?:Date|Dated|Issue\s*Date|Bill\s*Date|Inv\s*Date)'
    
    # Try with labels first
    label_pattern = f'{labels}[\s]*[:\-\.]?\s*([\d]{{1,2}}[\/\-\.][\d]{{1,2}}[\/\-\.][\d]{{2,4}})'
    match = re.search(label_pattern, text, re.IGNORECASE)
    if match: return match.group(1).strip()

    # Generic date patterns
    date_patterns = [
        r'\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}',  # 12/04/2024
        r'\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}',  # 2024-04-12
        r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}', # 12 April 2024
        r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}', # April 12, 2024
    ]

    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()

    return "N/A"


def extract_amount(text, field_type='total'):
    """Extract monetary amounts with higher precision."""
    if field_type == 'total':
        labels = r'(?:Total|Grand\s*Total|Amount\s*Due|Balance|Payable|Net\s*Amount)'
    elif field_type == 'subtotal':
        labels = r'(?:Sub\s*Total|Before\s*Tax|Taxable\s*Amount)'
    elif field_type == 'tax':
        labels = r'(?:Tax|VAT|GST|Sales\s*Tax|CGST|SGST|IGST)'
    
    # Pattern: Label followed by currency symbol and amount
    pattern = f'{labels}[\s]*[:\-\.]?\s*[₹\$€£]?\s*([\d,]+\.?\d*)'
    matches = re.findall(pattern, text, re.IGNORECASE)
    
    if matches:
        # Convert all matches to floats and return the most logical one
        amounts = []
        for m in matches:
            try:
                val = float(m.replace(',', ''))
                if val > 0: amounts.append(val)
            except: continue
        
        if amounts:
            if field_type == 'total':
                return max(amounts) # Total is usually the largest
            return amounts[0]
            
    return 0.0


def extract_vendor_name(text):
    """Improved vendor detection using header heuristics and common suffixes."""
    # Suffixes that indicate a business name
    suffixes = r'(?:Inc|Ltd|LLC|Corp|Pvt|Company|Boutique|Services|Solutions|Group|Technologies)'
    
    # Try finding lines with business suffixes
    suffix_pattern = f'([A-Z][\w\s&]+ {suffixes}\.?)'
    match = re.search(suffix_pattern, text)
    if match: return match.group(1).strip()

    # Fallback: Look for "Bill From" or first prominent lines
    labels = r'(?:Bill\s*From|From|Vendor|Supplier|Seller)'
    pattern = f'{labels}[\s]*[:\-\.]?\s*([A-Z][\w\s&]+)'
    match = re.search(pattern, text, re.IGNORECASE)
    if match: return match.group(1).strip()

    # Heuristic: First 3 lines that are not headers or numbers
    lines = text.split('\n')
    for line in lines[:5]:
        line = line.strip()
        if len(line) > 3 and not re.match(r'^(Invoice|Bill|Date|#|\d)', line, re.IGNORECASE):
            return line

    return "Unknown Vendor"


def parse_invoice(raw_text):
    """
    Advanced parsing with mathematical cross-verification.
    """
    if not raw_text or len(raw_text.strip()) < 10:
        return {'status': 'error', 'message': 'Low text quality'}

    # 1. Primary Extraction
    vendor = extract_vendor_name(raw_text)
    inv_num = extract_invoice_number(raw_text)
    date = extract_date(raw_text)
    
    # 2. Amount Extraction
    total = extract_amount(raw_text, 'total')
    subtotal = extract_amount(raw_text, 'subtotal')
    tax = extract_amount(raw_text, 'tax')

    # 3. Mathematical Verification (Subtotal + Tax = Total)
    # If the math adds up, we can be extremely confident
    if subtotal > 0 and tax > 0 and abs((subtotal + tax) - total) < 0.1:
        confidence = 0.99
    elif total > 0:
        confidence = 0.85
    else:
        confidence = 0.5

    return {
        'invoice_number': inv_num,
        'date': date,
        'vendor': vendor,
        'subtotal': f"{subtotal:.2f}",
        'tax': f"{tax:.2f}",
        'total': f"{total:.2f}",
        'confidence': confidence,
        'raw_text': raw_text,
        'status': 'success'
    }
