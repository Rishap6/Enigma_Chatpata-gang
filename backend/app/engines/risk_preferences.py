import uuid
import re
from typing import Dict, Any, List, Optional
from app.models.family_member import FamilyMember


SODIUM_INGREDIENTS = ["salt", "sodium", "sodium caseinate", "monosodium glutamate", "baking soda", "sodium chloride", "sodium benzoate"]
SUGAR_INGREDIENTS = ["sugar", "high fructose corn syrup", "glucose", "sucrose", "dextrose", "invert sugar", "corn syrup", "cane sugar", "maltose"]


def match_nutrition_preferences(
    member: FamilyMember,
    product_data: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Evaluates nutrition preferences (e.g. reduce_sugar, reduce_sodium, increase_protein)
    as personalized alignment preferences, NOT medical conclusions.
    """
    findings: List[Dict[str, Any]] = []
    prod_id = product_data.get("product", {}).get("id")
    prod_name = product_data.get("product", {}).get("name", "Product")
    ingredients = product_data.get("ingredients", [])

    all_ing_names = [ing.get("raw_name", "").lower() for ing in ingredients] + [
        (ing.get("normalized_name") or "").lower() for ing in ingredients
    ]

    for pref in member.nutrition_preferences:
        ptype = (pref.preference_type or "").strip().lower()
        pval = (pref.preference_value or "").strip().lower()

        # 1. Reduce Sodium
        if "sodium" in ptype or "salt" in ptype or "reduce_sodium" in ptype:
            matched_sodium_ings = [
                raw for raw in all_ing_names if any(s in raw for s in SODIUM_INGREDIENTS)
            ]
            if matched_sodium_ings:
                trigger = matched_sodium_ings[0].capitalize()
                findings.append({
                    "member_id": member.id,
                    "member_name": member.name,
                    "product_id": prod_id,
                    "product_name": prod_name,
                    "status": "potential_conflict",
                    "risk_type": "nutrition_preference",
                    "severity": "low",
                    "title": "Nutrition preference alignment: Sodium content",
                    "summary": f"Contains ingredients associated with sodium ({trigger}).",
                    "trigger_text": trigger,
                    "matched_rule": f"{member.name}: Reduce sodium",
                    "reason": "This product may not align with the configured preference to reduce sodium.",
                    "confidence": 0.90,
                    "requires_verification": False,
                    "cross_contact": False,
                    "source_uncertainty": False,
                    "ingredient_path": [
                        {
                            "step_number": 1,
                            "ingredient_id": None,
                            "ingredient_name": trigger,
                            "relationship_type": "sodium_source",
                        }
                    ],
                    "evidence": [
                        {
                            "evidence_type": "ingredient_preference_check",
                            "description": f"Contains sodium-associated ingredient: {trigger}.",
                            "confidence": 0.90,
                            "evidence_id": None,
                        }
                    ],
                })

        # 2. Reduce Sugar
        elif "sugar" in ptype or "reduce_sugar" in ptype:
            matched_sugar_ings = [
                raw for raw in all_ing_names if any(s in raw for s in SUGAR_INGREDIENTS)
            ]
            if matched_sugar_ings:
                trigger = matched_sugar_ings[0].capitalize()
                findings.append({
                    "member_id": member.id,
                    "member_name": member.name,
                    "product_id": prod_id,
                    "product_name": prod_name,
                    "status": "potential_conflict",
                    "risk_type": "nutrition_preference",
                    "severity": "low",
                    "title": "Nutrition preference alignment: Added sugars",
                    "summary": f"Contains added sugars ({trigger}).",
                    "trigger_text": trigger,
                    "matched_rule": f"{member.name}: Reduce sugar",
                    "reason": "This product may not align with the configured preference to reduce sugar.",
                    "confidence": 0.90,
                    "requires_verification": False,
                    "cross_contact": False,
                    "source_uncertainty": False,
                    "ingredient_path": [
                        {
                            "step_number": 1,
                            "ingredient_id": None,
                            "ingredient_name": trigger,
                            "relationship_type": "sugar_source",
                        }
                    ],
                    "evidence": [
                        {
                            "evidence_type": "ingredient_preference_check",
                            "description": f"Contains sugar-associated ingredient: {trigger}.",
                            "confidence": 0.90,
                            "evidence_id": None,
                        }
                    ],
                })

    return findings


def match_custom_rules(
    member: FamilyMember,
    product_data: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Evaluates custom text rules using deterministic keyword extraction.
    Ambiguous or unsupported complex natural language rules return insufficient_information.
    """
    findings: List[Dict[str, Any]] = []
    prod_id = product_data.get("product", {}).get("id")
    prod_name = product_data.get("product", {}).get("name", "Product")
    ingredients = product_data.get("ingredients", [])
    all_ing_names = [ing.get("raw_name", "").lower() for ing in ingredients] + [
        (ing.get("normalized_name") or "").lower() for ing in ingredients
    ]

    for rule in member.custom_rules:
        text = rule.rule_text.strip()
        text_lower = text.lower()

        # Deterministic extraction: "Avoid X" or "No X" or "Exclude X"
        avoid_match = re.search(r"(?:avoid|no|exclude|without)\s+([a-zA-Z0-9\s,]+)", text_lower)
        if avoid_match:
            target_str = avoid_match.group(1)
            # Split by commas or 'or' or 'and'
            keywords = [k.strip() for k in re.split(r",|\bor\b|\band\b", target_str) if k.strip()]
            matched_keywords = []
            for kw in keywords:
                if any(kw in ing_name for ing_name in all_ing_names):
                    matched_keywords.append(kw)

            if matched_keywords:
                matched_kw_str = ", ".join(matched_keywords)
                findings.append({
                    "member_id": member.id,
                    "member_name": member.name,
                    "product_id": prod_id,
                    "product_name": prod_name,
                    "status": "high_attention",
                    "risk_type": "custom_rule",
                    "severity": "medium",
                    "title": f"Custom rule match: {matched_kw_str}",
                    "summary": f"Product matches custom requirement: '{text}'.",
                    "trigger_text": matched_kw_str,
                    "matched_rule": f"{member.name}: {text}",
                    "reason": f"Product ingredient contains '{matched_kw_str}', which matches configured custom rule '{text}'.",
                    "confidence": 0.85,
                    "requires_verification": False,
                    "cross_contact": False,
                    "source_uncertainty": False,
                    "ingredient_path": [
                        {
                            "step_number": 1,
                            "ingredient_id": None,
                            "ingredient_name": matched_kw_str,
                            "relationship_type": "custom_rule_keyword",
                        }
                    ],
                    "evidence": [
                        {
                            "evidence_type": "custom_rule_keyword_match",
                            "description": f"Rule keyword '{matched_kw_str}' present in product ingredients.",
                            "confidence": 0.85,
                            "evidence_id": None,
                        }
                    ],
                })
        else:
            # Complex unsupported natural language rule
            findings.append({
                "member_id": member.id,
                "member_name": member.name,
                "product_id": prod_id,
                "product_name": prod_name,
                "status": "insufficient_information",
                "risk_type": "custom_rule",
                "severity": "info",
                "title": "Custom rule requires interpretation",
                "summary": f"Custom rule '{text}' requires additional context to evaluate deterministically.",
                "trigger_text": text,
                "matched_rule": f"{member.name}: {text}",
                "reason": "This custom rule requires additional interpretation.",
                "confidence": 0.50,
                "requires_verification": True,
                "cross_contact": False,
                "source_uncertainty": False,
                "ingredient_path": [],
                "evidence": [],
            })

    return findings
