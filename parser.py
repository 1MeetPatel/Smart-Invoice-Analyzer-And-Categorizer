"""
Invoice Parser Module
Extracts structured fields from raw OCR text using regex patterns.
"""

import re
from datetime import datetime


def extract_invoice_number(text):
    """Extract invoice number from text using multiple patterns."""
    patterns = [
        # "Invoice Number: INV-2024-00847" or "Invoice No: 12345"
        r'(?:Invoice|Inv)[\s]*(?:No|Number|#|Num)[\s]*[:\-\.]?\s*([A-Za-z0-9\-\/]+(?:[\-\/][A-Za-z0-9]+)*)',
        # "INV-12345" standalone
        r'(INV[\-\s]?\d[\w\-]*)',
        # "Bill No: 12345"
        r'(?:Bill|Receipt)[\s]*(?:No|Number|#)?[\s]*[:\-\.]?\s*([A-Za-z0-9\-\/]+)',
        # "#12345"
        r'#\s*(\d{3,})',
        # "Reference: ABC-123"
        r'(?:Reference|Ref)[\s]*[:\-\.]?\s*([A-Za-z0-9\-\/]+)',
        # "Order No: 12345"
        r'(?:Order)[\s]*(?:No|Number|#|ID)?[\s]*[:\-\.]?\s*([A-Za-z0-9\-\/]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result = match.group(1).strip()
            # Validate: should be at least 2 chars
            if len(result) >= 2:
                return result

    return "N/A"


def extract_date(text):
    """Extract date from text, supporting multiple formats."""
    date_patterns = [
        # DD/MM/YYYY or DD-MM-YYYY
        (r'(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})', '%d/%m/%Y'),
        # YYYY-MM-DD (ISO format)
        (r'(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})', '%Y/%m/%d'),
        # Month DD, YYYY
        (r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s+(\d{1,2}),?\s+(\d{4})', None),
        # DD Month YYYY
        (r'(\d{1,2})\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s+(\d{4})', None),
    ]

    # Try specific date label patterns first
    label_patterns = [
        r'(?:Invoice\s*)?(?:Date|Dated|Issue\s*Date)[\s]*[:\-\.]?\s*(.+?)(?:\n|$)',
        r'(?:Bill\s*Date|Due\s*Date)[\s]*[:\-\.]?\s*(.+?)(?:\n|$)',
    ]

    for label_pattern in label_patterns:
        label_match = re.search(label_pattern, text, re.IGNORECASE)
        if label_match:
            date_str = label_match.group(1).strip()[:30]  # Limit length

            # Try parsing various date formats from the matched string
            for date_pattern, _ in date_patterns:
                match = re.search(date_pattern, date_str, re.IGNORECASE)
                if match:
                    return match.group(0).strip()

    # Fall back to finding any date in the text
    for date_pattern, _ in date_patterns:
        match = re.search(date_pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()

    return "N/A"


def extract_amount(text, field_type='total'):
    """
    Extract monetary amounts from text.
    field_type: 'total', 'subtotal', 'tax'
    """
    if field_type == 'total':
        patterns = [
            r'(?:Total\s*(?:Amount|Due|Payable)?|Grand\s*Total|Amount\s*Due|Balance\s*Due|Net\s*Amount)[\s]*[:\-\.]?\s*[\$€£₹]?\s*([\d,]+\.?\d*)',
            r'(?:Total)[\s]*[:\-\.]?\s*[\$€£₹]?\s*([\d,]+\.?\d*)',
        ]
    elif field_type == 'subtotal':
        patterns = [
            r'(?:Sub\s*[-\s]?\s*Total|Before\s*Tax)[\s]*[:\-\.]?\s*[\$€£₹]?\s*([\d,]+\.?\d*)',
        ]
    elif field_type == 'tax':
        patterns = [
            r'(?:Tax|VAT|GST|Sales\s*Tax|Service\s*Tax|CGST|SGST|IGST)[\s]*(?:\(\d+%?\))?[\s]*[:\-\.]?\s*[\$€£₹]?\s*([\d,]+\.?\d*)',
        ]
    else:
        return "0.00"

    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            # Return the largest amount found (most likely the total)
            amounts = []
            for m in matches:
                try:
                    cleaned = m.replace(',', '')
                    amount = float(cleaned)
                    if amount > 0:
                        amounts.append(amount)
                except ValueError:
                    continue

            if amounts:
                if field_type == 'total':
                    return f"{max(amounts):.2f}"
                else:
                    return f"{amounts[0]:.2f}"

    return "0.00"


def extract_vendor_name(text):
    """
    Extract vendor/company name from the invoice.
    Uses heuristics: looks for 'Bill From', 'From:', or first prominent line.
    """
    # Try explicit vendor labels
    vendor_patterns = [
        r'(?:Bill\s*From|Sold\s*By|Vendor|Seller|Company|From|Supplier)[\s]*[:\-\.]?\s*(.+?)(?:\n|$)',
        r'(?:Business\s*Name|Firm|Organization)[\s]*[:\-\.]?\s*(.+?)(?:\n|$)',
    ]

    for pattern in vendor_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            vendor = match.group(1).strip()
            # Clean up: remove trailing special chars
            vendor = re.sub(r'[,\.\|]+$', '', vendor).strip()
            if len(vendor) >= 2 and len(vendor) <= 100:
                return vendor

    # Heuristic: use the first non-empty, non-numeric line
    lines = text.split('\n')
    for line in lines[:5]:  # Check first 5 lines
        line = line.strip()
        if not line:
            continue
        # Skip lines that are mostly numbers or dates
        if re.match(r'^[\d\s\-\/\.\$€£₹,%]+$', line):
            continue
        # Skip lines that are common headers
        if re.match(r'^\s*(invoice|bill|receipt|tax|date|page)\s*', line, re.IGNORECASE):
            continue
        # Likely a company name
        if len(line) >= 3 and len(line) <= 80:
            return line.strip()

    return "Unknown Vendor"


def parse_invoice(raw_text):
    """
    Main parsing function: extract all fields from raw OCR text.
    Returns a structured dictionary.
    """
    if not raw_text or len(raw_text.strip()) < 5:
        return {
            'invoice_number': 'N/A',
            'date': 'N/A',
            'vendor': 'Unknown',
            'subtotal': '0.00',
            'tax': '0.00',
            'total': '0.00',
            'raw_text': raw_text or '',
            'status': 'error',
            'message': 'Insufficient text extracted from document'
        }

    result = {
        'invoice_number': extract_invoice_number(raw_text),
        'date': extract_date(raw_text),
        'vendor': extract_vendor_name(raw_text),
        'subtotal': extract_amount(raw_text, 'subtotal'),
        'tax': extract_amount(raw_text, 'tax'),
        'total': extract_amount(raw_text, 'total'),
        'raw_text': raw_text,
        'status': 'success',
        'message': 'Invoice parsed successfully'
    }

    return result
