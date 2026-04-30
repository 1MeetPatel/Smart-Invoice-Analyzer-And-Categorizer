import os
import json
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
API_KEY = os.getenv("GOOGLE_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

def parse_with_gemini(image_path):
    """
    Uses Google Gemini Vision to extract structured data from an invoice image.
    High-fidelity fallback for complex layouts.
    """
    if not API_KEY:
        return {"status": "error", "message": "Google API Key not configured"}

    try:
        # 1. Initialize the model (Updated to use 2.0 Flash)
        model = genai.GenerativeModel('gemini-2.0-flash')

        # 2. Prepare the image - use context manager to avoid file lock on Windows
        img = Image.open(image_path)
        img.load()  # Force load into memory so file handle can be released
        img_copy = img.copy()
        img.close()

        # 3. Create the prompt
        prompt = """
        Analyze this invoice image and extract the following information in JSON format.
        Focus on HIGH PRECISION for these specific fields.
        
        ### JSON SCHEMA:
        - invoice_number: (string, the unique ID of the invoice)
        - date: (string, format YYYY-MM-DD)
        - product: (string, describe WHAT KIND of product/service this is)
        - total: (number, the final GRAND TOTAL amount due. DO NOT pick up months from dates or tax amounts)
        - tax_id: (string, the Seller's Tax ID)
        - buyer_id: (string, the Buyer's Tax ID if present)
        - vendor: (string, the name of the seller)
        - category: (string: Food, Utilities, Software, Marketing, Office, Travel, Other)
        
        ### CRITICAL RULES:
        - TOTAL: Look for "Grand Total", "Total Amount", or "Balance Due". If multiple totals exist, the Grand Total is usually the LARGEST numeric value at the bottom. 
        - DATE: Do not confuse month numbers with the total amount.
        - Return ONLY raw JSON.
        """

        # 4. Generate content with Retry for Quota
        import time
        max_retries = 3
        for i in range(max_retries):
            try:
                response = model.generate_content([prompt, img_copy])
                break
            except Exception as e:
                if "429" in str(e) and i < max_retries - 1:
                    time.sleep(5) # Wait for quota reset
                    continue
                raise e
        
        # 5. Parse the JSON response
        # Clean potential markdown formatting
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text.replace("```json", "").replace("```", "").strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text.replace("```", "").strip()
            
        data = json.loads(raw_text)
        
        # Ensure total is a float
        if isinstance(data.get('total'), str):
            data['total'] = float(data['total'].replace(',', ''))
        
        data['status'] = 'success'
        data['confidence'] = 0.99  # AI vision is high confidence
        data['source'] = 'gemini'
        
        return data

    except Exception as e:
        return {"status": "error", "message": f"Gemini Error: {str(e)}"}
