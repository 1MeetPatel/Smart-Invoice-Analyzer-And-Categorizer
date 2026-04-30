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
    Supports multiple formats (DD/MM/YYYY, YYYY-MM-DD, DD-MMM-YYYY, Month DD, YYYY).
    """
    # 1. Labels to prioritize
    date_labels = r'(?:Date|Dated|Issue\s*Date|Bill\s*Date|Inv\s*Date|Issued|On|Period)'
    
    # 2. Comprehensive Date Patterns
    months_pattern = r'(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
    
    date_patterns = [
        r'(\d{1,2}[/\-.\s]+\d{1,2}[/\-.\s]+\d{4})',                 # 12/04/2024, 12-04-2024, 12.04.2024
        r'(\d{4}[/\-.\s]+\d{1,2}[/\-.\s]+\d{1,2})',                 # 2024-04-12
        r'(\d{1,2}[/\-.\s]+' + months_pattern + r'[/\-.\s]+\d{4})', # 12 Apr 2024, 12-April-2024
        r'(' + months_pattern + r'[/\-.\s]+\d{1,2}[/\-.\s,]+\d{4})',# April 12, 2024
    ]
    
    # First pass: Look for patterns immediately following a Date label
    label_pattern = f'{date_labels}[\\s]*[:\\-\\.]?\\s*(' + '|'.join(date_patterns) + ')'
    match = re.search(label_pattern, text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
        
    # Second pass: Look for any date pattern in the text
    for dp in date_patterns:
        matches = re.finditer(dp, text, re.IGNORECASE)
        for m in matches:
            date_str = m.group(0).strip()
            # Sanity check for year
            year_match = re.search(r'\d{4}', date_str)
            if year_match:
                year = int(year_match.group(0))
                if 1990 <= year <= 2030:
                    return date_str

    return "N/A"


def extract_amount(text, field_type='total'):
    """Extract monetary amounts handling European formats and multiple values on one line."""
    if field_type == 'total':
        labels = r'(?:Total|Grand\s*Total|Amount\s*Due|Balance|Payable|Net\s*Amount|Total\s*Incl\s*VAT|Gross\s*worth)'
    elif field_type == 'subtotal':
        labels = r'(?:Sub\s*Total|Before\s*Tax|Taxable\s*Amount|Total\s*Excl\s*VAT|Net\s*worth)'
    elif field_type == 'tax':
        labels = r'(?:Tax|VAT|GST|Sales\s*Tax|CGST|SGST|IGST|Taxes)'
    
    # 1. Label-based search
    # This regex matches the entire line following a label to find multiple amounts
    pattern = f'{labels}[\\s]*[:\\-\\.]?[\\s]*(.*)'
    matches = re.finditer(pattern, text, re.IGNORECASE)
    
    all_found_amounts = []
    
    for match in matches:
        line_content = match.group(1).split('\n')[0] # Only look at the same line
        # Find all number-like strings in this line
        # Matches: 1.234,56, 1 234,56, 1,234.56, 1234.56
        num_matches = re.findall(r'[₹\$€£]?\s*(\d[\d\s.,]*[.,]\d{2})\b', line_content)
        
        line_amounts = []
        for nm in num_matches:
            try:
                # Normalize: remove currency, remove spaces
                clean = nm.strip().replace(' ', '')
                # Handle comma as decimal if it's 2 digits from end
                if ',' in clean and ('.' not in clean or clean.rfind(',') > clean.rfind('.')):
                    clean = clean.replace('.', '').replace(',', '.')
                else:
                    clean = clean.replace(',', '')
                
                val = float(clean)
                if val > 0: line_amounts.append(val)
            except: continue
            
        if line_amounts:
            # If we are looking for total, usually it's the LARGEST on the line (Net + Tax = Gross)
            if field_type == 'total':
                all_found_amounts.append(max(line_amounts))
            else:
                all_found_amounts.append(line_amounts[0])

    if all_found_amounts:
        return max(all_found_amounts) if field_type == 'total' else all_found_amounts[0]

    # 2. Broad Fallback (Largest price-like number on page)
    if field_type == 'total':
        broad_pattern = r'[₹\$€£]?\s*(\d[\d\s.,]*[.,]\d{2})\b'
        matches = re.findall(broad_pattern, text)
        vals = []
        for m in matches:
            try:
                clean = m.strip().replace(' ', '')
                if ',' in clean and ('.' not in clean or clean.rfind(',') > clean.rfind('.')):
                    clean = clean.replace('.', '').replace(',', '.')
                else:
                    clean = clean.replace(',', '')
                val = float(clean)
                if 1990 <= val <= 2030: continue
                if val > 1000000: continue # Skip likely IDs
                vals.append(val)
            except: pass
        
        if vals:
            return max(vals)
            
    return 0.0


def extract_tax_id(text):
    """Extract Tax IDs like VAT, GSTIN, PAN, EIN, etc., filtering out financial labels."""
    patterns = [
        # VAT (European and general)
        r'\b(?:VAT|TVA|MWST|IVA|UID)[\s]*[:\-\.]?[\s]*([A-Z]{2}[A-Z0-9\-]{2,15})\b',
        # GSTIN (India)
        r'\b(?:GST|GSTIN|GST\s*No)[\s]*[:\-\.]?[\s]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b',
        # PAN (India)
        r'\b(?:PAN|Income\s*Tax)[\s]*[:\-\.]?[\s]*([A-Z]{5}[0-9]{4}[A-Z]{1})\b',
        # General Tax ID - Must contain at least one digit and be reasonably long
        r'\b(?:Tax\s*ID|TIN|EIN|Reg\s*No)[\s]*[:\-\.]?[\s]*([A-Z0-9\-]{5,20})(?=\s|$)'
    ]
    
    # Financial labels that often get confused with IDs
    blacklist = ['GROSS', 'TOTAL', 'NET', 'SUBTOTAL', 'AMOUNT', 'INVOICE', 'DATE', 'BILL']
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for m in matches:
            val = m.group(1).strip()
            # 1. Length and noise check
            if val.upper() in blacklist: continue
            # 2. Require at least one digit if it's a general pattern to avoid picking up names
            if 'Tax' in pattern or 'TIN' in pattern or 'Reg' in pattern:
                if not any(c.isdigit() for c in val): continue
            
            return val
            
    return "N/A"


def extract_iban(text):
    """Extract IBAN or Bank Account numbers."""
    # IBAN pattern: country code + 2 check digits + up to 30 alphanumeric (limited spaces)
    iban_pattern = r'\b([A-Z]{2}[0-9]{2}(?:[A-Z0-9]\s?){10,32})\b'
    matches = re.finditer(iban_pattern, text)
    for m in matches:
        # Clean spaces and verify length
        clean = m.group(1).replace(' ', '')
        if 15 <= len(clean) <= 34:
            return clean
    
    # Fallback for account numbers
    acc_pattern = r'(?:Account|Acc|IBAN|BAN)[\s]*[:\-\.]?[\s]*([0-9A-Z\s]{8,20})'
    match = re.search(acc_pattern, text, re.IGNORECASE)
    if match:
        return match.group(1).strip().replace(' ', '')
        
    return "N/A"


def extract_buyer_info(text):
    """Detect buyer/customer/client Tax ID strictly."""
    # Common labels for the recipient
    labels = r'(?:Bill\s*To|Customer|Buyer|Sold\s*To|Recipient|Client|Purchaser)'
    
    # 1. Look for ID labels after buyer/client labels (within 150 chars)
    # This handles "Client: Name \n Address \n VAT: 12345"
    for label in labels.split('|'):
        clean_label = label.replace('(?:', '').replace(')', '')
        pattern = f'{clean_label}[\\s\\w\\n,.]{{0,150}}?(?:VAT|GST|TIN|Tax\\s*ID|Reg|No|#)[\\s]*[:\\-\\.]?[\\s]*([A-Z0-9\\-]{{5,20}})'
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            val = match.group(1).strip()
            if any(c.isdigit() for c in val) and len(val) >= 5:
                if not any(x in val.upper() for x in ['TOTAL', 'GROSS', 'AMOUNT', 'INVOICE', 'DATE']):
                    return val
            
    # 2. General fallback for any Tax ID on the page that wasn't already picked as Seller Tax ID
    # This is a bit risky but helps if labels are messy
    general_ids = re.findall(r'\b(?:VAT|GST|TIN|Tax\s*ID)[\s]*[:\-\.]?[\s]*([A-Z0-9\-]{5,20})\b', text, re.IGNORECASE)
    if len(general_ids) > 1:
        # If there are multiple, the second one is often the buyer's
        return general_ids[1]
    elif len(general_ids) == 1:
        # If there's only one, it might be the seller's, which is handled elsewhere
        pass
        
    return "N/A"


def extract_product(text, vendor_name=""):
    """Attempt to extract a summary of products/services, avoiding headers and vendor name."""
    # Look for common product headers and the content after them
    patterns = [
        r'(?:Description|Item|Product|Service|Details)[\s]*[:\-\.]?\s*([A-Z0-9][\w\s&,]{5,60})',
        r'(?:Qty|Quantity)[\s]*\d+[\s]*([A-Z][\w\s&]{5,40})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            # Blacklist for table headers
            if not any(x in candidate.lower() for x in ['s no', 'serial', 'unit price', 'hsn', 'code', 'total', 'um net', 'net worth']):
                return candidate
            
    # Fallback: Look for any line that looks like a product (not an address, not a label, not vendor)
    lines = text.split('\n')
    noise = ['invoice', 'bill', 'date', 'phone', 'tel', 'email', 'website', 'tax', 'address', 'gstin', 'pan', 'iban', 'id:', 'no:', 's no', 'total', 'subtotal', 'gross', 'amount', 'net worth', 'qty um', 'vat']
    
    # Common words in vendor names to check for overlap
    vendor_words = [w.lower() for w in vendor_name.split() if len(w) > 3]
    
    for line in lines:
        line = line.strip()
        # Skip if line IS the vendor name or contains major parts of it
        if vendor_name and vendor_name.lower() in line.lower(): continue
        if any(w in line.lower() for w in vendor_words): continue
        
        # Products usually have at least 8 chars and are not all numbers
        if 8 <= len(line) <= 60 and not any(n in line.lower() for n in noise) and not re.search(r'\d{4,}', line):
            # Check if it has enough letters to be a description
            if len(re.findall(r'[a-zA-Z]', line)) > 5:
                return line.strip()
                
    return "Service/Product"


def extract_vendor_name(text):
    """Improved vendor detection using header heuristics and common suffixes."""
    # 1. Look for obvious Business Suffixes
    suffixes = r'(?:Inc|Ltd|LLC|Corp|Pvt|Company|Boutique|Services|Solutions|Group|Technologies|Associates|Enterprises|Limited|Corporation|PLC)'
    suffix_pattern = f'([A-Z0-9][\w\s&]{{2,40}}\s{suffixes}\.?)'
    match = re.search(suffix_pattern, text, re.IGNORECASE)
    if match: return match.group(1).strip()

    # 2. Look for common labels
    labels = r'(?:Bill\s*From|From|Vendor|Supplier|Seller|Sold\s*By)'
    pattern = f'{labels}[\\s]*[:\\-\\.]?\\s*([A-Z0-9][\\w\\s&]{{2,40}})'
    match = re.search(pattern, text, re.IGNORECASE)
    if match: return match.group(1).strip()

    # 3. First 10 non-numeric lines in the header
    lines = text.split('\n')
    noise = ['invoice', 'bill', 'date', 'phone', 'tel', 'email', 'website', 'tax', 'address', 'gstin', 'pan', 'iban', 'id:', 'no:']
    for line in lines[:10]:
        line = line.strip()
        if not line: continue
        # print(f"DEBUG Vendor: Checking line: '{line}'")
        # Skip if too short or contains noise
        if len(line) <= 3: continue
        if any(n in line.lower() for n in noise): continue
        if re.match(r'^\d', line): continue
        
        # If line starts with a common label, strip it
        clean_line = re.sub(r'^(?:Seller|Vendor|From|Company|Bill\s*From|Sold\s*By)[\s]*[:\-\.]?\s*', '', line, flags=re.IGNORECASE)
        # print(f"DEBUG Vendor: Returning: '{clean_line}'")
        return clean_line.strip()

    return "Unknown Vendor"


def extract_address(text, owner='vendor'):
    """Extract physical address for vendor or buyer using keywords and common patterns."""
    if owner == 'vendor':
        # Vendor address is usually at the top or near the vendor name
        labels = r'(?:From|Seller|Vendor|Supplier)'
    else:
        labels = r'(?:To|Buyer|Customer|Client|Ship\s*To|Bill\s*To)'
    
    # Pattern: Label followed by multiple lines that look like an address (contain numbers, street names, etc.)
    # This is a complex heuristic for regex
    lines = text.split('\n')
    start_idx = -1
    for i, line in enumerate(lines):
        if re.search(f'{labels}', line, re.IGNORECASE):
            start_idx = i
            break
            
    if start_idx != -1:
        address_lines = []
        for line in lines[start_idx+1:start_idx+5]:
            line = line.strip()
            # Stop if we hit noise or identifiers
            if any(n in line.lower() for n in ['tax', 'iban', 'invoice', 'date', 'total', 'tel:', 'email:']):
                break
            if len(line) > 5:
                address_lines.append(line)
        if address_lines:
            return ", ".join(address_lines)
            
    return "N/A"


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
    tax_id = extract_tax_id(raw_text)
    buyer = extract_buyer_info(raw_text)
    product = extract_product(raw_text, vendor)
    
    # 2. Amount Extraction
    total = extract_amount(raw_text, 'total')
    subtotal = extract_amount(raw_text, 'subtotal')
    tax = extract_amount(raw_text, 'tax')

    # 3. Mathematical Sanity Checks (Keep subtotal/tax in background for math)
    if tax > total and total > 0: tax = 0
    if total > 0 and subtotal == 0: subtotal = total - tax
    if subtotal < 0: subtotal = total; tax = 0
    if total > 0 and tax == 0 and subtotal < total: tax = total - subtotal

    # 4. Confidence Scoring
    confidence = 0.5
    if total > 0: confidence += 0.2
    if vendor != "Unknown Vendor": confidence += 0.1
    if date != "N/A": confidence += 0.1
    if tax_id != "N/A": confidence += 0.05
    if subtotal > 0 and tax >= 0 and abs((subtotal + tax) - total) < 0.1: confidence = 0.98

    return {
        'invoice_number': inv_num,
        'date': date,
        'product': product,
        'vendor': vendor,
        'tax_id': tax_id,
        'buyer_id': buyer,
        'total': f"{total:.2f}",
        'subtotal': f"{subtotal:.2f}",
        'tax': f"{tax:.2f}",
        'confidence': confidence,
        'raw_text': raw_text,
        'status': 'success'
    }
