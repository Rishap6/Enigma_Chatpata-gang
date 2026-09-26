import re
import unicodedata
from typing import Dict, Any, Optional

# Common receipt/OCR food abbreviations map
ABBREVIATION_MAP = {
    "brit": "britannia",
    "bisc": "biscuit",
    "bis": "biscuit",
    "chc": "choice",
    "choc": "chocolate",
    "nutr": "nutrichoice",
    "dig": "digestive",
    "veg": "vegetable",
    "prot": "protein",
    "pwd": "powder",
    "whl": "whole",
    "chk": "chicken",
    "buttr": "butter",
    "crm": "cream",
    "sw": "sweet",
    "str": "strawberry",
    "strw": "strawberry",
    "org": "organic",
}

# Compound abbreviations
COMPOUND_PATTERNS = [
    (re.compile(r"\bnutr\s+chc\b", re.IGNORECASE), "nutrichoice"),
    (re.compile(r"\bnutri\s+chc\b", re.IGNORECASE), "nutrichoice"),
    (re.compile(r"\bnutr\s+choice\b", re.IGNORECASE), "nutrichoice"),
]

# Regex to strip package weight/volume artifacts (e.g. 40G, 100ML, 500GM, 1KG, 250G)
PACK_SIZE_PATTERN = re.compile(r"\b\d+(\.\d+)?\s*(g|gm|gms|kg|kgs|ml|l|ltr|oz|pk|pack|pcs|pc)\b", re.IGNORECASE)


def normalize_product_name(text: str) -> Dict[str, Any]:
    """Normalizes product name from raw input or OCR label:
    1. Unicode normalization (NFKD)
    2. Lowercase
    3. Strip packaging sizes / weights (e.g. '40G', '100ML')
    4. Remove punctuation & special characters
    5. Expand common grocery receipt abbreviations and compounds
    6. Collapse repeated whitespace
    """
    if not text:
        return {
            "normalized_name": "",
            "cleaned_text": "",
            "confidence": 0.0,
        }

    # 1. Unicode normalization
    norm = unicodedata.normalize("NFKD", text).lower().strip()

    # 2. Compound replacements (e.g. "nutr chc" -> "nutrichoice")
    for pat, rep in COMPOUND_PATTERNS:
        norm = pat.sub(rep, norm)

    # 3. Remove packaging units/weights
    norm_no_units = PACK_SIZE_PATTERN.sub(" ", norm)

    # 4. Replace common delimiters with space
    norm_clean = re.sub(r"[\-_/\\,;:()[\]{}*+&#!@$%^~`\"\'|<>?]", " ", norm_no_units)

    # 5. Tokenize and expand abbreviations
    tokens = norm_clean.split()
    expanded_tokens = []
    for tok in tokens:
        expanded_tokens.append(ABBREVIATION_MAP.get(tok, tok))

    cleaned_text = " ".join(expanded_tokens).strip()

    return {
        "normalized_name": cleaned_text,
        "cleaned_text": cleaned_text,
        "raw_input": text,
        "confidence": 0.95 if cleaned_text else 0.0,
    }
