import uuid
from typing import Dict, Any, List, Optional
from app.models.family_member import FamilyMember


def match_source_uncertainty(
    member: FamilyMember,
    product_data: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Evaluates ingredients with ambiguous or dual origin (e.g., INS 471, mono- and diglycerides)
    where source verification is required before confirming compatibility with vegetarian/vegan diets.
    DOES NOT classify automatically as vegetarian or non-vegetarian.
    """
    findings: List[Dict[str, Any]] = []
    prod_id = product_data.get("product", {}).get("id")
    prod_name = product_data.get("product", {}).get("name", "Product")
    ingredients = product_data.get("ingredients", [])

    # Check if member has dietary rules sensitive to source (e.g. Vegetarian, Vegan)
    sensitive_rules = []
    for r in member.dietary_rules:
        val = (r.rule_value or "").strip().lower()
        if val in ["vegetarian", "vegan", "lacto_vegetarian", "ovo_lacto_vegetarian"]:
            sensitive_rules.append(r.label or r.rule_value)

    if not sensitive_rules:
        return findings

    matched_rule_str = f"{member.name}: {', '.join(sensitive_rules).capitalize()}"

    for ing in ingredients:
        raw_name = ing.get("raw_name", "")
        norm_name = ing.get("normalized_name") or raw_name
        ing_id = ing.get("ingredient_id")
        dietary_sum = ing.get("dietary_summary", {})
        sources = ing.get("sources", [])
        requires_verif = ing.get("requires_verification", False)

        source_types = [s.get("type", "").lower() for s in sources]
        has_dual_plant_animal = "plant" in source_types and "animal" in source_types
        is_veg_uncertain = dietary_sum.get("vegetarian_compatible") == "uncertain"
        is_animal_uncertain = dietary_sum.get("animal_derived") == "uncertain"

        # Well-known dual-source additives like INS 471, E471
        is_known_ambiguous = any(code in raw_name.lower() or code in norm_name.lower() for code in ["471", "mono- and diglycerides", "mono and diglycerides"])

        if has_dual_plant_animal or is_veg_uncertain or is_animal_uncertain or is_known_ambiguous:
            findings.append({
                "member_id": member.id,
                "member_name": member.name,
                "product_id": prod_id,
                "product_name": prod_name,
                "status": "verification_required",
                "risk_type": "source_uncertainty",
                "severity": "medium",
                "title": f"Source verification required: {raw_name}",
                "summary": f"{raw_name} has potential plant or animal origins; manufacturer verification is needed for {member.name}.",
                "trigger_text": raw_name,
                "matched_rule": matched_rule_str,
                "reason": "The source of this ingredient could not be confidently established.",
                "confidence": ing.get("confidence", 0.95),
                "requires_verification": True,
                "cross_contact": False,
                "source_uncertainty": True,
                "ingredient_path": [
                    {
                        "step_number": 1,
                        "ingredient_id": ing_id,
                        "ingredient_name": raw_name,
                        "relationship_type": "dual_source_additive",
                    }
                ],
                "evidence": [
                    {
                        "evidence_type": "phase2_source_intelligence",
                        "description": f"Potential sources: {', '.join(source_types) if source_types else 'plant/animal uncertain'}.",
                        "confidence": ing.get("confidence", 0.95),
                        "evidence_id": None,
                    }
                ],
            })

    return findings
