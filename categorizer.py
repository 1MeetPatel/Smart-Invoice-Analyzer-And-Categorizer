"""
Expense Categorizer Module
Rule-based keyword matching to categorize invoices into expense types.
"""


# Category definitions with associated keywords
CATEGORIES = {
    'Utilities': [
        'electricity', 'electric', 'power', 'water', 'gas', 'internet',
        'phone', 'telephone', 'telecom', 'broadband', 'wifi', 'wi-fi',
        'cable', 'utility', 'utilities', 'energy', 'heating', 'sewage',
        'mobile', 'cellular', 'airtel', 'jio', 'vodafone', 'bsnl',
        'comcast', 'at&t', 'verizon', 'spectrum'
    ],
    'Office Supplies': [
        'paper', 'ink', 'stationery', 'printer', 'toner', 'cartridge',
        'pen', 'pencil', 'notebook', 'folder', 'stapler', 'envelope',
        'office', 'supplies', 'desk', 'chair', 'furniture', 'whiteboard',
        'marker', 'tape', 'glue', 'scissors', 'binder', 'post-it',
        'amazon', 'staples', 'office depot'
    ],
    'Travel & Transport': [
        'flight', 'airline', 'airfare', 'hotel', 'motel', 'lodging',
        'taxi', 'uber', 'lyft', 'ola', 'cab', 'rental', 'car rental',
        'parking', 'toll', 'fuel', 'petrol', 'diesel', 'gasoline',
        'train', 'railway', 'bus', 'transit', 'metro', 'subway',
        'boarding', 'accommodation', 'travel', 'trip', 'booking',
        'makemytrip', 'expedia', 'airbnb', 'marriott', 'hilton'
    ],
    'Food & Dining': [
        'restaurant', 'catering', 'meals', 'food', 'grocery', 'groceries',
        'dining', 'lunch', 'dinner', 'breakfast', 'snack', 'beverage',
        'coffee', 'tea', 'cafe', 'cafeteria', 'canteen', 'delivery',
        'zomato', 'swiggy', 'doordash', 'ubereats', 'grubhub',
        'mcdonald', 'starbucks', 'dominos', 'pizza', 'burger'
    ],
    'Software & IT': [
        'software', 'license', 'subscription', 'saas', 'hosting',
        'domain', 'cloud', 'server', 'aws', 'azure', 'google cloud',
        'microsoft', 'adobe', 'slack', 'zoom', 'github', 'gitlab',
        'antivirus', 'security', 'ssl', 'database', 'api', 'plugin',
        'app', 'application', 'digital', 'technology', 'tech',
        'dropbox', 'salesforce', 'atlassian', 'jira', 'confluence'
    ],
    'Professional Services': [
        'consulting', 'consultant', 'legal', 'lawyer', 'attorney',
        'accounting', 'accountant', 'audit', 'auditor', 'advisory',
        'professional', 'service', 'freelance', 'contractor', 'agency',
        'notary', 'compliance', 'tax preparation', 'bookkeeping',
        'hr', 'human resources', 'recruitment', 'staffing', 'payroll'
    ],
    'Marketing & Advertising': [
        'advertising', 'advertisement', 'ads', 'ad', 'campaign',
        'social media', 'seo', 'marketing', 'promotion', 'branding',
        'print', 'billboard', 'banner', 'flyer', 'brochure',
        'google ads', 'facebook ads', 'instagram', 'linkedin',
        'pr', 'public relations', 'media', 'sponsorship', 'event'
    ],
    'Maintenance & Repairs': [
        'repair', 'maintenance', 'cleaning', 'janitorial', 'plumbing',
        'electrical', 'hvac', 'air conditioning', 'pest control',
        'landscaping', 'painting', 'renovation', 'construction',
        'handyman', 'service call', 'inspection', 'warranty'
    ],
    'Insurance': [
        'insurance', 'premium', 'policy', 'coverage', 'claim',
        'health insurance', 'life insurance', 'auto insurance',
        'property insurance', 'liability', 'indemnity', 'underwriting'
    ],
    'Medical & Healthcare': [
        'medical', 'healthcare', 'hospital', 'clinic', 'doctor',
        'pharmacy', 'medicine', 'prescription', 'lab', 'laboratory',
        'diagnostic', 'dental', 'vision', 'optometry', 'therapy',
        'ambulance', 'health', 'wellness', 'physiotherapy'
    ],
}


def categorize_invoice(vendor_name, raw_text, total_amount=None):
    """
    Categorize an invoice based on vendor name and OCR text content.
    Uses keyword matching with weighted scoring.

    Args:
        vendor_name: Extracted vendor/company name
        raw_text: Full OCR text from the invoice
        total_amount: Optional total amount (unused for now, reserved for ML)

    Returns:
        dict with 'category' and 'confidence' keys
    """
    if not raw_text and not vendor_name:
        return {'category': 'Uncategorized', 'confidence': 0.0}

    # Combine vendor name and raw text for matching
    search_text = f"{vendor_name} {raw_text}".lower()

    scores = {}

    for category, keywords in CATEGORIES.items():
        score = 0
        matched_keywords = []

        for keyword in keywords:
            keyword_lower = keyword.lower()

            # Check vendor name first (higher weight)
            if keyword_lower in vendor_name.lower():
                score += 3
                matched_keywords.append(keyword)

            # Check full text
            count = search_text.count(keyword_lower)
            if count > 0:
                score += count
                if keyword not in matched_keywords:
                    matched_keywords.append(keyword)

        if score > 0:
            scores[category] = {
                'score': score,
                'matched_keywords': matched_keywords
            }

    if not scores:
        return {'category': 'Uncategorized', 'confidence': 0.0}

    # Find the best category
    best_category = max(scores, key=lambda k: scores[k]['score'])
    best_score = scores[best_category]['score']

    # Calculate confidence (normalized)
    total_score = sum(s['score'] for s in scores.values())
    confidence = round(best_score / total_score, 2) if total_score > 0 else 0.0

    return {
        'category': best_category,
        'confidence': confidence,
        'matched_keywords': scores[best_category]['matched_keywords'][:5]
    }


def get_all_categories():
    """Return list of all available category names."""
    return list(CATEGORIES.keys()) + ['Uncategorized']
