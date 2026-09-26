import uuid
from typing import Dict, Any, List, Optional
from app.models.family_member import FamilyMember


def match_dietary_rules(
    member: FamilyMember,
    product_data: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Evaluates dietary rules (vegetarian, vegan, gluten_free, dairy_free, egg_free, nut_free)
    using Phase 2 dietary property and classification metadata.
    Does NOT duplicate Phase 2 database.
    """
    findings: List[Dict[str, Any]] = []
    prod_id = product_data.get("product", {}).get("id")
    prod_name = product_data.get("product", {}).get("name", "Product")
    ingredients = product_data.get("ingredients", [])
    dietary_summary = product_data.get("dietary_summary", {})

    for rule in member.dietary_rules:
        rule_val = (rule.rule_value or "").strip().lower()
        rule_label = rule.label or rule.rule_value

        # 1. Vegetarian
        if rule_val in ["vegetarian", "lacto_vegetarian", "ovo_lacto_vegetarian"]:
            # Check for definitive non-vegetarian / animal-derived ingredients
            for ing in ingredients:
                ing_dietary = ing.get("dietary_summary", {})
                is_animal = ing_dietary.get("animal_derived") in ["known_animal", "true"]
                is_incompatible = ing_dietary.get("vegetarian_compatible") == "incompatible"
                raw_name = ing.get("raw_name", "")
                norm_name = ing.get("normalized_name") or raw_name

                if is_animal or is_incompatible:
                    findings.append({
                        "member_id": member.id,
                        "member_name": member.name,
                        "product_id": prod_id,
                        "product_name": prod_name,
                        "status": "high_attention",
                        "risk_type": "dietary_conflict",
                        "severity": "high",
                        "title": f"Dietary conflict: Non-vegetarian ingredient ({raw_name})",
                        "summary": f"{raw_name} is derived from animal sources, conflicting with {member.name}'s vegetarian preference.",
                        "trigger_text": raw_name,
                        "matched_rule": f"{member.name}: Vegetarian",
                        "reason": f"{raw_name} is established in ingredient intelligence as animal-derived.",
                        "confidence": ing.get("confidence", 0.95),
                        "requires_verification": False,
                        "cross_contact": False,
                        "source_uncertainty": False,
                        "ingredient_path": [
                            {
                                "step_number": 1,
                                "ingredient_id": ing.get("ingredient_id"),
                                "ingredient_name": raw_name,
                                "relationship_type": "animal_derived",
                            }
                        ],
                        "evidence": [
                            {
                                "evidence_type": "phase2_dietary_properties",
                                "description": f"Classified as animal-derived ({ing_dietary.get('animal_derived')}).",
                                "confidence": ing.get("confidence", 0.95),
                                "evidence_id": None,
                            }
                        ],
                    })

        # 2. Vegan
        elif rule_val == "vegan":
            for ing in ingredients:
                ing_dietary = ing.get("dietary_summary", {})
                is_animal = ing_dietary.get("animal_derived") in ["known_animal", "true"]
                is_incomp_vegan = ing_dietary.get("vegan_compatible") == "incompatible"
                raw_name = ing.get("raw_name", "")

                if is_animal or is_incomp_vegan:
                    findings.append({
                        "member_id": member.id,
                        "member_name": member.name,
                        "product_id": prod_id,
                        "product_name": prod_name,
                        "status": "high_attention",
                        "risk_type": "dietary_conflict",
                        "severity": "high",
                        "title": f"Dietary conflict: Non-vegan ingredient ({raw_name})",
                        "summary": f"{raw_name} is not compatible with a vegan diet.",
                        "trigger_text": raw_name,
                        "matched_rule": f"{member.name}: Vegan",
                        "reason": f"{raw_name} is derived from animal or dairy sources.",
                        "confidence": ing.get("confidence", 0.95),
                        "requires_verification": False,
                        "cross_contact": False,
                        "source_uncertainty": False,
                        "ingredient_path": [
                            {
                                "step_number": 1,
                                "ingredient_id": ing.get("ingredient_id"),
                                "ingredient_name": raw_name,
                                "relationship_type": "non_vegan_ingredient",
                            }
                        ],
                        "evidence": [
                            {
                                "evidence_type": "phase2_dietary_properties",
                                "description": f"Classified as incompatible with vegan diet.",
                                "confidence": ing.get("confidence", 0.95),
                                "evidence_id": None,
                            }
                        ],
                    })

        # 3. Gluten Free
        elif rule_val in ["gluten_free", "celiac"]:
            for ing in ingredients:
                cats = [c.lower() for c in ing.get("categories", [])]
                allergens = [a.get("name", "").lower() for a in ing.get("allergens", [])]
                raw_lower = ing.get("raw_name", "").lower()

                if "wheat" in allergens or "gluten" in cats or "wheat" in cats or any(w in raw_lower for w in ["wheat", "maida", "barley", "rye"]):
                    raw_name = ing.get("raw_name", "")
                    findings.append({
                        "member_id": member.id,
                        "member_name": member.name,
                        "product_id": prod_id,
                        "product_name": prod_name,
                        "status": "high_attention",
                        "risk_type": "dietary_conflict",
                        "severity": "high",
                        "title": f"Dietary conflict: Gluten-containing ingredient ({raw_name})",
                        "summary": f"{raw_name} contains gluten or wheat-derived ingredients.",
                        "trigger_text": raw_name,
                        "matched_rule": f"{member.name}: Gluten-free",
                        "reason": f"{raw_name} contains gluten or wheat, conflicting with configured gluten-free diet.",
                        "confidence": ing.get("confidence", 0.95),
                        "requires_verification": False,
                        "cross_contact": False,
                        "source_uncertainty": False,
                        "ingredient_path": [
                            {
                                "step_number": 1,
                                "ingredient_id": ing.get("ingredient_id"),
                                "ingredient_name": raw_name,
                                "relationship_type": "gluten_source",
                            }
                        ],
                        "evidence": [
                            {
                                "evidence_type": "phase2_allergen_mapping",
                                "description": f"Contains wheat/gluten allergen.",
                                "confidence": ing.get("confidence", 0.95),
                                "evidence_id": None,
                            }
                        ],
                    })

        # 4. Dairy Free
        elif rule_val == "dairy_free":
            for ing in ingredients:
                allergens = [a.get("name", "").lower() for a in ing.get("allergens", [])]
                cats = [c.lower() for c in ing.get("categories", [])]
                raw_name = ing.get("raw_name", "")
                raw_lower = raw_name.lower()

                if "milk" in allergens or "dairy" in cats or any(m in raw_lower for m in ["milk", "dairy", "whey", "casein"]):
                    findings.append({
                        "member_id": member.id,
                        "member_name": member.name,
                        "product_id": prod_id,
                        "product_name": prod_name,
                        "status": "high_attention",
                        "risk_type": "dietary_conflict",
                        "severity": "high",
                        "title": f"Dietary conflict: Dairy ingredient ({raw_name})",
                        "summary": f"{raw_name} contains dairy-derived components.",
                        "trigger_text": raw_name,
                        "matched_rule": f"{member.name}: Dairy-free",
                        "reason": f"{raw_name} is linked to dairy, conflicting with configured dairy-free diet.",
                        "confidence": ing.get("confidence", 0.95),
                        "requires_verification": False,
                        "cross_contact": False,
                        "source_uncertainty": False,
                        "ingredient_path": [
                            {
                                "step_number": 1,
                                "ingredient_id": ing.get("ingredient_id"),
                                "ingredient_name": raw_name,
                                "relationship_type": "dairy_source",
                            }
                        ],
                        "evidence": [
                            {
                                "evidence_type": "phase2_allergen_mapping",
                                "description": "Linked to milk/dairy.",
                                "confidence": ing.get("confidence", 0.95),
                                "evidence_id": None,
                            }
                        ],
                    })

    return findings
