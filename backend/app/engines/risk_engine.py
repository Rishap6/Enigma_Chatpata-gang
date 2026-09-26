import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.models.family_member import FamilyMember
from app.engines.risk_direct_matcher import match_direct_allergens
from app.engines.risk_derived_matcher import match_derived_allergens
from app.engines.risk_cross_contact import match_cross_contact
from app.engines.risk_dietary import match_dietary_rules
from app.engines.risk_source_uncertainty import match_source_uncertainty
from app.engines.risk_preferences import match_nutrition_preferences, match_custom_rules
from app.engines.risk_aggregation import aggregate_member_product_findings, get_highest_priority_status
from app.engines.risk_explanation import build_explainability_payload


def evaluate_family_risk(
    family_id: uuid.UUID,
    members: List[FamilyMember],
    purchased_products: List[Dict[str, Any]],
    receipt_id: Optional[uuid.UUID] = None,
    analysis_version: str = "v1.0.0",
) -> Dict[str, Any]:
    """Core Family Risk Engine.
    Evaluates every purchased product against every family member's configured profile
    using Phase 2/3 structured intelligence.
    Preserves all triggered rules, full evidence, and ingredient derivation paths.
    """
    all_findings_flat: List[Dict[str, Any]] = []
    member_results_map: Dict[uuid.UUID, List[Dict[str, Any]]] = {m.id: [] for m in members}
    matrix_cells: List[Dict[str, Any]] = []

    # Family-level counters
    high_attention_set = set()
    potential_conflict_set = set()
    verification_required_set = set()
    no_conflict_set = set()
    members_with_conflicts = set()

    for prod_data in purchased_products:
        prod_info = prod_data.get("product", {})
        p_id = prod_info.get("id")
        p_name = prod_info.get("name", "Product")

        for member in members:
            # 1. Evaluate Direct Allergens & Ingredient Exclusions
            direct_matches = match_direct_allergens(member, prod_data)

            # 2. Evaluate Derived / Ancestor Allergen Chains
            derived_matches = match_derived_allergens(member, prod_data)

            # 3. Evaluate Precautionary / Cross-Contact Statements
            cross_matches = match_cross_contact(member, prod_data)

            # 4. Evaluate Dietary Rules
            dietary_matches = match_dietary_rules(member, prod_data)

            # 5. Evaluate Source Uncertainty
            source_matches = match_source_uncertainty(member, prod_data)

            # 6. Evaluate Nutrition Preferences
            pref_matches = match_nutrition_preferences(member, prod_data)

            # 7. Evaluate Custom Rules
            custom_matches = match_custom_rules(member, prod_data)

            # Deduplicate findings by title & trigger_text
            raw_pool = direct_matches + derived_matches + cross_matches + dietary_matches + source_matches + pref_matches + custom_matches
            seen_keys = set()
            unique_raw: List[Dict[str, Any]] = []
            for rf in raw_pool:
                key = (rf.get("risk_type"), rf.get("trigger_text"), rf.get("title"))
                if key not in seen_keys:
                    seen_keys.add(key)
                    unique_raw.append(rf)

            # Aggregate and prioritize
            pair_findings = aggregate_member_product_findings(member, prod_data, unique_raw)

            # Determine overall status for this (member, product) combination
            all_statuses = [f["status"] for f in pair_findings]
            overall_status = get_highest_priority_status(all_statuses)

            # Enrich findings with explainability object
            for f in pair_findings:
                f["member_id"] = member.id
                f["member_name"] = member.name
                f["product_id"] = p_id
                f["product_name"] = p_name
                f["explainability"] = build_explainability_payload(f)
                all_findings_flat.append(f)
                member_results_map[member.id].append(f)

            # Matrix Cell entry
            top_f = pair_findings[0] if pair_findings else None
            matrix_cells.append({
                "member_id": member.id,
                "member_name": member.name,
                "product_id": p_id,
                "product_name": p_name,
                "status": overall_status,
                "findings_count": len([f for f in pair_findings if f["status"] != "no_configured_conflict"]),
                "top_finding_title": top_f.get("title") if top_f else "No configured conflict",
                "top_risk_type": top_f.get("risk_type") if top_f else "unknown",
                "attention_score": top_f.get("attention_score", 0.0) if top_f else 0.0,
                "findings": pair_findings,
            })

            # Track family counts
            cell_key = (member.id, p_id)
            if overall_status == "high_attention":
                high_attention_set.add(cell_key)
                members_with_conflicts.add(member.id)
            elif overall_status == "potential_conflict":
                potential_conflict_set.add(cell_key)
                members_with_conflicts.add(member.id)
            elif overall_status == "verification_required":
                verification_required_set.add(cell_key)
            elif overall_status == "no_configured_conflict":
                no_conflict_set.add(cell_key)

    # Build Member Risk Summaries
    member_summaries = []
    for member in members:
        m_findings = member_results_map.get(member.id, [])
        m_high = len([f for f in m_findings if f["status"] == "high_attention"])
        m_potential = len([f for f in m_findings if f["status"] == "potential_conflict"])
        m_verification = len([f for f in m_findings if f["status"] == "verification_required"])
        m_no_conflict = len([f for f in m_findings if f["status"] == "no_configured_conflict"])

        member_summaries.append({
            "member_id": member.id,
            "member_name": member.name,
            "summary": {
                "high": m_high,
                "potential": m_potential,
                "verification": m_verification,
                "no_conflict": m_no_conflict,
            },
            "product_results": m_findings,
        })

    analysis_timestamp = datetime.now(timezone.utc).isoformat()

    return {
        "family_id": family_id,
        "receipt_id": receipt_id,
        "analysis_version": analysis_version,
        "analysis_timestamp": analysis_timestamp,
        "summary": {
            "products_analyzed": len(purchased_products),
            "members_analyzed": len(members),
            "members_with_conflicts": len(members_with_conflicts),
            "high_priority": len(high_attention_set),
            "potential_conflicts": len(potential_conflict_set),
            "verification_required": len(verification_required_set),
            "no_configured_conflict": len(no_conflict_set),
        },
        "members": member_summaries,
        "matrix": matrix_cells,
        "all_findings": all_findings_flat,
    }
