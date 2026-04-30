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
        'comcast', 'at&t', 'verizon', 'spectrum', 'recharge', 'bill pay'
    ],
    'Office Supplies': [
        'paper', 'ink', 'stationery', 'printer', 'toner', 'cartridge',
        'pen', 'pencil', 'notebook', 'folder', 'stapler', 'envelope',
        'office', 'supplies', 'desk', 'chair', 'furniture', 'whiteboard',
        'marker', 'tape', 'glue', 'scissors', 'binder', 'post-it',
        'amazon', 'staples', 'office depot', 'cart', 'order'
    ],
    'Travel & Transport': [
        'flight', 'airline', 'airfare', 'hotel', 'motel', 'lodging',
        'taxi', 'uber', 'lyft', 'ola', 'cab', 'rental', 'car rental',
        'parking', 'toll', 'fuel', 'petrol', 'diesel', 'gasoline',
        'train', 'railway', 'bus', 'transit', 'metro', 'subway',
        'boarding', 'accommodation', 'travel', 'trip', 'booking',
        'makemytrip', 'expedia', 'airbnb', 'marriott', 'hilton', 'indigo'
    ],
    'Food & Dining': [
        'restaurant', 'catering', 'meals', 'food', 'grocery', 'groceries',
        'dining', 'lunch', 'dinner', 'breakfast', 'snack', 'beverage',
        'coffee', 'tea', 'cafe', 'cafeteria', 'canteen', 'delivery',
        'zomato', 'swiggy', 'doordash', 'ubereats', 'grubhub',
        'mcdonald', 'starbucks', 'dominos', 'pizza', 'burger', 'bakery'
    ],
    'Software & IT': [
        'software', 'license', 'subscription', 'saas', 'hosting',
        'domain', 'cloud', 'server', 'aws', 'azure', 'google cloud',
        'microsoft', 'adobe', 'slack', 'zoom', 'github', 'gitlab',
        'antivirus', 'security', 'ssl', 'database', 'api', 'plugin',
        'app', 'application', 'digital', 'technology', 'tech',
        'dropbox', 'salesforce', 'atlassian', 'jira', 'confluence', 'vps'
    ],
    'Professional Services': [
        'consulting', 'consultant', 'legal', 'lawyer', 'attorney',
        'accounting', 'accountant', 'audit', 'auditor', 'advisory',
        'professional', 'service', 'freelance', 'contractor', 'agency',
        'notary', 'compliance', 'tax preparation', 'bookkeeping',
        'hr', 'human resources', 'recruitment', 'staffing', 'payroll',
        'training', 'certification', 'workshop'
    ],
    'Marketing & Advertising': [
        'advertising', 'advertisement', 'ads', 'ad', 'campaign',
        'social media', 'seo', 'marketing', 'promotion', 'branding',
        'print', 'billboard', 'banner', 'flyer', 'brochure',
        'google ads', 'facebook ads', 'instagram', 'linkedin',
        'pr', 'public relations', 'media', 'sponsorship', 'event', 'digital marketing'
    ],
    'Maintenance & Repairs': [
        'repair', 'maintenance', 'cleaning', 'janitorial', 'plumbing',
        'electrical', 'hvac', 'air conditioning', 'pest control',
        'landscaping', 'painting', 'renovation', 'construction',
        'handyman', 'service call', 'inspection', 'warranty', 'spare parts'
    ],
    'Insurance': [
        'insurance', 'premium', 'policy', 'coverage', 'claim',
        'health insurance', 'life insurance', 'auto insurance',
        'property insurance', 'liability', 'indemnity', 'underwriting', 'lic'
    ],
    'Medical & Healthcare': [
        'medical', 'healthcare', 'hospital', 'clinic', 'doctor',
        'pharmacy', 'medicine', 'prescription', 'lab', 'laboratory',
        'diagnostic', 'dental', 'vision', 'optometry', 'therapy',
        'ambulance', 'health', 'wellness', 'physiotherapy', 'chemist'
    ],
}


def categorize_invoice(vendor_name, raw_text, total_amount=None):
    """
    Categorize an invoice with weighted keyword scoring.
    """
    if not raw_text and not vendor_name:
        return {'category': 'Other', 'confidence': 0.0}

    search_text = f"{vendor_name} {raw_text}".lower()
    scores = {}

    for category, keywords in CATEGORIES.items():
        score = 0
        for keyword in keywords:
            kw = keyword.lower()
            # Vendor name matches are worth much more
            if kw in vendor_name.lower():
                score += 10
            
            # Content matches
            count = search_text.count(kw)
            if count > 0:
                score += (count * 2)

        if score > 0:
            scores[category] = score

    if not scores:
        return {'category': 'Other', 'confidence': 0.0}

    # Best match
    best_cat = max(scores, key=scores.get)
    total_score = sum(scores.values())
    confidence = round(scores[best_cat] / total_score, 2)

    return {
        'category': best_cat,
        'confidence': confidence
    }


def get_all_categories():
    """Return list of all available category names."""
    return list(CATEGORIES.keys()) + ['Other']
