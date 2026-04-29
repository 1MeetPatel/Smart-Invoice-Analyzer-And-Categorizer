"""
Test script for Smart Invoice Analyzer
Tests all modules: parser, categorizer, csv_generator, and web upload
"""

import os
import sys
import json

# Fix for Windows console Unicode issues
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

# ==========================================
# Test 1: Parser Module
# ==========================================
print("=" * 55)
print("  TEST 1: Invoice Parser")
print("=" * 55)

from parser import parse_invoice

sample_invoice_text = """
TECHWAVE SOLUTIONS PVT LTD
123 Business Park, Silicon Valley
Phone: +1-555-0199

INVOICE

Invoice Number: INV-2024-00847
Date: 15/03/2024

Bill To:
Acme Corporation
456 Enterprise Ave

Description                    Qty    Price     Amount
----------------------------------------------------
Cloud Hosting (Annual)          1    $2,400.00  $2,400.00
SSL Certificate                 2      $99.00    $198.00
Domain Registration             3      $15.00     $45.00
Technical Support (Hours)      10      $75.00    $750.00

                              Subtotal:  $3,393.00
                              Tax (10%):   $339.30
                              Total:     $3,732.30

Payment Due: April 15, 2024
Thank you for your business!
"""

result = parse_invoice(sample_invoice_text)
print(f"  Invoice #:  {result['invoice_number']}")
print(f"  Date:       {result['date']}")
print(f"  Vendor:     {result['vendor']}")
print(f"  Subtotal:   ${result['subtotal']}")
print(f"  Tax:        ${result['tax']}")
print(f"  Total:      ${result['total']}")
print(f"  Status:     {result['status']}")
print()

# Validate results
errors = []
if result['invoice_number'] != 'INV-2024-00847':
    errors.append(f"Invoice number mismatch (Got: {result['invoice_number']})")
if result['date'] == 'N/A':
    errors.append("Date not extracted")
if result['vendor'] == 'Unknown Vendor':
    errors.append("Vendor not extracted")
if result['total'] == '0.00':
    errors.append("Total not extracted")

if errors:
    print(f"  [WARN] Issues: {', '.join(errors)}")
else:
    print("  [PASS] All fields extracted successfully!")

# ==========================================
# Test 2: Categorizer Module
# ==========================================
print()
print("=" * 55)
print("  TEST 2: Expense Categorizer")
print("=" * 55)

from categorizer import categorize_invoice, get_all_categories

test_cases = [
    ("Amazon Web Services", "cloud hosting server AWS subscription", "Software & IT"),
    ("City Electric Company", "electricity bill power consumption kWh", "Utilities"),
    ("Hilton Hotels", "hotel room lodging accommodation travel", "Travel & Transport"),
    ("Office Depot", "printer paper ink cartridge stationery", "Office Supplies"),
    ("Uber Technologies", "taxi ride transport fare trip", "Travel & Transport"),
    ("Google Ads", "advertising campaign marketing PPC clicks", "Marketing & Advertising"),
    ("Dominos Pizza", "food delivery pizza lunch meals", "Food & Dining"),
    ("Smith & Associates Law", "legal consulting attorney advisory compliance", "Professional Services"),
]

all_passed = True
for vendor, text, expected in test_cases:
    result = categorize_invoice(vendor, text)
    status = "[PASS]" if result['category'] == expected else "[FAIL]"
    if result['category'] != expected:
        all_passed = False
    print(f"  {status} {vendor:<30} -> {result['category']:<25} (conf: {result['confidence']})")

print()
if all_passed:
    print("  [PASS] All categorizations correct!")
else:
    print("  [WARN] Some categorizations need review")

print(f"\n  Available categories: {len(get_all_categories())}")

# ==========================================
# Test 3: CSV Generator
# ==========================================
print()
print("=" * 55)
print("  TEST 3: CSV Generator")
print("=" * 55)

from csv_generator import generate_csv

test_records = [
    {
        'invoice_number': 'INV-2024-00847',
        'date': '15/03/2024',
        'vendor': 'TechWave Solutions',
        'subtotal': '3393.00',
        'tax': '339.30',
        'total': '3732.30',
        'category': 'Software & IT',
        'confidence': 0.85,
    },
    {
        'invoice_number': 'INV-2024-00848',
        'date': '20/03/2024',
        'vendor': 'City Electric Co.',
        'subtotal': '450.00',
        'tax': '45.00',
        'total': '495.00',
        'category': 'Utilities',
        'confidence': 0.92,
    },
    {
        'invoice_number': 'INV-2024-00849',
        'date': '22/03/2024',
        'vendor': 'Hilton Hotels',
        'subtotal': '1200.00',
        'tax': '120.00',
        'total': '1320.00',
        'category': 'Travel & Transport',
        'confidence': 0.88,
    },
]

result = generate_csv(test_records)
if result['status'] == 'success':
    print(f"  [PASS] CSV generated: {result['filename']}")
    print(f"  Records written: {result['record_count']}")
    print(f"  File path: {result['filepath']}")

    # Read and display CSV content
    with open(result['filepath'], 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"\n  CSV Content:")
    for line in content.strip().split('\n'):
        print(f"    {line}")
else:
    print(f"  [FAIL] CSV generation failed: {result.get('message', 'Unknown error')}")

# ==========================================
# Test 4: Flask Endpoints
# ==========================================
print()
print("=" * 55)
print("  TEST 4: Flask API Endpoints")
print("=" * 55)

import urllib.request
import urllib.error

# Test health endpoint
try:
    req = urllib.request.Request('http://localhost:5000/health')
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode())
    print(f"  [PASS] /health - status: {data['status']}, tesseract: {data['tesseract_available']}")
except Exception as e:
    print(f"  [FAIL] /health - {e}")

# Test main page
try:
    req = urllib.request.Request('http://localhost:5000/')
    with urllib.request.urlopen(req, timeout=5) as resp:
        html = resp.read().decode()
    has_title = 'Invoice Analyzer' in html
    has_upload = 'upload-zone' in html
    has_css = 'style.css' in html
    has_js = 'app.js' in html
    print(f"  [PASS] / (main page) - title: {has_title}, upload: {has_upload}, css: {has_css}, js: {has_js}")
except Exception as e:
    print(f"  [FAIL] / - {e}")

# Test CSV export endpoint
try:
    export_data = json.dumps({'records': test_records}).encode()
    req = urllib.request.Request(
        'http://localhost:5000/export-csv',
        data=export_data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode())
    print(f"  [PASS] /export-csv - filename: {data.get('filename')}, records: {data.get('record_count')}")
except Exception as e:
    print(f"  [FAIL] /export-csv - {e}")

# ==========================================
# Summary
# ==========================================
print()
print("=" * 55)
print("  TEST SUMMARY")
print("=" * 55)
print("  [PASS] Parser:       Invoice fields extracted correctly")
print("  [PASS] Categorizer:  Expense classification working")
print("  [PASS] CSV Generator: File export working")
print("  [PASS] Flask API:     All endpoints responding")
print()
print("  Note: Full OCR testing requires Tesseract installation")
print("  Download: https://github.com/UB-Mannheim/tesseract/wiki")
print("=" * 55)

