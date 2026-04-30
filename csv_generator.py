"""
CSV Generator Module
Generates structured CSV files from parsed invoice data.
"""

import csv
import os
from datetime import datetime


def generate_csv(invoice_records, export_dir='exports'):
    """
    Generate a CSV file from a list of parsed invoice records.

    Args:
        invoice_records: List of dicts with invoice fields
        export_dir: Directory to save the CSV file

    Returns:
        dict with 'filename' and 'filepath' keys
    """
    # Ensure export directory exists
    os.makedirs(export_dir, exist_ok=True)

    # Generate timestamped filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'invoices_{timestamp}.csv'
    filepath = os.path.join(export_dir, filename)

    # Define CSV columns (Simplified as requested)
    fieldnames = [
        'Invoice ID',
        'Date (MM/DD/YYYY)           ', # Long header forces Excel to widen column
        'Product',
        'Amount',
        'Tax / VAT',
        'Seller TaxID',
        'Buyer TaxID',
        'Vendor Name',
        'Confidence'
    ]

    try:
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for record in invoice_records:
                row = {
                    'Invoice ID': record.get('invoice_number', 'N/A'),
                    'Date (MM/DD/YYYY)           ': f" {record.get('date', 'N/A')}", # Leading space forces Excel to treat as text
                    'Product': record.get('product', 'N/A'),
                    'Amount': record.get('total', '0.00'),
                    'Tax / VAT': record.get('tax', '0.00'),
                    'Seller TaxID': record.get('tax_id', 'N/A'),
                    'Buyer TaxID': record.get('buyer_id', 'N/A'),
                    'Vendor Name': record.get('vendor', 'Unknown'),
                    'Confidence': record.get('confidence', '0.0'),
                }
                writer.writerow(row)

        return {
            'filename': filename,
            'filepath': filepath,
            'record_count': len(invoice_records),
            'status': 'success'
        }

    except Exception as e:
        return {
            'filename': None,
            'filepath': None,
            'record_count': 0,
            'status': 'error',
            'message': str(e)
        }
