import uuid
from typing import Dict, Any, List, Optional
from app.models.family_member import FamilyMember


CROSS_CONTACT_INDICATORS = [
    "may contain",
    "traces of",
    "shared equipment",
    "shared facility",
    "facility that also processes",
    "manufactured in a facility",
    "processed on line",
    "may also contain",
]


def match_cross_contact(
    member: FamilyMember,
    product_data: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Evaluates cross-contact and precautionary allergen label warnings.
    Distinguishes potential manufacturing cross-contact from intentional ingredients.
    """
    findings: List[Dict[str, Any]] = []
    prod_id = product_data.get("product", {}).get("id")
    prod_name = product_data.get("product", {}).get("name", "Product")
    allergen_stmts = product_data.get("allergen_statements", [])
    raw_cross_contact = product_data.get("product", {}).get("cross_contact_statement_raw") or product_data.get("cross_contact_statement_raw")

    # Collect all precautionary statements
    candidate_statements: List[Dict[str, Any]] = []

    for stmt in allergen_stmts:
        st_type = (stmt.get("statement_type") or "").lower()
        st_text = stmt.get("statement_text") or ""
        st_conf = stmt.get("confidence", 0.95)

        is_cross = (
            st_type in ["may_contain", "cross_contact", "precautionary", "shared_equipment"]
            or any(ind in st_text.lower() for ind in CROSS_CONTACT_INDICATORS)
        )
        if is_cross and st_text:
            candidate_statements.append({
                "text": st_text,
                "confidence": st_conf,
                "source": "allergen_statement",
            })

    if raw_cross_contact:
        candidate_statements.append({
            "text": raw_cross_contact,
            "confidence": 0.95,
            "source": "product_metadata",
        })

    # Evaluate against member allergies
    for allergy in member.allergies:
        allergy_name_lower = allergy.name.strip().lower()
        declared_severity = (allergy.severity or "moderate").lower()
        sev_label = "high" if declared_severity == "severe" else ("medium" if declared_severity == "moderate" else "low")

        # Plural / common variants (e.g. peanut -> peanuts, tree nut -> nuts)
        variants = [allergy_name_lower]
        if allergy_name_lower.endswith("y"):
            variants.append(allergy_name_lower[:-1] + "ies")
        else:
            variants.append(allergy_name_lower + "s")
        if "nut" in allergy_name_lower:
            variants.append("nuts")

        for stmt_obj in candidate_statements:
            st_text = stmt_obj["text"]
            st_lower = st_text.lower()

            if any(v in st_lower for v in variants):
                findings.append({
                    "member_id": member.id,
                    "member_name": member.name,
                    "product_id": prod_id,
                    "product_name": prod_name,
                    "status": "potential_conflict",
                    "risk_type": "cross_contact",
                    "severity": sev_label,
                    "title": f"Cross-contact warning: {allergy.name}",
                    "summary": f"Product packaging indicates potential cross-contact with {allergy.name}.",
                    "trigger_text": st_text,
                    "matched_rule": f"{member.name}: {allergy.name} allergy ({declared_severity.capitalize()})",
                    "reason": f"Product packaging carries a precautionary statement: '{st_text}'.",
                    "confidence": stmt_obj["confidence"],
                    "requires_verification": False,
                    "cross_contact": True,
                    "source_uncertainty": False,
                    "ingredient_path": [
                        {
                            "step_number": 1,
                            "ingredient_id": None,
                            "ingredient_name": allergy.name,
                            "relationship_type": "precautionary_statement",
                        }
                    ],
                    "evidence": [
                        {
                            "evidence_type": "manufacturer_allergen_statement",
                            "description": f"Precautionary statement: '{st_text}'",
                            "confidence": stmt_obj["confidence"],
                            "evidence_id": None,
                        }
                    ],
                })
                break  # don't duplicate multiple statements for same allergy

    return findings
