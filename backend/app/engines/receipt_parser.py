import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.engines.receipt_line_classifier import classify_receipt_line

# Regex patterns for price, quantity, and date extraction
LINE_PRICE_PATTERN = re.compile(
    r"(?:(?:₹|\$|Rs\.?|INR)\s*(\d{1,6}(?:\.\d{1,2})?)|(?:\s+(\d{1,6}\.\d{2}))|(?:\s+(\d{1,5})))\s*$",
    re.IGNORECASE,
)

QUANTITY_PREFIX_PATTERN = re.compile(
    r"^\s*(\d+(?:\.\d+)?)\s*(?:x|\*)\s*(.+)$",
    re.IGNORECASE,
)

QUANTITY_INLINE_PATTERN = re.compile(
    r"(?:(\d+(?:\.\d+)?)\s*(?:x|\*|pcs|pc)\s*(?:@\s*)?(?:₹|\$|Rs\.?|INR)?\s*(\d+(?:\.\d{2})?))",
    re.IGNORECASE,
)

DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b"),  # DD/MM/YYYY or MM/DD/YYYY
    re.compile(r"\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b"),  # YYYY-MM-DD
    re.compile(r"\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b", re.IGNORECASE),
]


def extract_date(text: str) -> Optional[datetime]:
    """Attempts to extract a valid purchase date from receipt text."""
    for pattern in DATE_PATTERNS:
        match = pattern.search(text)
        if match:
            try:
                groups = match.groups()
                if len(groups) == 3 and groups[1].isalpha():
                    # Format: 26 Sep 2026
                    date_str = f"{groups[0]} {groups[1][:3]} {groups[2]}"
                    return datetime.strptime(date_str, "%d %b %Y").replace(tzinfo=timezone.utc)
                elif len(groups[0]) == 4:
                    # Format: 2026-09-26
                    return datetime(int(groups[0]), int(groups[1]), int(groups[2]), tzinfo=timezone.utc)
                else:
                    # Format: DD/MM/YYYY
                    day, month, year = int(groups[0]), int(groups[1]), int(groups[2])
                    # Basic sanity check
                    if 1 <= month <= 12 and 1 <= day <= 31:
                        return datetime(year, month, day, tzinfo=timezone.utc)
            except Exception:
                continue
    return None


def extract_price_from_line(line: str) -> tuple[Optional[float], str]:
    """Extracts trailing price and cleaned line text."""
    match = LINE_PRICE_PATTERN.search(line)
    if match:
        for g in match.groups():
            if g is not None:
                try:
                    price_val = float(g)
                    cleaned_line = line[: match.start()].strip()
                    return price_val, cleaned_line
                except ValueError:
                    pass
    return None, line


def parse_receipt_text(raw_text: str) -> Dict[str, Any]:
    """Parses raw OCR text into individual grocery line items and receipt metadata:
    1. Segments lines
    2. Filters non-product lines (subtotal, tax, discounts, store headers, payment info)
    3. Extracts item names, prices, and quantities
    4. Extracts purchase date and monetary totals if present
    """
    if not raw_text:
        return {
            "items": [],
            "metadata": {
                "subtotal": None,
                "tax": None,
                "grand_total": None,
                "purchase_date": None,
                "total_lines_read": 0,
                "product_lines_detected": 0,
            },
        }

    raw_lines = raw_text.splitlines()
    items: List[Dict[str, Any]] = []

    subtotal_val: Optional[float] = None
    tax_val: Optional[float] = None
    grand_total_val: Optional[float] = None
    purchase_date: Optional[datetime] = extract_date(raw_text)

    line_number = 1

    for raw_line in raw_lines:
        line_clean = raw_line.strip()
        if not line_clean:
            continue

        classification = classify_receipt_line(line_clean)
        line_type = classification["line_type"]

        # Extract totals from non-product lines
        if line_type in ("subtotal", "total"):
            price, _ = extract_price_from_line(line_clean)
            if price is not None:
                if line_type == "total" or ("total" in line_clean.lower() and "sub" not in line_clean.lower()):
                    grand_total_val = price
                else:
                    subtotal_val = price
            continue

        if line_type == "tax":
            price, _ = extract_price_from_line(line_clean)
            if price is not None:
                tax_val = round((tax_val or 0.0) + price, 2)
            continue

        if not classification["is_product"]:
            # Skip separator, payment, store metadata, discount lines
            continue

        # Process product line
        total_price, item_name_part = extract_price_from_line(line_clean)
        quantity = 1.0
        unit_price = total_price

        # Check for quantity prefix (e.g. "2 x BRIT NUTR CHC 40G")
        qty_match = QUANTITY_PREFIX_PATTERN.match(item_name_part)
        if qty_match:
            try:
                quantity = float(qty_match.group(1))
                item_name_part = qty_match.group(2).strip()
                if total_price and quantity > 0:
                    unit_price = round(total_price / quantity, 2)
            except ValueError:
                pass

        # Check for inline quantity (e.g. "BRIT NUTR CHC 40G 2 x 40.00")
        inline_match = QUANTITY_INLINE_PATTERN.search(item_name_part)
        if inline_match:
            try:
                q_val = float(inline_match.group(1))
                u_val = float(inline_match.group(2))
                quantity = q_val
                unit_price = u_val
                # Strip quantity substring from item name
                item_name_part = (
                    item_name_part[: inline_match.start()] + item_name_part[inline_match.end() :]
                ).strip()
            except ValueError:
                pass

        product_name_raw = item_name_part.strip()
        # If product name is empty or only punctuation, discard
        if not re.search(r"[A-Za-z0-9]", product_name_raw):
            continue

        items.append(
            {
                "line_number": line_number,
                "raw_text": line_clean,
                "product_name_raw": product_name_raw,
                "quantity": quantity,
                "unit_price": unit_price,
                "total_price": total_price,
                "currency": "INR",
            }
        )
        line_number += 1

    return {
        "items": items,
        "metadata": {
            "subtotal": subtotal_val,
            "tax": tax_val,
            "grand_total": grand_total_val,
            "purchase_date": purchase_date.isoformat() if purchase_date else None,
            "total_lines_read": len(raw_lines),
            "product_lines_detected": len(items),
        },
    }
