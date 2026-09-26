import uuid
from typing import Dict, Any, List, Optional
from app.models.family_member import FamilyMember


STATUS_PRIORITY = {
    "high_attention": 1,
    "potential_conflict": 2,
    "verification_required": 3,
    "no_configured_conflict": 4,
    "insufficient_information": 5,
}

BASE_ATTENTION_SCORES = {
    "direct_allergen_high": 100.0,
    "direct_allergen_medium": 85.0,
    "direct_allergen_low": 70.0,
    "ingredient_exclusion": 90.0,
    "derived_allergen": 80.0,
    "dietary_conflict": 75.0,
    "cross_contact": 50.0,
    "nutrition_preference": 45.0,
    "source_uncertainty": 40.0,
    "verification_required": 35.0,
    "custom_rule": 30.0,
    "insufficient_information": 15.0,
    "no_configured_conflict": 0.0,
}


def calculate_attention_score(finding: Dict[str, Any]) -> float:
    """Calculates a deterministic internal attention score for UI sorting and ordering.
    IMPORTANT: This is STRICTLY for UI prioritization. It is NOT a medical reaction
    probability or clinical assessment.
    """
    risk_type = finding.get("risk_type", "unknown")
    severity = finding.get("severity", "medium")
    confidence = float(finding.get("confidence") or 0.90)

    if risk_type == "direct_allergen":
        key = f"direct_allergen_{severity}"
        base = BASE_ATTENTION_SCORES.get(key, 85.0)
    else:
        base = BASE_ATTENTION_SCORES.get(risk_type, 40.0)

    score = base * (0.8 + 0.2 * confidence)
    return round(score, 2)


def get_highest_priority_status(statuses: List[str]) -> str:
    """Returns the most urgent status among a list of finding statuses."""
    if not statuses:
        return "no_configured_conflict"
    sorted_statuses = sorted(statuses, key=lambda s: STATUS_PRIORITY.get(s, 99))
    return sorted_statuses[0]


def aggregate_member_product_findings(
    member: FamilyMember,
    product_data: Dict[str, Any],
    raw_findings: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Aggregates all raw findings for a (member, product) pair.
    1. Annotates each finding with deterministic attention_score
    2. Sorts findings by priority
    3. Handles unresolved product ingredients where applicable
    4. Emits a clean 'no_configured_conflict' entry if no rules were triggered
    """
    prod_id = product_data.get("product", {}).get("id")
    prod_name = product_data.get("product", {}).get("name", "Product")
    unresolved_ings = product_data.get("unresolved_ingredients", [])

    final_findings: List[Dict[str, Any]] = []

    for f in raw_findings:
        f["attention_score"] = calculate_attention_score(f)
        final_findings.append(f)

    # If product has unresolved ingredients and member has allergies/dietary rules,
    # flag verification_required if not already high_attention
    has_high = any(f["status"] == "high_attention" for f in final_findings)
    if unresolved_ings and not has_high and (member.allergies or member.dietary_rules):
        unresolved_str = ", ".join(unresolved_ings[:3])
        unresolved_finding = {
            "member_id": member.id,
            "member_name": member.name,
            "product_id": prod_id,
            "product_name": prod_name,
            "status": "verification_required",
            "risk_type": "unknown",
            "severity": "info",
            "title": f"Unresolved ingredient verification: {unresolved_str}",
            "summary": f"Product contains unverified ingredient(s) ({unresolved_str}) that require verification.",
            "trigger_text": unresolved_str,
            "matched_rule": f"{member.name}: Configured requirements check",
            "reason": "Current product information contains unverified ingredients that could not be matched with certainty.",
            "confidence": 0.50,
            "attention_score": 35.0,
            "requires_verification": True,
            "cross_contact": False,
            "source_uncertainty": True,
            "ingredient_path": [],
            "evidence": [
                {
                    "evidence_type": "product_coverage_gap",
                    "description": f"Unresolved ingredients on label: {unresolved_str}",
                    "confidence": 0.50,
                    "evidence_id": None,
                }
            ],
        }
        final_findings.append(unresolved_finding)

    # If completely empty, emit standardized no_configured_conflict entry
    if not final_findings:
        no_conflict_entry = {
            "member_id": member.id,
            "member_name": member.name,
            "product_id": prod_id,
            "product_name": prod_name,
            "status": "no_configured_conflict",
            "risk_type": "unknown",
            "severity": "info",
            "title": "No configured conflict detected",
            "summary": f"No match found between available product information and {member.name}'s requirements.",
            "trigger_text": None,
            "matched_rule": f"{member.name}: Configured requirements",
            "reason": "No match was found between the available product information and this family member's currently configured requirements.",
            "confidence": 1.0,
            "attention_score": 0.0,
            "requires_verification": False,
            "cross_contact": False,
            "source_uncertainty": False,
            "ingredient_path": [],
            "evidence": [],
        }
        final_findings.append(no_conflict_entry)

    # Sort findings by attention_score descending
    final_findings.sort(key=lambda x: x["attention_score"], reverse=True)
    return final_findings
