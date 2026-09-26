"""Shared parsing of raw ingredient label / OCR text into ingredient strings."""

import re
from typing import Dict, List


def parse_ingredient_text(raw_text: str) -> List[str]:
    """Parse raw OCR ingredient text into individual ingredient strings."""
    if not raw_text or not raw_text.strip():
        return []

    text = raw_text.strip()
    text = re.sub(r"^(?:ingredients?\s*:?\s*)", "", text, flags=re.IGNORECASE)

    paren_map: Dict[str, str] = {}
    counter = 0

    def replace_paren(match: re.Match) -> str:
        nonlocal counter
        key = f"__PAREN_{counter}__"
        paren_map[key] = match.group(0)
        counter += 1
        return key

    text = re.sub(r"\([^)]*\)", replace_paren, text)
    text = re.sub(r"\[[^\]]*\]", replace_paren, text)

    parts = re.split(r"[,;]", text)
    ingredients: List[str] = []
    for part in parts:
        cleaned = part.strip()
        if not cleaned:
            continue
        # Iteratively restore nested tokens until none remain
        while "__PAREN_" in cleaned:
            old = cleaned
            for key, val in paren_map.items():
                cleaned = cleaned.replace(key, val)
            if cleaned == old:
                break
        # Strip any dangling leftover token markers
        cleaned = re.sub(r"__PAREN_\d+__", "", cleaned)
        cleaned = cleaned.rstrip(".").strip()
        if cleaned and len(cleaned) > 1:
            ingredients.append(cleaned)

    return ingredients


def extract_ingredient_block_from_ocr(raw_ocr: str) -> str:
    """Find ingredient declaration within full-label OCR noise."""
    if not raw_ocr or not raw_ocr.strip():
        return ""

    normalized = raw_ocr.replace("\r", "\n")
    block = re.search(
        r"ingredients?\s*[:\-]?\s*(.+?)(?:\n\s*(?:allergen|contains|may contain|nutritional|nutrition|store|best before|manufactured)|$)",
        normalized,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if block:
        return " ".join(block.group(1).split())

    line = re.search(r"ingredients?\s*[:\-]?\s*([^\n]+)", normalized, flags=re.IGNORECASE)
    if line:
        return line.group(1).strip()

    collapsed = " ".join(normalized.split())
    if "," in collapsed and len(collapsed) > 15:
        return collapsed
    return collapsed.strip()
