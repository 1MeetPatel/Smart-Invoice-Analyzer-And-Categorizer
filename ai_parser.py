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

def parse_with_gemini(file_path):
    """
    Uses Google Gemini to extract structured data from an invoice (Image or PDF).
    High-fidelity fallback for complex layouts.
    """
    if not API_KEY:
        return {"status": "error", "message": "Google API Key not configured"}

    try:
        # 1. Initialize the model
        model = genai.GenerativeModel('gemini-1.5-flash')

        # 2. Prepare the content
        ext = os.path.splitext(file_path)[1].lower()
        content = []
        
        # Create the prompt
        prompt = """
        Analyze this invoice and extract the following information in JSON format.
        Focus on HIGH PRECISION for these specific fields.
        
        ### JSON SCHEMA:
        - invoice_number: (string, the unique ID of the invoice)
        - date: (string, format YYYY-MM-DD)
        - product: (string, describe WHAT KIND of product/service this is)
        - total: (number, the final GRAND TOTAL amount due)
        - subtotal: (number, total before tax)
        - tax: (number, total tax amount)
        - tax_id: (string, the Seller's Tax ID)
        - buyer_id: (string, the Buyer's Tax ID if present)
        - vendor: (string, the name of the seller)
        - category: (string: Food, Utilities, Software, Marketing, Office, Travel, Other)
        
        ### CRITICAL RULES:
        - Return ONLY raw JSON.
        - Ensure numeric values are numbers, not strings.
        - If a value is missing, use null or 0.
        """
        content.append(prompt)

        if ext == '.pdf':
            # Handle PDF
            with open(file_path, "rb") as f:
                pdf_data = f.read()
            content.append({
                "mime_type": "application/pdf",
                "data": pdf_data
            })
        else:
            # Handle Image
            img = Image.open(file_path)
            img.load()
            content.append(img)

        # 3. Generate content with Retry for Quota
        import time
        max_retries = 3
        for i in range(max_retries):
            try:
                response = model.generate_content(content)
                break
            except Exception as e:
                if "429" in str(e) and i < max_retries - 1:
                    time.sleep(2)
                    continue
                raise e
        
        # 4. Parse the JSON response
        raw_text = response.text.strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(raw_text)
        
        # Data Normalization
        for field in ['total', 'subtotal', 'tax']:
            if field in data and isinstance(data[field], str):
                try:
                    data[field] = float(data[field].replace(',', ''))
                except:
                    data[field] = 0.0
            elif field not in data:
                data[field] = 0.0
        
        data['status'] = 'success'
        data['confidence'] = 0.99
        data['source'] = 'gemini'
        
        return data

    except Exception as e:
        return {"status": "error", "message": f"Gemini Error: {str(e)}"}
