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
from app.models.ingredient_exclusion import IngredientExclusion
from app.models.nutrition_preference import NutritionPreference
from app.models.custom_rule import CustomRule
from app.models.product import Product
from app.models.receipt import Receipt
from app.models.receipt_item import ReceiptItem
from app.data.product_seed_data import seed_product_knowledge
from app.services.family_risk_service import family_risk_service


@pytest.fixture(autouse=True)
async def seed_data(db_session: AsyncSession):
    """Seed product & ingredient knowledge base automatically for all risk tests."""
    await seed_product_knowledge(db_session)


@pytest.fixture
async def seeded_family(db_session: AsyncSession, user_a: User):
    """Creates the standard prompt family:
    - Father: Peanut allergy (Severe)
    - Mother: Reduce sodium
    - Child: Lactose intolerance
    - Grandmother: Vegetarian
    """
    family = Family(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        name="Sharma Family",
    )
    db_session.add(family)
    await db_session.flush()

    # Father
    father = FamilyMember(
        id=uuid.uuid4(),
        family_id=family.id,
        name="Father",
        relationship="Parent",
    )
    db_session.add(father)
    await db_session.flush()
    db_session.add(Allergy(
        id=uuid.uuid4(),
        member_id=father.id,
        name="Peanut",
        severity="severe",
    ))

    # Mother
    mother = FamilyMember(
        id=uuid.uuid4(),
        family_id=family.id,
        name="Mother",
        relationship="Parent",
    )
    db_session.add(mother)
    await db_session.flush()
    db_session.add(NutritionPreference(
        id=uuid.uuid4(),
        member_id=mother.id,
        preference_type="reduce_sodium",
        preference_value="true",
    ))

    # Child
    child = FamilyMember(
        id=uuid.uuid4(),
        family_id=family.id,
        name="Child",
        relationship="Child",
    )
    db_session.add(child)
    await db_session.flush()
    db_session.add(Allergy(
        id=uuid.uuid4(),
        member_id=child.id,
        name="Lactose intolerance",
        severity="moderate",
    ))
    db_session.add(IngredientExclusion(
        id=uuid.uuid4(),
        member_id=child.id,
        ingredient_name="Gelatin",
        reason="Preference",
    ))

    # Grandmother
    grandmother = FamilyMember(
        id=uuid.uuid4(),
        family_id=family.id,
        name="Grandmother",
        relationship="Grandparent",
    )
    db_session.add(grandmother)
    await db_session.flush()
    db_session.add(DietaryRule(
        id=uuid.uuid4(),
        member_id=grandmother.id,
        rule_type="dietary",
        rule_value="vegetarian",
        label="Vegetarian",
    ))

    await db_session.commit()
    return family


@pytest.fixture
async def seeded_receipt(db_session: AsyncSession, user_a: User, seeded_family: Family):
    """Creates a grocery receipt containing Demo Protein Bar, Demo Biscuit, Demo Gelatin Gummy."""
    stmt_p1 = select(Product).where(Product.name == "Demo Protein Bar")
    stmt_p2 = select(Product).where(Product.name == "Demo Biscuit")
    stmt_p3 = select(Product).where(Product.name == "Demo Gelatin Gummy")

    p1 = (await db_session.execute(stmt_p1)).scalars().first()
    p2 = (await db_session.execute(stmt_p2)).scalars().first()
    p3 = (await db_session.execute(stmt_p3)).scalars().first()

    receipt = Receipt(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        family_id=seeded_family.id,
        processing_status="completed",
        ocr_text="DEMO PROTEIN BAR 60G 120.00\nDEMO BISCUIT 100G 45.00\nDEMO GUMMY 80G 60.00",
    )
    db_session.add(receipt)
    await db_session.flush()

    if p1:
        db_session.add(ReceiptItem(
            id=uuid.uuid4(),
            receipt_id=receipt.id,
            line_number=1,
            raw_text="DEMO PROTEIN BAR 60G 120.00",
            product_name_raw="Demo Protein Bar",
            product_id=p1.id,
            match_method="exact_name",
            match_confidence=0.98,
        ))
    if p2:
        db_session.add(ReceiptItem(
            id=uuid.uuid4(),
            receipt_id=receipt.id,
            line_number=2,
            raw_text="DEMO BISCUIT 100G 45.00",
            product_name_raw="Demo Biscuit",
            product_id=p2.id,
            match_method="exact_name",
            match_confidence=0.96,
        ))
    if p3:
        db_session.add(ReceiptItem(
            id=uuid.uuid4(),
            receipt_id=receipt.id,
            line_number=3,
            raw_text="DEMO GUMMY 80G 60.00",
            product_name_raw="Demo Gelatin Gummy",
            product_id=p3.id,
            match_method="exact_name",
            match_confidence=0.98,
        ))

    await db_session.commit()
    return receipt


# ============================================================
# Core Test Scenarios
# ============================================================

@pytest.mark.asyncio
async def test_direct_allergen_matching(
    client: AsyncClient,
    auth_headers_user_a: dict,
    db_session: AsyncSession,
    seeded_family: Family,
    user_a: User,
):
    """TEST 1: Direct allergen matching.
    Father has Peanut allergy. Product with direct Peanut triggers high_attention, direct_allergen.
    """
    # Create direct Peanut product
    prod = Product(
        id=uuid.uuid4(),
        name="Demo Roasted Peanuts",
        normalized_name="demo roasted peanuts",
        barcode="8901234560098",
        confidence=1.0,
    )
    db_session.add(prod)
    await db_session.flush()

    from app.models.ingredient import Ingredient
    from app.models.product_ingredient import ProductIngredient

    stmt_ing = select(Ingredient).where(Ingredient.canonical_name == "peanut")
    ing_peanut = (await db_session.execute(stmt_ing)).scalars().first()

    db_session.add(ProductIngredient(
        id=uuid.uuid4(),
        product_id=prod.id,
        ingredient_id=ing_peanut.id if ing_peanut else None,
        raw_name="Roasted Peanuts",
        normalized_name="peanut",
        sequence=1,
        match_method="exact",
        match_confidence=1.0,
    ))

    receipt = Receipt(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        family_id=seeded_family.id,
        processing_status="completed",
    )
    db_session.add(receipt)
    await db_session.flush()

    db_session.add(ReceiptItem(
        id=uuid.uuid4(),
        receipt_id=receipt.id,
        line_number=1,
        raw_text="DEMO ROASTED PEANUTS",
        product_name_raw="Demo Roasted Peanuts",
        product_id=prod.id,
    ))
    await db_session.commit()


    resp = await client.post(
        f"/api/risk/receipts/{receipt.id}/analyze",
        headers=auth_headers_user_a,
    )
    assert resp.status_code == 200
    data = resp.json()

    # Find Father's results
    father_res = next(m for m in data["members"] if m["member_name"] == "Father")
    assert father_res["summary"]["high"] >= 1

    peanut_finding = next(
        f for f in father_res["product_results"]
        if f["product_id"] == str(prod.id) and f["status"] == "high_attention"
    )
    assert peanut_finding["risk_type"] == "direct_allergen"
    assert "peanut" in peanut_finding["trigger_text"].lower()
    assert peanut_finding["cross_contact"] is False

    assert "is explicitly present" in peanut_finding["reason"].lower()



@pytest.mark.asyncio
async def test_derived_allergen_matching(
    client: AsyncClient,
    auth_headers_user_a: dict,
    db_session: AsyncSession,
    seeded_family: Family,
    user_a: User,
):
    """TEST 2: Derived allergen matching.
    Child has Lactose intolerance. Product: Demo Biscuit has Sodium Caseinate -> Casein -> Milk.
    Expected: derived_allergen, ingredient path preserved.
    """
    stmt_p = select(Product).where(Product.name == "Demo Biscuit")
    prod = (await db_session.execute(stmt_p)).scalars().first()
    assert prod is not None

    receipt = Receipt(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        family_id=seeded_family.id,
        processing_status="completed",
    )
    db_session.add(receipt)
    await db_session.flush()

    db_session.add(ReceiptItem(
        id=uuid.uuid4(),
        receipt_id=receipt.id,
        line_number=1,
        raw_text="DEMO BISCUIT",
        product_name_raw="Demo Biscuit",
        product_id=prod.id,
    ))
    await db_session.commit()

    resp = await client.post(
        f"/api/risk/receipts/{receipt.id}/analyze",
        headers=auth_headers_user_a,
    )
    assert resp.status_code == 200
    data = resp.json()

    child_res = next(m for m in data["members"] if m["member_name"] == "Child")
    casein_finding = next(
        f for f in child_res["product_results"]
        if f["product_id"] == str(prod.id) and f["risk_type"] == "derived_allergen"
    )
    assert casein_finding is not None
    assert len(casein_finding["ingredient_path"]) >= 2
    path_names = [p["ingredient_name"].lower() for p in casein_finding["ingredient_path"]]
    assert any("casein" in p or "milk" in p for p in path_names)


@pytest.mark.asyncio
async def test_cross_contact_matching(
    client: AsyncClient,
    auth_headers_user_a: dict,
    db_session: AsyncSession,
    seeded_family: Family,
    user_a: User,
):
    """TEST 3: Cross-contact matching.
    Father has Peanut allergy. Product Demo Protein Bar has "May contain traces of peanuts".
    Expected: potential_conflict, cross_contact = True, NOT direct_allergen.
    """
    stmt_p = select(Product).where(Product.name == "Demo Protein Bar")
    prod = (await db_session.execute(stmt_p)).scalars().first()
    assert prod is not None

    receipt = Receipt(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        family_id=seeded_family.id,
        processing_status="completed",
    )
    db_session.add(receipt)
    await db_session.flush()

    db_session.add(ReceiptItem(
        id=uuid.uuid4(),
        receipt_id=receipt.id,
        line_number=1,
        raw_text="DEMO PROTEIN BAR",
        product_name_raw="Demo Protein Bar",
        product_id=prod.id,
    ))
    await db_session.commit()

    resp = await client.post(
        f"/api/risk/receipts/{receipt.id}/analyze",
        headers=auth_headers_user_a,
    )
    assert resp.status_code == 200
    data = resp.json()

    father_res = next(m for m in data["members"] if m["member_name"] == "Father")
    cross_finding = next(
        f for f in father_res["product_results"]
        if f["product_id"] == str(prod.id) and f["risk_type"] == "cross_contact"
    )
    assert cross_finding["status"] == "potential_conflict"
    assert cross_finding["cross_contact"] is True
    assert "May contain" in cross_finding["trigger_text"] or "peanuts" in cross_finding["trigger_text"].lower()


@pytest.mark.asyncio
async def test_source_uncertainty_matching(
    client: AsyncClient,
    auth_headers_user_a: dict,
    db_session: AsyncSession,
    seeded_family: Family,
    user_a: User,
):
    """TEST 4: Source uncertainty matching.
    Grandmother is Vegetarian. Product Demo Protein Bar has INS 471 (plant/animal source uncertainty).
    Expected: verification_required, source_uncertainty = True, NOT classified as safe or unsafe.
    """
    stmt_p = select(Product).where(Product.name == "Demo Protein Bar")
    prod = (await db_session.execute(stmt_p)).scalars().first()
    assert prod is not None

    receipt = Receipt(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        family_id=seeded_family.id,
        processing_status="completed",
    )
    db_session.add(receipt)
    await db_session.flush()

    db_session.add(ReceiptItem(
        id=uuid.uuid4(),
        receipt_id=receipt.id,
        line_number=1,
        raw_text="DEMO PROTEIN BAR",
        product_name_raw="Demo Protein Bar",
        product_id=prod.id,
    ))
    await db_session.commit()

    resp = await client.post(
        f"/api/risk/receipts/{receipt.id}/analyze",
        headers=auth_headers_user_a,
    )
    assert resp.status_code == 200
    data = resp.json()

    grandma_res = next(m for m in data["members"] if m["member_name"] == "Grandmother")
    src_finding = next(
        f for f in grandma_res["product_results"]
        if f["product_id"] == str(prod.id) and f["risk_type"] == "source_uncertainty"
    )
    assert src_finding["status"] == "verification_required"
    assert src_finding["source_uncertainty"] is True
    assert src_finding["requires_verification"] is True
    assert "source of this ingredient could not be confidently established" in src_finding["reason"]


@pytest.mark.asyncio
async def test_ingredient_exclusion_matching(
    client: AsyncClient,
    auth_headers_user_a: dict,
    db_session: AsyncSession,
    seeded_family: Family,
    user_a: User,
):
    """TEST 5: Ingredient exclusion matching.
    Child has explicit exclusion for Gelatin. Product Demo Gelatin Gummy has Gelatin.
    Expected: high_attention, ingredient_exclusion.
    """
    stmt_p = select(Product).where(Product.name == "Demo Gelatin Gummy")
    prod = (await db_session.execute(stmt_p)).scalars().first()
    assert prod is not None

    receipt = Receipt(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        family_id=seeded_family.id,
        processing_status="completed",
    )
    db_session.add(receipt)
    await db_session.flush()

    db_session.add(ReceiptItem(
        id=uuid.uuid4(),
        receipt_id=receipt.id,
        line_number=1,
        raw_text="DEMO GUMMY",
        product_name_raw="Demo Gelatin Gummy",
        product_id=prod.id,
    ))
    await db_session.commit()

    resp = await client.post(
        f"/api/risk/receipts/{receipt.id}/analyze",
        headers=auth_headers_user_a,
    )
    assert resp.status_code == 200
    data = resp.json()

    child_res = next(m for m in data["members"] if m["member_name"] == "Child")
    excl_finding = next(
        f for f in child_res["product_results"]
        if f["product_id"] == str(prod.id) and f["risk_type"] == "ingredient_exclusion"
    )
    assert excl_finding["status"] == "high_attention"
    assert "Gelatin" in excl_finding["trigger_text"]


@pytest.mark.asyncio
async def test_no_configured_conflict_and_wording(
    client: AsyncClient,
    auth_headers_user_a: dict,
    db_session: AsyncSession,
    user_a: User,
):
    """TEST 6: No configured conflict.
    Member configured reduce sugar. Product is plain water or rice with no conflicts.
    Expected: no_configured_conflict, never labeled as 100% safe.
    """
    fam = Family(id=uuid.uuid4(), owner_user_id=user_a.id, name="Simple Fam")
    db_session.add(fam)
    await db_session.flush()

    m = FamilyMember(id=uuid.uuid4(), family_id=fam.id, name="User1")
    db_session.add(m)
    await db_session.flush()
    db_session.add(NutritionPreference(
        id=uuid.uuid4(),
        member_id=m.id,
        preference_type="reduce_sugar",
        preference_value="true",
    ))

    # Product: Demo Plain Rice (no sugar, no allergens)
    prod = Product(
        id=uuid.uuid4(),
        name="Demo Basmati Rice",
        normalized_name="demo basmati rice",
        barcode="8901234560099",
        confidence=1.0,
    )
    db_session.add(prod)
    await db_session.flush()


    receipt = Receipt(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        family_id=fam.id,
        processing_status="completed",
    )
    db_session.add(receipt)
    await db_session.flush()

    db_session.add(ReceiptItem(
        id=uuid.uuid4(),
        receipt_id=receipt.id,
        line_number=1,
        raw_text="DEMO BASMATI RICE",
        product_name_raw="Demo Basmati Rice",
        product_id=prod.id,
    ))
    await db_session.commit()

    resp = await client.post(
        f"/api/risk/receipts/{receipt.id}/analyze",
        headers=auth_headers_user_a,
    )
    assert resp.status_code == 200
    data = resp.json()

    user_res = data["members"][0]
    finding = user_res["product_results"][0]
    assert finding["status"] == "no_configured_conflict"
    assert "No match was found between the available product information" in finding["reason"]
    assert "safe" not in finding["title"].lower()


@pytest.mark.asyncio
async def test_end_to_end_critical_scenario_protein_bar(
    client: AsyncClient,
    auth_headers_user_a: dict,
    seeded_family: Family,
    seeded_receipt: Receipt,
):
    """TEST 7 & 9: Full multi-member evaluation on Demo Protein Bar.
    Father: cross-contact (May contain peanuts)
    Child: derived allergen (Whey -> Milk)
    Grandmother: source uncertainty (INS 471)
    """
    resp = await client.post(
        f"/api/risk/receipts/{seeded_receipt.id}/analyze",
        headers=auth_headers_user_a,
    )
    assert resp.status_code == 200
    data = resp.json()

    summary = data["summary"]
    assert summary["products_analyzed"] >= 3
    assert summary["members_analyzed"] == 4
    assert summary["members_with_conflicts"] >= 2

    # Check Father
    father = next(m for m in data["members"] if m["member_name"] == "Father")
    assert any(f["cross_contact"] is True for f in father["product_results"])

    # Check Child
    child = next(m for m in data["members"] if m["member_name"] == "Child")
    assert any(f["risk_type"] == "derived_allergen" for f in child["product_results"])

    # Check Grandmother
    grandma = next(m for m in data["members"] if m["member_name"] == "Grandmother")
    assert any(f["source_uncertainty"] is True for f in grandma["product_results"])


@pytest.mark.asyncio
async def test_family_matrix_structure(
    client: AsyncClient,
    auth_headers_user_a: dict,
    seeded_family: Family,
    seeded_receipt: Receipt,
):
    """TEST 14 & 15: Family Risk Matrix (Family Members x Products).
    4 family members x 3 products = 12 matrix cells.
    """
    resp = await client.post(
        f"/api/risk/receipts/{seeded_receipt.id}/analyze",
        headers=auth_headers_user_a,
    )
    assert resp.status_code == 200
    data = resp.json()

    matrix = data["matrix"]
    assert matrix is not None
    assert len(matrix) == 12  # 4 members * 3 products

    for cell in matrix:
        assert cell["member_name"] in ["Father", "Mother", "Child", "Grandmother"]
        assert cell["status"] in [
            "high_attention",
            "potential_conflict",
            "verification_required",
            "no_configured_conflict",
            "insufficient_information",
        ]
        assert "attention_score" in cell


@pytest.mark.asyncio
async def test_security_isolation(
    client: AsyncClient,
    auth_headers_user_a: dict,
    auth_headers_user_b: dict,
    seeded_receipt: Receipt,
):
    """TEST 16: Security isolation.
    User B cannot analyze or view User A's receipt risk analyses.
    """
    # User B attempts to analyze User A's receipt
    resp = await client.post(
        f"/api/risk/receipts/{seeded_receipt.id}/analyze",
        headers=auth_headers_user_b,
    )
    assert resp.status_code in [400, 404]

    # Analyze as User A
    resp_a = await client.post(
        f"/api/risk/receipts/{seeded_receipt.id}/analyze",
        headers=auth_headers_user_a,
    )
    assert resp_a.status_code == 200
    analysis_id = resp_a.json()["id"]

    # User B attempts to fetch User A's analysis
    resp_b_get = await client.get(
        f"/api/risk/analyses/{analysis_id}",
        headers=auth_headers_user_b,
    )
    assert resp_b_get.status_code == 404


@pytest.mark.asyncio
async def test_idempotent_reanalysis_versioning(
    client: AsyncClient,
    auth_headers_user_a: dict,
    seeded_receipt: Receipt,
):
    """TEST 17 & 18: Re-analysis creates distinct versioned records without corrupting past findings."""
    # First analysis
    resp1 = await client.post(
        f"/api/risk/receipts/{seeded_receipt.id}/analyze",
        headers=auth_headers_user_a,
    )
    assert resp1.status_code == 200
    d1 = resp1.json()
    v1 = d1["analysis_version"]
    assert v1 == "v1.0.0"

    # Second analysis (reanalysis)
    resp2 = await client.post(
        f"/api/risk/receipts/{seeded_receipt.id}/analyze",
        headers=auth_headers_user_a,
    )
    assert resp2.status_code == 200
    d2 = resp2.json()
    v2 = d2["analysis_version"]
    assert v2 != v1
    assert "v2" in v2


@pytest.mark.asyncio
async def test_member_and_product_risk_endpoints(
    client: AsyncClient,
    auth_headers_user_a: dict,
    seeded_family: Family,
    seeded_receipt: Receipt,
    db_session: AsyncSession,
):
    """TEST: Individual member and product detail risk endpoints."""
    # Run analysis
    await client.post(
        f"/api/risk/receipts/{seeded_receipt.id}/analyze",
        headers=auth_headers_user_a,
    )

    # 1. Member endpoint
    stmt_child = select(FamilyMember).where(FamilyMember.name == "Child")
    child = (await db_session.execute(stmt_child)).scalars().first()
    assert child is not None

    resp_m = await client.get(
        f"/api/risk/receipts/{seeded_receipt.id}/members/{child.id}",
        headers=auth_headers_user_a,
    )
    assert resp_m.status_code == 200
    m_data = resp_m.json()
    assert m_data["member_name"] == "Child"
    assert len(m_data["product_results"]) >= 3

    # 2. Product endpoint
    stmt_p = select(Product).where(Product.name == "Demo Protein Bar")
    prod = (await db_session.execute(stmt_p)).scalars().first()
    assert prod is not None

    resp_p = await client.get(
        f"/api/risk/receipts/{seeded_receipt.id}/products/{prod.id}",
        headers=auth_headers_user_a,
    )
    assert resp_p.status_code == 200
    p_data = resp_p.json()
    assert p_data["product_name"] == "Demo Protein Bar"
    assert len(p_data["impacted_members"]) == 4
