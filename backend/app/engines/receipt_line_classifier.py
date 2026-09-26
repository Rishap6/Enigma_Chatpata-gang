import re
from typing import Dict, Any

# Regular expression patterns for deterministic line classification
SUBTOTAL_PATTERN = re.compile(
    r"\b(sub[\s-]*total|net[\s-]*total|items[\s-]*total|items[\s-]*count|sub[\s-]*tot)\b",
    re.IGNORECASE,
)

TOTAL_PATTERN = re.compile(
    r"\b(grand[\s-]*total|total[\s-]*amount|balance[\s-]*due|amount[\s-]*payable|bill[\s-]*total|final[\s-]*total|invoice[\s-]*total|\btotal\b)\b",
    re.IGNORECASE,
)

TAX_PATTERN = re.compile(
    r"\b(gst|cgst|sgst|igst|vat|sales[\s-]*tax|service[\s-]*tax|taxable[\s-]*val|tax[\s-]*amount|\btax\b)\b",
    re.IGNORECASE,
)

DISCOUNT_PATTERN = re.compile(
    r"\b(discount|disc|promo|savings|coupon|offer|rebate|cashback|saved)\b",
    re.IGNORECASE,
)

PAYMENT_PATTERN = re.compile(
    r"\b(cash|card|credit|debit|visa|mastercard|rupay|amex|upi|gpay|phonepe|paytm|wallet|change|tendered|paid|auth[\s-]*code|txn|trans)\b",
    re.IGNORECASE,
)

STORE_METADATA_PATTERN = re.compile(
    r"\b(thank[\s-]*you|welcome|visit[\s-]*again|supermarket|hypermarket|grocers|grocery|mart|retail|store|ltd|pvt|corp|"
    r"gstin|fssai|cin|tax[\s-]*invoice|invoice[\s-]*no|bill[\s-]*no|receipt[\s-]*no|token[\s-]*no|order[\s-]*no|"
    r"cashier|counter|pos|terminal|date|time|ph|phone|tel|email|www|\.com|\.in|address|road|street|nagar|floor|mall|"
    r"bangalore|bengaluru|delhi|mumbai|chennai|hyderabad|pune|kolkata|india|\bind\b|tax\s*invoice)\b",
    re.IGNORECASE,
)

DATE_PATTERN = re.compile(
    r"\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b"
)

SEPARATOR_PATTERN = re.compile(r"^[-=_*#.\s]{3,}$")
PRICE_PATTERN = re.compile(
    r"(?:(?:₹|\$|Rs\.?|INR)\s*(\d{1,6}(?:\.\d{1,2})?)|(?:\s+(\d{1,6}\.\d{2}))|(?:\s+(\d{1,5})))\s*$",
    re.IGNORECASE,
)
QUANTITY_PATTERN = re.compile(
    r"^\s*(\d+(\.\d+)?)\s*(?:x|\*|pcs|pc|kg|g|gm|ml|l|ltr|pk|pack)\b",
    re.IGNORECASE,
)


def classify_receipt_line(line: str) -> Dict[str, Any]:
    """Classifies a single line of receipt text into:
    - 'product': Grocery item candidate
    - 'subtotal': Subtotal line
    - 'total': Grand total line
    - 'tax': Tax / GST / VAT line
    - 'discount': Discount / savings line
    - 'payment': Payment / card / change line
    - 'store_metadata': Header / store name / cashier / phone / invoice metadata
    - 'separator': Decorative line of dashes or equals
    - 'quantity': Standalone quantity multiplier line
    - 'unknown': Unrecognized line
    """
    clean = line.strip()
    if not clean:
        return {"line_type": "unknown", "is_product": False, "confidence": 0.0}

    # 1. Separator lines (e.g. "-------------------")
    if SEPARATOR_PATTERN.match(clean):
        return {"line_type": "separator", "is_product": False, "confidence": 0.99}

    # 2. Subtotal lines
    if SUBTOTAL_PATTERN.search(clean):
        return {"line_type": "subtotal", "is_product": False, "confidence": 0.98}

    # 3. Grand Total lines
    if TOTAL_PATTERN.search(clean):
        return {"line_type": "total", "is_product": False, "confidence": 0.98}

    # 4. Tax lines (GST, CGST, SGST, VAT)
    if TAX_PATTERN.search(clean):
        return {"line_type": "tax", "is_product": False, "confidence": 0.95}

    # 5. Discount lines
    if DISCOUNT_PATTERN.search(clean):
        return {"line_type": "discount", "is_product": False, "confidence": 0.95}

    # 6. Payment methods (Cash, Card, UPI, Change)
    if PAYMENT_PATTERN.search(clean):
        return {"line_type": "payment", "is_product": False, "confidence": 0.95}

    # 7. Date lines (e.g. "DATE: 2026-09-20" or "20/09/2026")
    if DATE_PATTERN.search(clean) or re.search(r"^\s*(date|time|dt)\b", clean, re.IGNORECASE):
        return {"line_type": "store_metadata", "is_product": False, "confidence": 0.95}

    # 8. Store metadata / Headers / Invoice details / Location
    if STORE_METADATA_PATTERN.search(clean) and not PRICE_PATTERN.search(clean):
        return {"line_type": "store_metadata", "is_product": False, "confidence": 0.90}

    # 9. Standalone quantity line (e.g. "2 x 40.00" or "1 PC")
    if QUANTITY_PATTERN.match(clean) and not re.search(r"[A-Za-z]{4,}", clean):
        return {"line_type": "quantity", "is_product": False, "confidence": 0.85}

    # 10. Product line candidate:
    # Contains text / item name, usually accompanied by an end-of-line price
    has_letters = bool(re.search(r"[A-Za-z]", clean))
    has_price = bool(PRICE_PATTERN.search(clean))

    # Reject if it matches store metadata keywords even with price if no explicit food-like words
    if STORE_METADATA_PATTERN.search(clean) and not has_price:
        return {"line_type": "store_metadata", "is_product": False, "confidence": 0.85}

    if has_letters:
        # If it has alphabetic text and doesn't match the exclusion rules, it's a product candidate
        confidence = 0.90 if has_price else 0.75
        return {"line_type": "product", "is_product": True, "confidence": confidence}

    return {"line_type": "unknown", "is_product": False, "confidence": 0.40}
