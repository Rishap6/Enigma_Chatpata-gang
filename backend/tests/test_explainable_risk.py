import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.family import Family
from app.models.family_member import FamilyMember
from app.models.allergy import Allergy
from app.models.dietary_rule import DietaryRule
from app.models.product import Product
from app.models.receipt import Receipt
from app.models.receipt_item import ReceiptItem
from app.data.product_seed_data import seed_product_knowledge
from app.services.family_risk_service import family_risk_service
from app.engines.risk_explanation import build_explainability_payload


@pytest.fixture(autouse=True)
async def seed_data(db_session: AsyncSession):
    """Seed product & ingredient knowledge base automatically."""
    await seed_product_knowledge(db_session)


@pytest.mark.asyncio
async def test_build_explainability_payload_direct_allergen():
    """Verify direct allergen explainability payload."""
    finding = {
        "status": "high_attention",
        "risk_type": "direct_allergen",
        "trigger_text": "Peanut",
        "matched_rule": "Peanut Allergy (Severe)",
        "member_name": "Father",
        "product_name": "Peanut Butter Crunch",
        "confidence": 0.99,
        "attention_score": 95.0,
    }
    payload = build_explainability_payload(finding)

    assert "Direct Allergen Detected: Peanut" in payload["headline"]
    assert "Father" in payload["summary"]
    assert "Peanut" in payload["summary"]
    assert payload["confidence_level"] == "high"
    assert "Confidence reflects the available product/ingredient evidence" in payload["confidence_explanation"]
    assert "probability of an allergic reaction" in payload["confidence_explanation"]
    assert "Always verify the physical packaging" in payload["verification_guidance"]
    assert "100% safe" not in payload["summary"]
    assert "guaranteed" not in payload["summary"]
    assert "informational decision-support" in payload["disclaimer"]


@pytest.mark.asyncio
async def test_build_explainability_payload_derived_allergen():
    """Verify derived allergen explainability with relationship steps."""
    finding = {
        "status": "high_attention",
        "risk_type": "derived_allergen",
        "trigger_text": "Maida",
        "matched_rule": "Gluten-Free",
        "member_name": "Mother",
        "product_name": "Demo Biscuit",
        "confidence": 0.97,
        "attention_score": 92.0,
        "ingredient_path": [
            {"step_number": 1, "ingredient_name": "Maida"},
            {"step_number": 2, "ingredient_name": "Wheat"},
            {"step_number": 3, "ingredient_name": "Gluten"},
        ],
    }
    payload = build_explainability_payload(finding)

    assert "Derived Allergen Link: Maida is linked to Gluten-Free" in payload["headline"]
    assert payload["ingredient_chain"] == ["Maida", "Wheat", "Gluten"]
    assert len(payload["relationship_steps"]) >= 3
    assert payload["relationship_steps"][0]["from_node"] == "Maida"
    assert payload["relationship_steps"][0]["to_node"] == "Wheat"
    assert payload["confidence_level"] == "high"


@pytest.mark.asyncio
async def test_build_explainability_payload_cross_contact():
    """Verify cross-contact precautionary advisory explainability."""
    finding = {
        "status": "potential_conflict",
        "risk_type": "cross_contact",
        "trigger_text": "Processed in a facility that also handles Peanuts",
        "matched_rule": "Peanut Allergy",
        "member_name": "Child",
        "product_name": "Demo Snack",
        "cross_contact": True,
        "confidence": 0.85,
    }
    payload = build_explainability_payload(finding)

    assert "Precautionary Cross-Contact" in payload["headline"]
    assert payload["uncertainty_reason"] is not None
    assert "shared equipment or manufacturing facility" in payload["uncertainty_reason"]
    assert "may contain" in payload["verification_guidance"]


@pytest.mark.asyncio
async def test_build_explainability_payload_source_uncertainty():
    """Verify dual-source uncertainty explainability (e.g. INS 471)."""
    finding = {
        "status": "verification_required",
        "risk_type": "source_uncertainty",
        "trigger_text": "INS 471",
        "matched_rule": "Vegetarian",
        "member_name": "Grandmother",
        "product_name": "Demo Biscuit",
        "source_uncertainty": True,
        "requires_verification": True,
        "confidence": 0.70,
    }
    payload = build_explainability_payload(finding)

    assert "Dual-Source Origin Verification Required: INS 471" in payload["headline"]
    assert payload["confidence_level"] == "medium"
    assert payload["uncertainty_reason"] is not None
    assert "plant or animal" in payload["uncertainty_reason"]
    assert "vegetarian/vegan" in payload["verification_guidance"]


@pytest.mark.asyncio
async def test_api_get_finding_explanation_endpoint(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    auth_headers_user_a: dict,
):
    """Verify GET /api/risk/findings/{finding_id}/explanation returns complete Phase 7 object."""
    # Create family and member
    fam = Family(id=uuid.uuid4(), owner_user_id=user_a.id, name="Test Family")
    db_session.add(fam)
    await db_session.flush()

    member = FamilyMember(id=uuid.uuid4(), family_id=fam.id, name="Sarah", relationship="Parent")
    db_session.add(member)
    await db_session.flush()

    db_session.add(DietaryRule(
        id=uuid.uuid4(),
        member_id=member.id,
        rule_type="dietary",
        rule_value="gluten_free",
        label="Gluten-Free",
    ))
    await db_session.flush()

    # Retrieve seeded Demo Biscuit (which contains Maida -> Wheat -> Gluten)
    stmt_prod = select(Product).where(Product.name == "Demo Biscuit")
    prod = (await db_session.execute(stmt_prod)).scalars().first()
    assert prod is not None

    # Create receipt
    receipt = Receipt(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        family_id=fam.id,
        total_amount=150.0,
        processing_status="completed",
        ocr_text="DEMO BISCUIT 100G 45.00",
    )
    db_session.add(receipt)
    await db_session.flush()

    db_session.add(ReceiptItem(
        id=uuid.uuid4(),
        receipt_id=receipt.id,
        line_number=1,
        raw_text="Demo Biscuit",
        product_id=prod.id,
        total_price=150.0,
    ))
    await db_session.commit()

    # Run analysis
    analysis_resp = await client.post(f"/api/risk/receipts/{receipt.id}/analyze", headers=auth_headers_user_a)
    assert analysis_resp.status_code == 200
    data = analysis_resp.json()

    # Find a finding
    all_findings = []
    for m in data.get("members", []):
        all_findings.extend(m.get("product_results", []))

    assert len(all_findings) > 0
    target_f = all_findings[0]
    finding_id = target_f["id"]

    # Call Phase 7 explanation endpoint
    exp_res = await client.get(f"/api/risk/findings/{finding_id}/explanation", headers=auth_headers_user_a)
    assert exp_res.status_code == 200
    exp_data = exp_res.json()

    assert exp_data["finding_id"] == finding_id
    assert exp_data["member_name"] == "Sarah"
    assert exp_data["headline"] is not None
    assert len(exp_data["summary"]) > 0
    assert len(exp_data["verification_guidance"]) > 0
    assert "Confidence reflects the available product/ingredient evidence" in exp_data["confidence_explanation"]
    assert exp_data["confidence_level"] in ("high", "medium", "low", "unknown")
    assert len(exp_data["evidence"]) > 0
    assert exp_data["disclaimer"] is not None
