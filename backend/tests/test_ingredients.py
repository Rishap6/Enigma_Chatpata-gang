import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.data.seed_data import seed_ingredient_knowledge
from app.models.ingredient import Ingredient
from app.models.ingredient_relationship import IngredientRelationship
from app.engines.ingredient_normalization import normalize_ingredient
from app.engines.relationship_engine import trace_ingredient
from app.engines.source_engine import analyze_source
from app.engines.allergen_engine import get_allergens_for_ingredient
from app.engines.dietary_engine import get_dietary_properties
from app.engines.ingredient_analysis import analyze_ingredient


@pytest.fixture(autouse=True)
async def seed_data(db_session: AsyncSession):
    """Seed knowledge base automatically for all ingredient tests."""
    await seed_ingredient_knowledge(db_session)


@pytest.mark.asyncio
async def test_seed_idempotency(db_session: AsyncSession):
    """Test 1: Seeding is repeatable and idempotent without duplicate key failures."""
    await seed_ingredient_knowledge(db_session)
    result = await db_session.execute(select(Ingredient))
    ingredients = result.scalars().all()
    assert len(ingredients) >= 15


@pytest.mark.asyncio
async def test_whey_protein_analysis(client: AsyncClient):
    """Test 1 / Prompt Test 1: Whey Protein analysis resolves canonical whey, milk relationship, dairy, allergen milk."""
    resp = await client.post("/api/ingredients/analyze", json={"text": "Whey Protein"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["matched"] is True
    assert data["normalized_ingredient"]["canonical_name"] == "whey"
    assert data["normalized_ingredient"]["display_name"] == "Whey"
    assert data["confidence"] >= 0.90
    assert data["requires_verification"] is False

    # Check categories
    cat_names = data["categories"]
    assert any("dairy" in c.lower() or "milk-derived" in c.lower() for c in cat_names)

    # Check allergens
    allergen_names = [a["name"] for a in data["allergens"]]
    assert "Milk" in allergen_names

    # Check source
    sources = [s["type"] for s in data["sources"]]
    assert "milk" in sources or "animal" in sources


@pytest.mark.asyncio
async def test_sodium_caseinate_multi_level_derivation(client: AsyncClient):
    """Test 2 / Prompt Test 2: Sodium Caseinate -> Casein -> Milk derivation chain."""
    resp = await client.post("/api/ingredients/analyze", json={"text": "Sodium Caseinate"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["matched"] is True
    assert data["normalized_ingredient"]["canonical_name"] == "sodium_caseinate"

    # Multi-level allergen resolution: derived from Milk
    allergen_names = [a["name"] for a in data["allergens"]]
    assert "Milk" in allergen_names

    # Check relationship chain traversal
    chains = data["relationship_chains"]
    assert len(chains) > 0
    # At least one chain should contain Casein and Milk
    path_found = False
    for chain in chains:
        p = [step.lower() for step in chain["path"]]
        if "sodium caseinate" in p and ("casein" in p or "caseinate" in p or "milk" in p):
            path_found = True
            break
    assert path_found, f"Expected chain not found in {chains}"


@pytest.mark.asyncio
async def test_maida_wheat_derivation(client: AsyncClient):
    """Test 3 / Prompt Test 3: Maida resolves to wheat and gluten categories."""
    resp = await client.post("/api/ingredients/analyze", json={"text": "Maida"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["matched"] is True
    assert data["normalized_ingredient"]["canonical_name"] == "maida"
    # Allergen resolved: Wheat
    allergen_names = [a["name"] for a in data["allergens"]]
    assert "Wheat" in allergen_names

    # Category includes Wheat
    cat_names = [c.lower() for c in data["categories"]]
    assert "wheat" in cat_names


@pytest.mark.asyncio
async def test_gelatin_animal_derived(client: AsyncClient):
    """Test 4 / Prompt Test 4: Gelatin -> Collagen -> Animal-derived with vegetarian incompatibility."""
    resp = await client.post("/api/ingredients/analyze", json={"text": "Gelatin"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["matched"] is True
    assert data["normalized_ingredient"]["canonical_name"] == "gelatin"

    # Dietary summary
    dietary = data["dietary_summary"]
    assert dietary.get("animal_derived") == "known_animal"
    assert dietary.get("vegetarian_compatible") == "incompatible"
    assert dietary.get("vegan_compatible") == "incompatible"


@pytest.mark.asyncio
async def test_ins_471_source_uncertainty(client: AsyncClient):
    """Test 5 / Prompt Test 5: INS 471 mono- and diglycerides has dual plant/animal source, uncertain status, requires verification."""
    resp = await client.post("/api/ingredients/analyze", json={"text": "INS 471"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["matched"] is True
    assert data["normalized_ingredient"]["canonical_name"] == "mono_and_diglycerides"

    # Source intelligence must show both plant and animal possibilities
    sources = data["sources"]
    source_types = [s["type"] for s in sources]
    assert "plant" in source_types
    assert "animal" in source_types

    # Must NOT classify as definitely vegetarian or definitely non-vegetarian
    assert data["requires_verification"] is True
    dietary = data["dietary_summary"]
    assert dietary.get("vegetarian_compatible") == "uncertain"
    assert dietary.get("animal_derived") == "uncertain"


@pytest.mark.asyncio
async def test_e471_alias_resolution(client: AsyncClient):
    """Test 6 / Prompt Test 6: E471 resolves to the same canonical ingredient as INS 471."""
    resp_e471 = await client.post("/api/ingredients/normalize", json={"text": "E471"})
    assert resp_e471.status_code == 200
    d_e471 = resp_e471.json()

    resp_ins471 = await client.post("/api/ingredients/normalize", json={"text": "INS 471"})
    assert resp_ins471.status_code == 200
    d_ins471 = resp_ins471.json()

    assert d_e471["matched"] is True
    assert d_ins471["matched"] is True
    assert d_e471["canonical_name"] == d_ins471["canonical_name"] == "mono_and_diglycerides"


@pytest.mark.asyncio
async def test_groundnut_alias_to_peanut(client: AsyncClient):
    """Test 7 / Prompt Test 7: Groundnut resolves to Peanut knowledge and Peanut allergen."""
    resp = await client.post("/api/ingredients/analyze", json={"text": "Groundnut"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["matched"] is True
    assert data["normalized_ingredient"]["canonical_name"] == "peanut"
    allergen_names = [a["name"] for a in data["allergens"]]
    assert "Peanut" in allergen_names


@pytest.mark.asyncio
async def test_unknown_ingredient_no_hallucination(client: AsyncClient):
    """Test 8 / Prompt Test 8: Unknown ingredient produces no false match and requires verification."""
    resp = await client.post("/api/ingredients/analyze", json={"text": "Unknown Ingredient XYZ"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["matched"] is False
    assert data["confidence"] == 0.0
    assert data["requires_verification"] is True
    assert data["normalized_ingredient"] is None


@pytest.mark.asyncio
async def test_fuzzy_matching_and_low_confidence(client: AsyncClient):
    """Test 15 / Prompt Fuzzy matching: Slightly misspelled text resolved with candidate flag."""
    # Misspelled "whey protien"
    resp = await client.post("/api/ingredients/normalize", json={"text": "whey protien"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["matched"] is True
    assert data["canonical_name"] == "whey"

    # Completely nonsensical string
    resp_unresolved = await client.post("/api/ingredients/normalize", json={"text": "zzxxqwert12345"})
    assert resp_unresolved.status_code == 200
    d_unres = resp_unresolved.json()
    assert d_unres["matched"] is False
    assert d_unres["confidence"] < 0.70


@pytest.mark.asyncio
async def test_cycle_protection(db_session: AsyncSession):
    """Test 10 / Prompt Test 10: Relationship engine terminates safely when cycles exist."""
    # Create two temporary ingredients: Cyclical A and Cyclical B
    ing_a = Ingredient(
        canonical_name="cycle_a",
        display_name="Cycle A",
        ingredient_type="compound",
    )
    ing_b = Ingredient(
        canonical_name="cycle_b",
        display_name="Cycle B",
        ingredient_type="compound",
    )
    db_session.add_all([ing_a, ing_b])
    await db_session.flush()

    # Create cycle: A -> B and B -> A
    rel_ab = IngredientRelationship(
        source_ingredient_id=ing_a.id,
        relationship_type="derived_from",
        target_ingredient_id=ing_b.id,
        confidence=1.0,
    )
    rel_ba = IngredientRelationship(
        source_ingredient_id=ing_b.id,
        relationship_type="derived_from",
        target_ingredient_id=ing_a.id,
        confidence=1.0,
    )
    db_session.add_all([rel_ab, rel_ba])
    await db_session.commit()

    # Trace from A: must terminate with cycle_detected = True and no infinite loop
    trace = await trace_ingredient(db_session, ing_a.id, max_depth=5)
    assert trace.cycle_detected is True
    assert len(trace.chains) > 0


@pytest.mark.asyncio
async def test_search_ingredients_api(client: AsyncClient):
    """Test search endpoint matching canonical names and aliases."""
    resp = await client.get("/api/ingredients/search?q=whey")
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) > 0
    assert any("whey" in item["canonical_name"] for item in results)

    # Search for INS code
    resp_ins = await client.get("/api/ingredients/search?q=471")
    assert resp_ins.status_code == 200
    results_ins = resp_ins.json()
    assert len(results_ins) > 0


@pytest.mark.asyncio
async def test_get_ingredient_details_and_subresources(client: AsyncClient, db_session: AsyncSession):
    """Test individual GET endpoints for detail, relationships, trace, sources, allergens, dietary-properties."""
    # Find Whey
    stmt = select(Ingredient).where(Ingredient.canonical_name == "whey")
    whey = (await db_session.execute(stmt)).scalars().first()
    assert whey is not None
    whey_id = str(whey.id)

    # 1. Detail
    d_resp = await client.get(f"/api/ingredients/{whey_id}")
    assert d_resp.status_code == 200
    assert d_resp.json()["canonical_name"] == "whey"

    # 2. Relationships
    r_resp = await client.get(f"/api/ingredients/{whey_id}/relationships")
    assert r_resp.status_code == 200
    assert isinstance(r_resp.json(), list)

    # 3. Trace
    t_resp = await client.get(f"/api/ingredients/{whey_id}/trace")
    assert t_resp.status_code == 200
    assert "chains" in t_resp.json()

    # 4. Sources
    s_resp = await client.get(f"/api/ingredients/{whey_id}/sources")
    assert s_resp.status_code == 200
    assert "status" in s_resp.json()

    # 5. Allergens
    a_resp = await client.get(f"/api/ingredients/{whey_id}/allergens")
    assert a_resp.status_code == 200
    assert any(a["name"] == "Milk" for a in a_resp.json())

    # 6. Dietary Properties
    dp_resp = await client.get(f"/api/ingredients/{whey_id}/dietary-properties")
    assert dp_resp.status_code == 200
    assert "summary" in dp_resp.json()
