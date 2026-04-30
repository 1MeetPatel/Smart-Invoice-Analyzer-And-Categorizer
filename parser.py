"""
Invoice Parser Module
Extracts structured fields from raw OCR text using regex patterns.
"""

import re
from datetime import datetime


def extract_invoice_number(text):
    """Extract invoice number while filtering out Tax IDs (GSTIN/VAT/PAN)."""
    patterns = [
        # Standard invoice number labels
        r'(?:Invoice|Inv|Bill|Receipt|Order|Reference|Ref)[\s]*(?:No|Number|#|Num|ID)?[\s]*[:\-\.]?\s*([A-Za-z0-9\-\/\.]+)',
        # standalone INV patterns
        r'(INV[\-\s]?\d[\w\-\.]*)',
        # Standalone numeric patterns (e.g. # 12345)
        r'#\s*(\d{4,})',
    ]

    # Labels that indicate it's NOT an invoice number
    tax_labels = r'(?:GST|VAT|PAN|TIN|Tax\s*ID|Reg|Registration|ABN|EIN)'

    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for m in matches:
            result = m.group(1).strip() if m.groups() else m.group(0).strip()
            
            # Context check: Look for tax labels before the match
            start_idx = max(0, m.start() - 25)
            context = text[start_idx:m.start()].lower()
            if any(label.lower() in context for label in tax_labels.split('|')):
                continue

            # Filtering:
            # 1. Clean trailing punctuation
            result = re.sub(r'[\.\-\/]+$', '', result).strip()
            # 2. Length check: Tax IDs are often 12-15 chars, simple invoice numbers are usually shorter or have specific prefixes
            if 3 <= len(result) <= 20:
                # If it's all letters or all numbers (too long), it might be an ID
                if len(result) > 12 and result.isalnum(): continue
                return result

    return "N/A"


def extract_date(text):
    """
    Extract date from text with strict filtering to avoid Tax IDs.
    Supports multiple formats but ignores alphanumeric strings (IDs).
    """
    # 1. Labels to prioritize
    date_labels = r'(?:Date|Dated|Issue\s*Date|Bill\s*Date|Inv\s*Date)'
    # 2. Labels to EXCLUDE (Tax IDs often look like dates)
    tax_labels = r'(?:GST|VAT|TIN|PAN|Tax\s*ID|Reg|No)'

    # Strategy: Find all potential date patterns
    date_patterns = [
        r'\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}',  # 12/04/2024
        r'\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}',  # 2024-04-12
        r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}', # 12 April 2024
        r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}', # April 12, 2024
    ]

    best_match = None
    
    # First pass: Look for patterns immediately following a Date label
    label_pattern = f'{date_labels}[\s]*[:\-\.]?\s*(' + '|'.join(date_patterns) + ')'
    match = re.search(label_pattern, text, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Second pass: Generic search with strict filtering
    for pattern in date_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for m in matches:
            date_str = m.group(0).strip()
            
            # GET CONTEXT: Look at the 20 characters before the match
            start_idx = max(0, m.start() - 20)
            context = text[start_idx:m.start()].lower()
            
            # FILTER 1: If tax labels are in the context, skip it
            if any(label.lower() in context for label in tax_labels.split('|')):
                continue
                
            # FILTER 2: Check if it's part of a longer alphanumeric ID
            # A date shouldn't have letters directly attached to it (except month names)
            surrounding = text[max(0, m.start()-1) : min(len(text), m.end()+1)]
            if re.search(r'[A-Za-z0-9]{10,}', surrounding) and not any(mon in date_str for mon in ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']):
                continue

            # FILTER 3: Sanity check for year
            year_match = re.search(r'\d{4}', date_str)
            if year_match:
                year = int(year_match.group(0))
                if year < 1990 or year > 2030: continue
            
            return date_str

    return "N/A"


def extract_amount(text, field_type='total'):
    """Extract monetary amounts with higher precision and contextual fallback."""
    if field_type == 'total':
        labels = r'(?:Total|Grand\s*Total|Amount\s*Due|Balance|Payable|Net\s*Amount|Total\s*Incl\s*VAT)'
    elif field_type == 'subtotal':
        labels = r'(?:Sub\s*Total|Before\s*Tax|Taxable\s*Amount|Total\s*Excl\s*VAT)'
    elif field_type == 'tax':
        labels = r'(?:Tax|VAT|GST|Sales\s*Tax|CGST|SGST|IGST|Taxes)'
    
    # Pattern: Label followed by currency symbol and amount (supports multi-line gaps)
    pattern = f'{labels}[\s]*[:\-\.]?[\s]*[₹\$€£]?[\s]*([\d,]+\.?\d*)'
    matches = re.findall(pattern, text, re.IGNORECASE)
    
    amounts = []
    if matches:
        for m in matches:
            try:
                # Handle cases like "1.234,56" vs "1,234.56"
                clean_m = m.replace(',', '')
                if '.' in m and m.rfind('.') < m.rfind(','): # European format 1.234,56
                     clean_m = m.replace('.', '').replace(',', '.')
                
                val = float(clean_m)
                if val > 0: amounts.append(val)
            except: continue
    
    if amounts:
        if field_type == 'total':
            return max(amounts)
        return amounts[0]

    # Fallback for Total: Look for the largest number in the document (usually at the bottom)
    if field_type == 'total':
        all_nums = re.findall(r'[₹\$€£]?\s*([\d,]+\.\d{2})\b', text)
        if all_nums:
            vals = []
            for n in all_nums:
                try: vals.append(float(n.replace(',', '')))
                except: pass
            if vals: return max(vals)
            
    return 0.0


def extract_vendor_name(text):
    """Improved vendor detection using header heuristics and common suffixes."""
    # 1. Look for obvious Business Suffixes
    suffixes = r'(?:Inc|Ltd|LLC|Corp|Pvt|Company|Boutique|Services|Solutions|Group|Technologies|Associates|Enterprises|Limited|Corporation|PLC)'
    suffix_pattern = f'([A-Z0-9][\w\s&]{{2,40}}\s{suffixes}\.?)'
    match = re.search(suffix_pattern, text, re.IGNORECASE)
    if match: return match.group(1).strip()

    # 2. Look for common labels
    labels = r'(?:Bill\s*From|From|Vendor|Supplier|Seller|Sold\s*By)'
    pattern = f'{labels}[\s]*[:\-\.]?\s*([A-Z0-9][\w\s&]{{2,40}})'
    match = re.search(pattern, text, re.IGNORECASE)
    if match: return match.group(1).strip()

    # 3. First 3 non-numeric lines in the header
    lines = text.split('\n')
    noise = ['invoice', 'bill', 'date', 'phone', 'tel', 'email', 'website', 'tax', 'address', 'gstin', 'pan']
    for line in lines[:8]:
        line = line.strip()
        if len(line) > 3 and not any(n in line.lower() for n in noise) and not re.match(r'^\d', line):
            # Check if line looks like a title (Capital letters mostly)
            if sum(1 for c in line if c.isupper()) >= 1:
                return line

    return "Unknown Vendor"


def parse_invoice(raw_text):
    """
    Advanced parsing with mathematical cross-verification and reconstruction.
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

    # 3. Mathematical Reconstruction
    # If subtotal and tax are missing but total exists, tax might be 0 or hidden
    if total > 0 and subtotal == 0:
        subtotal = total - tax
    if total > 0 and tax == 0 and subtotal < total:
        tax = total - subtotal

    # 4. Confidence Scoring
    confidence = 0.5
    if total > 0: confidence += 0.2
    if vendor != "Unknown Vendor": confidence += 0.1
    if date != "N/A": confidence += 0.1
    
    # Bonus for math verification
    if subtotal > 0 and tax >= 0 and abs((subtotal + tax) - total) < 0.1:
        confidence = 0.98

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
