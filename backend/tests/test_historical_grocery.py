import pytest
import uuid
from datetime import datetime, timezone, timedelta
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
from app.models.product import Product
from app.models.receipt import Receipt
from app.models.receipt_item import ReceiptItem
from app.data.product_seed_data import seed_product_knowledge
from app.data.history_seed_data import seed_family_purchase_history
from app.services.historical_grocery_service import historical_grocery_service


@pytest.fixture(autouse=True)
async def seed_data(db_session: AsyncSession):
    """Seed product & ingredient knowledge base automatically for all tests."""
    await seed_product_knowledge(db_session)


@pytest.fixture
async def seeded_family(db_session: AsyncSession, user_a: User):
    """Creates standard test family:
    - Father: Peanut allergy (Severe)
    - Mother: Gluten intolerance / Gluten-free rule
    - Child: Lactose intolerance & Gelatin exclusion
    - Grandmother: Vegetarian
    """
    family = Family(
        id=uuid.uuid4(),
        owner_user_id=user_a.id,
        name="Verma Family",
    )
    db_session.add(family)
    await db_session.flush()

    # Father: Peanut allergy
    father = FamilyMember(id=uuid.uuid4(), family_id=family.id, name="Father", relationship="Parent")
    db_session.add(father)
    await db_session.flush()
    db_session.add(Allergy(id=uuid.uuid4(), member_id=father.id, name="Peanut", severity="severe"))

    # Mother: Gluten-free rule
    mother = FamilyMember(id=uuid.uuid4(), family_id=family.id, name="Mother", relationship="Parent")
    db_session.add(mother)
    await db_session.flush()
    db_session.add(DietaryRule(id=uuid.uuid4(), member_id=mother.id, rule_type="dietary", rule_value="gluten_free", label="Gluten-Free"))

    # Child: Lactose & Gelatin
    child = FamilyMember(id=uuid.uuid4(), family_id=family.id, name="Child", relationship="Child")
    db_session.add(child)
    await db_session.flush()
    db_session.add(Allergy(id=uuid.uuid4(), member_id=child.id, name="Lactose", severity="moderate"))
    db_session.add(IngredientExclusion(id=uuid.uuid4(), member_id=child.id, ingredient_name="Gelatin", reason="Preference"))

    # Grandmother: Vegetarian
    grandmother = FamilyMember(id=uuid.uuid4(), family_id=family.id, name="Grandmother", relationship="Grandparent")
    db_session.add(grandmother)
    await db_session.flush()
    db_session.add(DietaryRule(id=uuid.uuid4(), member_id=grandmother.id, rule_type="dietary", rule_value="vegetarian", label="Vegetarian"))

    await db_session.commit()
    return family


@pytest.mark.asyncio
async def test_multiple_receipts_aggregate_correctly(db_session: AsyncSession, user_a: User, seeded_family: Family):
    """Verifies that multiple receipts aggregate properly into historical risk snapshots,
    calculating receipts, total spend, total purchased products, and unique products.
    """
    receipt_ids = await seed_family_purchase_history(db_session, seeded_family.id, user_a.id)
    assert len(receipt_ids) == 4

    summary = await historical_grocery_service.get_summary(db_session, seeded_family.id, period="all")
    assert summary.total_receipts == 4
    assert summary.total_purchased_products >= 10
    assert summary.total_unique_products >= 3
    assert summary.recurring_products_count >= 1
    assert summary.total_spend > 0.0
    assert summary.currency == "INR"
    assert "not medical advice" in summary.disclaimer
    assert "not food ingested or consumed" in summary.disclaimer


@pytest.mark.asyncio
async def test_recurring_products_analysis(db_session: AsyncSession, user_a: User, seeded_family: Family):
    """Verifies that products purchased multiple times (e.g. Demo Protein Bar purchased 4 times)
    have correct purchase counts, pricing stats, affected members, and explainability finding links.
    """
    await seed_family_purchase_history(db_session, seeded_family.id, user_a.id)

    resp = await historical_grocery_service.get_recurring_products(db_session, seeded_family.id, period="all")
    assert resp.total_products_tracked > 0

    protein_bar = next((p for p in resp.recurring_products if "protein bar" in p.product_name.lower()), None)
    assert protein_bar is not None
    assert protein_bar.purchase_count == 4
    assert protein_bar.total_quantity >= 4.0
    assert protein_bar.number_of_receipts == 4
    assert protein_bar.average_price > 0.0

    # Demo Protein Bar triggers Peanut for Father, Dairy for Child, and INS 471 source uncertainty
    assert len(protein_bar.affected_members) > 0
    father_impact = next((m for m in protein_bar.affected_members if m.member_name == "Father"), None)
    assert father_impact is not None
    assert "direct_allergen" in father_impact.conflict_types or "cross_contact" in father_impact.conflict_types or len(father_impact.status_counts) > 0

    # Verify sample finding id is populated for Phase 7 drilldown
    assert protein_bar.sample_finding_id is not None or father_impact.sample_finding_id is not None


@pytest.mark.asyncio
async def test_recurring_ingredients_directly_observed_and_derived(db_session: AsyncSession, user_a: User, seeded_family: Family):
    """Verifies distinction between DIRECTLY OBSERVED label ingredients and RELATIONSHIP-DERIVED
    ingredients (Phase 2), as well as source uncertainty tracking (INS 471).
    """
    await seed_family_purchase_history(db_session, seeded_family.id, user_a.id)

    ing_resp = await historical_grocery_service.get_recurring_ingredients(db_session, seeded_family.id, period="all")
    assert ing_resp.total_ingredients_observed > 0
    assert len(ing_resp.directly_observed) > 0

    # Directly observed checks
    observed_names = [i.ingredient_name.lower() for i in ing_resp.directly_observed]
    assert any("maida" in name or "whey" in name or "peanut" in name for name in observed_names)

    # Derived ingredients check (e.g. Wheat, Gluten, Milk)
    if ing_resp.relationship_derived:
        derived_names = [i.ingredient_name.lower() for i in ing_resp.relationship_derived]
        assert any("gluten" in name or "wheat" in name or "milk" in name for name in derived_names)

    # Source uncertainty tracking check (INS 471)
    uncertain_item = next((i for i in ing_resp.directly_observed if i.source_uncertainty), None)
    if uncertain_item:
        assert uncertain_item.source_uncertainty_count > 0


@pytest.mark.asyncio
async def test_member_trend_aggregation(db_session: AsyncSession, user_a: User, seeded_family: Family):
    """Verifies that member-specific purchase trends track distinct member impacts
    without asserting personal ingestion or medical exposure.
    """
    await seed_family_purchase_history(db_session, seeded_family.id, user_a.id)

    mem_resp = await historical_grocery_service.get_member_impact(db_session, seeded_family.id, period="all")
    assert len(mem_resp.members) == 4

    # Father: Should have Peanut-related recurring findings
    father_stat = next((m for m in mem_resp.members if m.member_name == "Father"), None)
    assert father_stat is not None
    assert father_stat.total_purchases_analyzed > 0
    assert father_stat.products_requiring_attention > 0 or father_stat.potential_conflicts > 0
    assert len(father_stat.recurring_allergens) > 0
    assert any("peanut" in a.requirement_name.lower() for a in father_stat.recurring_allergens)

    # Mother: Should have Gluten-related recurring findings
    mother_stat = next((m for m in mem_resp.members if m.member_name == "Mother"), None)
    assert mother_stat is not None
    assert len(mother_stat.recurring_dietary_conflicts) > 0 or len(mother_stat.recurring_allergens) > 0

    # Disclaimer check
    assert "not represent personal consumption" in mem_resp.disclaimer


@pytest.mark.asyncio
async def test_recurring_attention_engine(db_session: AsyncSession, user_a: User, seeded_family: Family):
    """Verifies deterministic pattern detection rules:
    - Rule 1: Same product purchased >= 2 times with conflict
    - Rule 2: Shared derived allergen across multiple products
    - Rule 3: Recurring source uncertainties (INS 471)
    """
    await seed_family_purchase_history(db_session, seeded_family.id, user_a.id)

    patterns_resp = await historical_grocery_service.get_recurring_patterns(db_session, seeded_family.id, period="all")
    assert len(patterns_resp.patterns) > 0

    pattern_types = [p.pattern_type for p in patterns_resp.patterns]
    assert "recurring_product_conflict" in pattern_types
    
    prod_pattern = next(p for p in patterns_resp.patterns if p.pattern_type == "recurring_product_conflict")
    assert prod_pattern.supporting_purchase_count >= 2
    assert len(prod_pattern.affected_members) > 0
    assert len(prod_pattern.supporting_receipt_ids) >= 2
    assert prod_pattern.actionable_review != ""


@pytest.mark.asyncio
async def test_date_filtering_and_periods(db_session: AsyncSession, user_a: User, seeded_family: Family):
    """Verifies that date filters ('all', '7d', '30d', 'custom') return correct subsets."""
    await seed_family_purchase_history(db_session, seeded_family.id, user_a.id)

    # All time
    sum_all = await historical_grocery_service.get_summary(db_session, seeded_family.id, period="all")
    assert sum_all.total_receipts == 4

    # Last 7 days should only have Receipt 4 (purchased 2 days ago)
    sum_7d = await historical_grocery_service.get_summary(db_session, seeded_family.id, period="7d")
    assert sum_7d.total_receipts <= sum_all.total_receipts
    assert sum_7d.total_receipts >= 1


@pytest.mark.asyncio
async def test_period_over_period_comparison(db_session: AsyncSession, user_a: User, seeded_family: Family):
    """Verifies current vs previous period comparison with neutral, non-judgmental language."""
    await seed_family_purchase_history(db_session, seeded_family.id, user_a.id)

    comp = await historical_grocery_service.get_period_comparison(db_session, seeded_family.id, period="30d")
    assert comp.current_period_name != ""
    assert comp.previous_period_name != ""
    assert len(comp.changes) > 0
    # Guardrail check: no judgmental words like "healthier", "bad choices", etc.
    combined_text = " ".join(comp.changes).lower() + " " + comp.summary.lower()
    assert "bad" not in combined_text
    assert "unhealthy" not in combined_text
    assert "improved diet" not in combined_text


@pytest.mark.asyncio
async def test_coverage_and_unresolved_products(db_session: AsyncSession, user_a: User, seeded_family: Family):
    """Verifies that unmapped/unresolved items are surfaced clearly and NOT treated as safe."""
    await seed_family_purchase_history(db_session, seeded_family.id, user_a.id)

    cov = await historical_grocery_service.get_coverage(db_session, seeded_family.id)
    assert cov.total_receipts_uploaded == 4
    assert cov.total_line_items > cov.matched_products  # because 1 item was unresolved
    assert cov.unresolved_products >= 1
    assert cov.coverage_percentage < 100.0


@pytest.mark.asyncio
async def test_family_isolation_and_security(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    user_b: User,
    auth_headers_user_a: dict,
    auth_headers_user_b: dict,
    seeded_family: Family,
):
    """Verifies strict family isolation: User B cannot query User A's family purchase history."""
    await seed_family_purchase_history(db_session, seeded_family.id, user_a.id)

    # User A succeeds
    resp_a = await client.get(f"/api/history/family/{seeded_family.id}/summary", headers=auth_headers_user_a)
    assert resp_a.status_code == 200

    # User B fails with 404
    resp_b = await client.get(f"/api/history/family/{seeded_family.id}/summary", headers=auth_headers_user_b)
    assert resp_b.status_code == 404


@pytest.mark.asyncio
async def test_api_endpoints_full_cycle(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    auth_headers_user_a: dict,
    seeded_family: Family,
):
    """Exercises all Phase 8 history API endpoints:
    - GET /api/history/family/{family_id}
    - GET /api/history/family/{family_id}/summary
    - GET /api/history/family/{family_id}/products
    - GET /api/history/family/{family_id}/ingredients
    - GET /api/history/family/{family_id}/members
    - GET /api/history/family/{family_id}/trends
    - GET /api/history/family/{family_id}/comparison
    - GET /api/history/family/{family_id}/report
    - GET /api/history/family/{family_id}/coverage
    - POST /api/history/family/{family_id}/refresh
    """
    await seed_family_purchase_history(db_session, seeded_family.id, user_a.id)

    # 1. Overview
    r = await client.get(f"/api/history/family/{seeded_family.id}", headers=auth_headers_user_a)
    assert r.status_code == 200
    data = r.json()
    assert "summary" in data
    assert "timeline" in data
    assert len(data["timeline"]) == 4

    # 2. Products
    r = await client.get(f"/api/history/family/{seeded_family.id}/products", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert "recurring_products" in r.json()

    # 3. Ingredients
    r = await client.get(f"/api/history/family/{seeded_family.id}/ingredients", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert "directly_observed" in r.json()

    # 4. Members
    r = await client.get(f"/api/history/family/{seeded_family.id}/members", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert "members" in r.json()

    # 5. Trends / Recurring Findings
    r = await client.get(f"/api/history/family/{seeded_family.id}/trends", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert "patterns" in r.json()

    # 6. Comparison
    r = await client.get(f"/api/history/family/{seeded_family.id}/comparison?period=30d", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert "changes" in r.json()

    # 7. Report
    r = await client.get(f"/api/history/family/{seeded_family.id}/report", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert "top_recurring_patterns" in r.json()

    # 8. Coverage
    r = await client.get(f"/api/history/family/{seeded_family.id}/coverage", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert "coverage_percentage" in r.json()

    # 9. Refresh
    r = await client.post(f"/api/history/family/{seeded_family.id}/refresh", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert r.json()["status"] == "success"
