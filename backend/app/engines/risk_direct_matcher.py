import uuid
from typing import Dict, Any, List, Optional
from app.models.family_member import FamilyMember


def match_direct_allergens(
    member: FamilyMember,
    product_data: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Evaluates direct allergen and ingredient exclusion matches between a member and product ingredients.
    A direct allergen match occurs when an ingredient is explicitly named after an allergen or directly mapped
    without an indirect derivation chain.
    """
    findings: List[Dict[str, Any]] = []
    prod_id = product_data.get("product", {}).get("id")
    prod_name = product_data.get("product", {}).get("name", "Product")
    ingredients = product_data.get("ingredients", [])

    # 1. Match declared Member Allergies
    for allergy in member.allergies:
        allergy_name_clean = allergy.name.strip().lower()
        declared_severity = (allergy.severity or "moderate").lower()
        sev_label = "high" if declared_severity == "severe" else ("medium" if declared_severity == "moderate" else "low")

        for ing in ingredients:
            raw_name = ing.get("raw_name", "")
            norm_name = ing.get("normalized_name") or ""
            ing_id = ing.get("ingredient_id")
            ing_conf = ing.get("confidence", 0.95)
            ing_allergens = ing.get("allergens", [])

            # Check direct name matches
            raw_lower = raw_name.lower()
            norm_lower = norm_name.lower()

            is_direct_match = False
            matched_trigger = norm_name or raw_name

            if allergy_name_clean in raw_lower or allergy_name_clean in norm_lower:
                is_direct_match = True
            elif raw_lower in allergy_name_clean or norm_lower in allergy_name_clean:
                is_direct_match = True
            else:
                # Check if ingredient is directly flagged with this allergen
                for a in ing_allergens:
                    a_name = a.get("name", "").lower()
                    if a_name == allergy_name_clean or allergy_name_clean in a_name:
                        # Check if this is a direct leaf ingredient (not requiring deep traversal)
                        chains = ing.get("relationship_chains", [])
                        if not chains or len(chains) == 0 or len(chains[0].get("path", [])) <= 2:
                            is_direct_match = True
                            matched_trigger = raw_name
                            break

            if is_direct_match:
                findings.append({
                    "member_id": member.id,
                    "member_name": member.name,
                    "product_id": prod_id,
                    "product_name": prod_name,
                    "status": "high_attention",
                    "risk_type": "direct_allergen",
                    "severity": sev_label,
                    "title": f"Direct allergen detected: {allergy.name}",
                    "summary": f"{matched_trigger} explicitly matches configured {allergy.name} allergy for {member.name}.",
                    "trigger_text": matched_trigger,
                    "matched_rule": f"{member.name}: {allergy.name} allergy ({declared_severity.capitalize()})",
                    "reason": f"{matched_trigger} is explicitly present in the product ingredient information.",
                    "confidence": ing_conf,
                    "requires_verification": ing.get("requires_verification", False),
                    "cross_contact": False,
                    "source_uncertainty": False,
                    "ingredient_path": [
                        {
                            "step_number": 1,
                            "ingredient_id": ing_id,
                            "ingredient_name": matched_trigger,
                            "relationship_type": "direct_ingredient",
                        }
                    ],
                    "evidence": [
                        {
                            "evidence_type": "product_ingredient_list",
                            "description": f"Found '{raw_name}' in declared ingredients.",
                            "confidence": ing_conf,
                            "evidence_id": None,
                        }
                    ],
                })

    # 2. Match Member Ingredient Exclusions
    for exclusion in member.ingredient_exclusions:
        excl_name_clean = exclusion.ingredient_name.strip().lower()

        for ing in ingredients:
            raw_name = ing.get("raw_name", "")
            norm_name = ing.get("normalized_name") or ""
            ing_id = ing.get("ingredient_id")
            ing_conf = ing.get("confidence", 0.95)

            raw_lower = raw_name.lower()
            norm_lower = norm_name.lower()

            if excl_name_clean in raw_lower or excl_name_clean in norm_lower or raw_lower in excl_name_clean:
                matched_trigger = norm_name or raw_name
                findings.append({
                    "member_id": member.id,
                    "member_name": member.name,
                    "product_id": prod_id,
                    "product_name": prod_name,
                    "status": "high_attention",
                    "risk_type": "ingredient_exclusion",
                    "severity": "high",
                    "title": f"Excluded ingredient detected: {exclusion.ingredient_name}",
                    "summary": f"{matched_trigger} matches an ingredient explicitly excluded by {member.name}.",
                    "trigger_text": matched_trigger,
                    "matched_rule": f"{member.name}: Exclude {exclusion.ingredient_name}",
                    "reason": f"{matched_trigger} matches an ingredient explicitly excluded by this family member.",
                    "confidence": ing_conf,
                    "requires_verification": ing.get("requires_verification", False),
                    "cross_contact": False,
                    "source_uncertainty": False,
                    "ingredient_path": [
                        {
                            "step_number": 1,
                            "ingredient_id": ing_id,
                            "ingredient_name": matched_trigger,
                            "relationship_type": "excluded_ingredient",
                        }
                    ],
                    "evidence": [
                        {
                            "evidence_type": "member_exclusion_match",
                            "description": f"Ingredient matches explicit member exclusion '{exclusion.ingredient_name}'.",
                            "confidence": ing_conf,
                            "evidence_id": None,
                        }
                    ],
                })

    return findings
