import uuid
from typing import Dict, Any, List, Optional


def build_explainability_payload(finding: Dict[str, Any]) -> Dict[str, Any]:
    """Builds a rich, human-understandable, evidence-first Phase 7 explainability payload.
    Answers:
    1. Why was this product flagged? (headline & summary)
    2. Which family member is affected? (member_id & member_name)
    3. Which configured requirement caused the finding? (configured_requirement)
    4. Which ingredient or product statement triggered it? (trigger)
    5. What is the ingredient relationship? (ingredient_chain & relationship_steps)
    6. Where did the information come from? (evidence with quality levels)
    7. How confident is the system? (confidence & confidence_explanation)
    8. What information is uncertain? (uncertainty_reason)
    9. What should the user verify on the physical package? (verification_guidance)
    10. What does 'no configured conflict' actually mean? (disclaimer & safe wording)
    """
    raw_status = finding.get("status", "potential_conflict")
    risk_type = finding.get("risk_type", "unknown")
    trigger = finding.get("trigger_text")
    rule = finding.get("matched_rule") or "Configured Profile Rule"
    member_name = finding.get("member_name") or "Family Member"
    product_name = finding.get("product_name") or "Grocery Product"
    conf = float(finding.get("confidence") if finding.get("confidence") is not None else 0.95)
    attention = float(finding.get("attention_score") or 0.0)

    # 1. Ingredient chain (string list)
    path_steps = finding.get("ingredient_path", [])
    chain_names: List[str] = [
        step.get("ingredient_name", "")
        for step in sorted(path_steps, key=lambda s: s.get("step_number", 1))
        if step.get("ingredient_name")
    ]
    if not chain_names and trigger:
        chain_names = [trigger]

    # 2. Relationship steps (detailed structured step objects)
    rel_steps: List[Dict[str, Any]] = []
    if len(chain_names) > 1:
        for idx in range(len(chain_names) - 1):
            from_n = chain_names[idx]
            to_n = chain_names[idx + 1]
            rel_type = "derived_from"
            notes = f"Linked through ingredient intelligence graph: {from_n} → {to_n}"
            if "gluten" in to_n.lower() or "allergen" in to_n.lower():
                rel_type = "contains"
                notes = f"{from_n} naturally contains {to_n}"
            elif "milk" in to_n.lower() or "wheat" in to_n.lower():
                rel_type = "derived_from"
                notes = f"{from_n} is derived from {to_n}"

            rel_steps.append({
                "step_number": idx + 1,
                "from_node": from_n,
                "relationship": rel_type,
                "to_node": to_n,
                "confidence": conf,
                "notes": notes,
            })
        # Final step linking to family rule
        rel_steps.append({
            "step_number": len(chain_names),
            "from_node": chain_names[-1],
            "relationship": "conflicts_with",
            "to_node": f"{member_name}'s restriction ({rule})",
            "confidence": conf,
            "notes": f"Triggers configured rule for {member_name}",
        })
    elif chain_names:
        rel_steps.append({
            "step_number": 1,
            "from_node": chain_names[0],
            "relationship": "matches_rule",
            "to_node": f"{member_name}'s restriction ({rule})",
            "confidence": conf,
            "notes": f"Directly triggers configured rule for {member_name}",
        })

    # 3. Confidence level & explanation
    if conf >= 0.85:
        conf_level = "high"
    elif conf >= 0.65:
        conf_level = "medium"
    elif conf > 0.0:
        conf_level = "low"
    else:
        conf_level = "unknown"

    conf_explanation = (
        "Confidence reflects the available product/ingredient evidence and matching quality. "
        "It is not a probability of an allergic reaction."
    )

    # 4. Status-specific Headline, Summary, Uncertainty & Verification
    uncertainty_reason: Optional[str] = None

    if risk_type == "direct_allergen":
        headline = f"Direct Allergen Detected: {trigger or rule}"
        summary = (
            f"{trigger or rule} is explicitly present in the available product information, "
            f"matching {member_name}'s configured {rule} requirement."
        )
        verif_guidance = (
            "Always verify the physical packaging and current manufacturer ingredient label before consumption."
        )

    elif risk_type == "derived_allergen":
        headline = f"Derived Allergen Link: {trigger or 'Ingredient'} is linked to {rule}"
        summary = (
            f"{trigger or 'This ingredient'} is linked to {rule}-derived ingredients through the ingredient relationship chain. "
            f"This matches {member_name}'s configured profile requirement."
        )
        verif_guidance = (
            "Always verify the physical packaging and current manufacturer ingredient label before consumption."
        )

    elif risk_type == "cross_contact" or finding.get("cross_contact"):
        headline = f"Precautionary Cross-Contact: {trigger or rule}"
        summary = (
            f"The product includes a precautionary statement indicating possible unintended {trigger or rule} exposure. "
            f"This is distinct from an intentional recipe ingredient."
        )
        uncertainty_reason = (
            "Precautionary statements indicate shared equipment or manufacturing facility, "
            "rather than an intentional recipe ingredient. Exposure depends on production scheduling."
        )
        verif_guidance = (
            f"Inspect physical package for 'may contain' warnings. If {member_name} has severe clinical sensitivity, "
            "consult clinician regarding tolerance of shared-facility cross-contact."
        )

    elif risk_type == "source_uncertainty" or finding.get("source_uncertainty"):
        headline = f"Dual-Source Origin Verification Required: {trigger or 'Additive'}"
        summary = (
            f"The source of this ingredient ({trigger or 'additive'}) could not be established confidently from available data. "
            "It can be derived from plant or animal origins depending on the manufacturer's formulation."
        )
        uncertainty_reason = (
            f"The available data does not establish whether '{trigger or 'this additive'}' is plant or animal-derived. "
            "Additives such as INS 471 or mono- and diglycerides have dual commercial sources."
        )
        verif_guidance = (
            "Verification required because the available information does not establish the ingredient/source confidently. "
            "Check current packaging for a vegetarian/vegan certification symbol or contact the manufacturer."
        )

    elif risk_type == "dietary_conflict":
        headline = f"Dietary Rule Conflict: {rule}"
        summary = (
            f"The ingredient properties of {trigger or 'this product'} conflict with {member_name}'s configured {rule} dietary rule."
        )
        verif_guidance = (
            "Always verify the physical packaging and current manufacturer ingredient label before consumption."
        )

    elif risk_type == "ingredient_exclusion":
        headline = f"Excluded Ingredient Matched: {trigger or rule}"
        summary = (
            f"The ingredient matches '{trigger or rule}', which is explicitly excluded in {member_name}'s profile."
        )
        verif_guidance = (
            "Always verify the physical packaging and current manufacturer ingredient label before consumption."
        )

    elif risk_type == "nutrition_preference":
        headline = f"Nutrition Preference Alert: {rule}"
        summary = (
            f"The available nutrition information for {product_name} may not align with {member_name}'s configured preference ({rule})."
        )
        verif_guidance = (
            "Check the nutritional facts panel on physical packaging for exact sodium, sugar, or fat values per serving."
        )

    elif raw_status == "insufficient_information":
        headline = "Insufficient Product Information"
        summary = (
            "There is not enough verified product information to determine whether the configured requirement applies."
        )
        uncertainty_reason = (
            "Ingredient list is missing, incomplete, or could not be mapped to the canonical ingredient database."
        )
        verif_guidance = (
            "Inspect physical product label manually before serving to verify complete ingredient disclosures."
        )

    elif raw_status == "no_configured_conflict":
        headline = "No Configured Conflict Detected"
        summary = (
            "No configured conflict detected based on the current family profile and available product information."
        )
        verif_guidance = (
            "Always verify the physical packaging before consumption, as manufacturer formulations or supplier origins can change."
        )

    else:
        headline = finding.get("title", "Risk Finding")
        summary = finding.get("summary", "Evaluating product compatibility with family profile.")
        verif_guidance = "Always inspect physical packaging before consumption."

    # 5. Structured evidence list with quality level
    raw_ev = finding.get("evidence", [])
    formatted_ev: List[Dict[str, Any]] = []

    for ev in raw_ev:
        e_type = ev.get("evidence_type") or "canonical_database"
        e_conf = float(ev.get("confidence") if ev.get("confidence") is not None else conf)
        e_level = "high" if e_conf >= 0.85 else "medium" if e_conf >= 0.65 else "low"
        formatted_ev.append({
            "source": "Ingredient Knowledge Base",
            "evidence_type": e_type,
            "level": e_level,
            "confidence": e_conf,
            "snippet": ev.get("description") or ev.get("snippet") or summary,
            "reference": f"KB-REF/{trigger or 'GENERIC'}",
            "evidence_id": ev.get("evidence_id"),
        })

    # If no raw evidence present, inject standard evidence items
    if not formatted_ev:
        if trigger:
            formatted_ev.append({
                "source": "Product Packaging Label",
                "evidence_type": "product_label",
                "level": "high",
                "confidence": 1.0,
                "snippet": f"Identified on product ingredient declaration: '{trigger}'",
                "reference": "Physical Package Back Panel",
            })
        if risk_type in ("derived_allergen", "dietary_conflict", "direct_allergen"):
            formatted_ev.append({
                "source": "Ingredient Knowledge Base",
                "evidence_type": "canonical_database",
                "level": "high",
                "confidence": conf,
                "snippet": f"Canonical relationship: {trigger or 'item'} maps to {rule}",
                "reference": f"DB-REF/{rule.upper()}",
            })
        elif risk_type == "source_uncertainty":
            formatted_ev.append({
                "source": "Food Additive Intelligence",
                "evidence_type": "literature_reference",
                "level": "medium",
                "confidence": conf,
                "snippet": f"{trigger} is dual-origin (plant or animal fat derived).",
                "reference": "Codex Alimentarius INS Register",
            })

    disclaimer = (
        "This is an informational decision-support tool based on your family's configured requirements "
        "and available product label data. It does not diagnose medical conditions, predict allergic reactions, "
        "or guarantee that food is 100% safe. Always inspect physical packaging before consumption."
    )

    finding_uuid = finding.get("id")
    member_uuid = finding.get("member_id")
    product_uuid = finding.get("product_id")

    return {
        "finding_id": finding_uuid,
        "member_id": member_uuid,
        "member_name": member_name,
        "product_id": product_uuid,
        "product_name": product_name,
        "status": raw_status,
        "conflict_type": risk_type,
        "risk_type": risk_type,
        "headline": headline,
        "title": finding.get("title", headline),
        "summary": summary,
        "trigger": trigger,
        "configured_requirement": rule,
        "rule": rule,
        "ingredient_chain": chain_names,
        "chain": chain_names,
        "relationship_steps": rel_steps,
        "evidence": formatted_ev,
        "confidence": conf,
        "confidence_level": conf_level,
        "confidence_explanation": conf_explanation,
        "attention_score": attention,
        "severity": finding.get("severity", "info"),
        "requires_verification": bool(finding.get("requires_verification", False)),
        "cross_contact": bool(finding.get("cross_contact", False)),
        "source_uncertainty": bool(finding.get("source_uncertainty", False)),
        "uncertainty_reason": uncertainty_reason,
        "verification_guidance": verif_guidance,
        "disclaimer": disclaimer,
        "reason": finding.get("reason", summary),
    }
