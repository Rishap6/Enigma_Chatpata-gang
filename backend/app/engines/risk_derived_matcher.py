import uuid
from typing import Dict, Any, List, Optional
from app.models.family_member import FamilyMember


# Mapping of common restriction concepts to target ingredients / keywords
ALLERGEN_FAMILY_MAP = {
    "lactose intolerance": ["milk", "dairy", "casein", "whey", "lactose", "milk-derived"],
    "lactose_free": ["milk", "dairy", "casein", "whey", "lactose", "milk-derived"],
    "dairy": ["milk", "dairy", "casein", "whey", "lactose", "milk-derived"],
    "dairy_free": ["milk", "dairy", "casein", "whey", "lactose", "milk-derived"],
    "milk": ["milk", "dairy", "casein", "whey", "lactose", "sodium caseinate"],
    "gluten": ["wheat", "gluten", "barley", "rye", "maida", "semolina", "atta"],
    "gluten_free": ["wheat", "gluten", "barley", "rye", "maida", "semolina", "atta"],
    "celiac": ["wheat", "gluten", "barley", "rye", "maida", "semolina", "atta"],
    "wheat": ["wheat", "gluten", "maida", "semolina", "atta"],
    "peanut": ["peanut", "groundnut", "arachis"],
    "tree nut": ["tree nut", "almond", "cashew", "walnut", "hazelnut", "pistachio"],
    "soy": ["soy", "soya", "soybean", "lecithin"],
    "egg": ["egg", "albumin", "lysozyme", "ovalbumin"],
}


def _get_target_keywords(restriction_name: str) -> List[str]:
    name_clean = restriction_name.strip().lower()
    for key, targets in ALLERGEN_FAMILY_MAP.items():
        if key in name_clean or name_clean in key:
            return targets
    return [name_clean]


def match_derived_allergens(
    member: FamilyMember,
    product_data: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Evaluates multi-level derived and ancestor ingredient relationships.
    Examples:
    - Sodium Caseinate -> Casein -> Milk (for Milk allergy or Lactose intolerance)
    - Whey Protein -> Whey -> Milk (for Milk allergy or Lactose intolerance)
    - Maida -> Wheat Flour -> Wheat (for Wheat allergy or Gluten intolerance)
    """
    findings: List[Dict[str, Any]] = []
    prod_id = product_data.get("product", {}).get("id")
    prod_name = product_data.get("product", {}).get("name", "Product")
    ingredients = product_data.get("ingredients", [])

    # Gather member targets from allergies & relevant dietary restrictions
    requirements = []
    for a in member.allergies:
        requirements.append({
            "source": "allergy",
            "name": a.name,
            "severity": a.severity or "moderate",
            "targets": _get_target_keywords(a.name),
            "display": f"{member.name}: {a.name}",
        })

    for d in member.dietary_rules:
        val = d.rule_value or ""
        lbl = d.label or ""
        combined = f"{val} {lbl}".strip().lower()
        if any(k in combined for k in ["dairy", "lactose", "gluten", "wheat", "nut", "soy", "egg"]):
            requirements.append({
                "source": "dietary_rule",
                "name": d.label or d.rule_value,
                "severity": "moderate",
                "targets": _get_target_keywords(combined),
                "display": f"{member.name}: {d.label or d.rule_value}",
            })

    for req in requirements:
        req_targets = req["targets"]
        declared_sev = req["severity"].lower()
        sev_label = "high" if declared_sev == "severe" else ("medium" if declared_sev == "moderate" else "low")

        for ing in ingredients:
            raw_name = ing.get("raw_name", "")
            norm_name = ing.get("normalized_name") or raw_name
            ing_id = ing.get("ingredient_id")
            ing_conf = ing.get("confidence", 0.95)
            chains = ing.get("relationship_chains", [])
            raw_lower = raw_name.lower()
            norm_lower = norm_name.lower()

            # If it's a direct match to the target keyword, let risk_direct_matcher handle it
            # Derived matcher focuses on non-trivial derivation chains (length > 1) or secondary allergens
            matched_chain = None
            matched_target_node = None

            for chain in chains:
                path = chain.get("path", [])
                if len(path) > 1:
                    # Check if any subsequent node matches the restriction targets
                    for node in path[1:]:
                        node_lower = node.lower()
                        if any(t in node_lower for t in req_targets):
                            matched_chain = chain
                            matched_target_node = node
                            break
                if matched_chain:
                    break

            # Also check if ingredient has mapped allergens that don't match the ingredient name directly
            if not matched_chain:
                ing_allergens = ing.get("allergens", [])
                for a in ing_allergens:
                    a_name = a.get("name", "").lower()
                    if any(t in a_name for t in req_targets):
                        # Ingredient is derived from / mapped to this allergen
                        if a_name not in raw_lower and a_name not in norm_lower:
                            matched_target_node = a.get("name")
                            # Synthetic chain
                            matched_chain = {
                                "path": [norm_name or raw_name, a.get("name")],
                                "relationship_types": ["derived_from"],
                            }
                            break

            if matched_chain and matched_target_node:
                path_steps = []
                path_nodes = matched_chain.get("path", [])
                rel_types = matched_chain.get("relationship_types", [])

                for idx, node in enumerate(path_nodes):
                    rel = rel_types[idx - 1] if idx > 0 and idx - 1 < len(rel_types) else "starting_ingredient"
                    path_steps.append({
                        "step_number": idx + 1,
                        "ingredient_id": ing_id if idx == 0 else None,
                        "ingredient_name": node,
                        "relationship_type": rel,
                    })

                target_clean = matched_target_node.replace(" (Cycle detected)", "")
                findings.append({
                    "member_id": member.id,
                    "member_name": member.name,
                    "product_id": prod_id,
                    "product_name": prod_name,
                    "status": "high_attention" if declared_sev == "severe" else "potential_conflict",
                    "risk_type": "derived_allergen",
                    "severity": sev_label,
                    "title": f"{target_clean}-derived ingredient detected",
                    "summary": f"{raw_name} is linked through ingredient knowledge to {target_clean} ({req['name']}).",
                    "trigger_text": raw_name,
                    "matched_rule": req["display"],
                    "reason": f"{raw_name} is linked through the ingredient knowledge model to {target_clean}-derived source.",
                    "confidence": ing_conf,
                    "requires_verification": ing.get("requires_verification", False),
                    "cross_contact": False,
                    "source_uncertainty": False,
                    "ingredient_path": path_steps,
                    "evidence": [
                        {
                            "evidence_type": "phase2_relationship_trace",
                            "description": f"Knowledge graph path: {' -> '.join(path_nodes)}",
                            "confidence": ing_conf,
                            "evidence_id": None,
                        }
                    ],
                })

    return findings
