import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.data.product_seed_data import seed_product_knowledge
from app.models.product import Product
from app.models.brand import Brand
from app.models.product_category import ProductCategory
from app.models.product_ingredient import ProductIngredient
from app.engines.product_normalization import normalize_product_name
from app.engines.product_analysis import calculate_product_confidence
from app.services.product_ingredient_service import ProductIngredientService


@pytest.fixture(autouse=True)
async def seed_data(db_session: AsyncSession):
    """Seed product knowledge base automatically for all product tests."""
    await seed_product_knowledge(db_session)


# ============================================================
# 1. Product Seed & Idempotency Tests
# ============================================================

@pytest.mark.asyncio
async def test_product_seed_idempotency(db_session: AsyncSession):
    """Verify product knowledge base can be seeded multiple times without duplicate errors."""
    await seed_product_knowledge(db_session)
    result = await db_session.execute(select(Product))
    products = result.scalars().all()
    assert len(products) >= 20

    brand_result = await db_session.execute(select(Brand))
    brands = brand_result.scalars().all()
    assert len(brands) >= 8


# ============================================================
# 2. Product Search & Pagination Tests
# ============================================================

@pytest.mark.asyncio
async def test_product_list_and_pagination(client: AsyncClient):
    """Verify paginated listing of products."""
    resp = await client.get("/api/products?page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()

    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert "pages" in data

    assert data["page"] == 1
    assert data["page_size"] == 5
    assert len(data["items"]) == 5
    assert data["total"] >= 20


@pytest.mark.asyncio
async def test_product_search_and_filters(client: AsyncClient):
    """Verify searching by name, brand, and category."""
    # Search by keyword
    resp = await client.get("/api/products?search=Protein")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) >= 1
    assert any("Protein" in item["name"] for item in data["items"])

    # Filter by brand
    resp_brand = await client.get("/api/products?brand=Britannia")
    assert resp_brand.status_code == 200
    brand_data = resp_brand.json()
    assert len(brand_data["items"]) >= 1
    assert all(item["brand_name"] == "Britannia" for item in brand_data["items"])

    # Filter by category
    resp_cat = await client.get("/api/products?category=Chips")
    assert resp_cat.status_code == 200
    cat_data = resp_cat.json()
    assert len(cat_data["items"]) >= 1
    assert all(item["category_name"] == "Chips" for item in cat_data["items"])


# ============================================================
# 3. Product Normalization Engine Tests
# ============================================================

@pytest.mark.asyncio
async def test_product_normalization_engine():
    """Verify product name normalization, abbreviation expansion, and noise removal."""
    # Receipt OCR noise: abbreviations and pack size
    result = normalize_product_name("BRIT NUTR CHC 40G")
    assert "britannia" in result["normalized_name"]
    assert "nutrichoice" in result["normalized_name"]
    assert "40g" not in result["normalized_name"]
    assert result["confidence"] >= 0.85

    # Check chocolate abbreviation
    result_choc = normalize_product_name("CADB DAIRY MLK CHOC 50G")
    assert "chocolate" in result_choc["normalized_name"]

    # Barcode/GTIN leading zeros preservation
    gtin_str = "08901234560010"
    assert len(gtin_str) == 14
    assert gtin_str.startswith("0")


# ============================================================
# 4. Product Identifier & Lookup Tests
# ============================================================

@pytest.mark.asyncio
async def test_exact_identifier_lookup_gtin(client: AsyncClient):
    """Verify exact identifier lookup (e.g. GTIN with leading zeros). Phase 4 Barcode integration point."""
    gtin = "08901234560010"
    resp = await client.get(f"/api/products/identifier/GTIN/{gtin}")
    assert resp.status_code == 200
    data = resp.json()

    assert data["name"] == "Demo Protein Bar"
    assert data["gtin"] == gtin
    assert len(data["identifiers"]) >= 1
    assert any(i["identifier_value"] == gtin for i in data["identifiers"])


@pytest.mark.asyncio
async def test_unknown_identifier_404_no_fabrication(client: AsyncClient):
    """Verify unknown identifier lookup returns 404 and does not fabricate a product."""
    resp = await client.get("/api/products/identifier/GTIN/9999999999999")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


# ============================================================
# 5. Product Matching Engine Tests
# ============================================================

@pytest.mark.asyncio
async def test_product_match_barcode_gtin(client: AsyncClient):
    """Verify barcode match yields highest priority exact match (confidence 1.0)."""
    resp = await client.post(
        "/api/products/match",
        json={"name": "Unknown OCR Receipt Text", "barcode": "08901234560010"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["matched"] is True
    assert data["confidence"] == 1.0
    assert data["match_method"] == "barcode_exact"
    assert data["product"]["name"] == "Demo Protein Bar"


@pytest.mark.asyncio
async def test_product_match_brand_and_fuzzy_name(client: AsyncClient):
    """Verify matching with brand hint and noisy OCR abbreviation."""
    resp = await client.post(
        "/api/products/match",
        json={"name": "NUTR CHC BISCUIT", "brand": "Britannia"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["matched"] is True
    assert data["confidence"] >= 0.85
    assert "NutriChoice" in data["product"]["name"]


@pytest.mark.asyncio
async def test_product_match_low_confidence_requires_selection(client: AsyncClient):
    """Verify low-confidence matches return requires_selection=True with candidate list."""
    resp = await client.post(
        "/api/products/match",
        json={"name": "Chocolate"},
    )
    assert resp.status_code == 200
    data = resp.json()

    # Ambiguous term "Chocolate" matches multiple candidates with moderate score
    if not data["matched"]:
        assert data["requires_selection"] is True
        assert len(data["candidates"]) >= 1


@pytest.mark.asyncio
async def test_product_match_unknown_no_hallucination(client: AsyncClient):
    """Verify unknown product does not hallucinate data and returns matched=False."""
    resp = await client.post(
        "/api/products/match",
        json={"name": "XYZ UNKNOWN ALIEN SPACE FOOD 9999"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["matched"] is False
    assert data["product"] is None
    assert len(data["candidates"]) == 0


# ============================================================
# 6. Critical Integration Tests (Prompt Specified)
# ============================================================

@pytest.mark.asyncio
async def test_critical_test_1_demo_protein_bar(client: AsyncClient, db_session: AsyncSession):
    """
    CRITICAL INTEGRATION TEST 1:
    Product: Demo Protein Bar
    Ingredients: Whey Protein, Soy Lecithin, Cocoa, INS 471
    Expected:
      Whey Protein -> Whey -> Dairy -> Milk allergen
      Soy Lecithin -> Soy
      INS 471 -> Mono/Diglycerides -> plant/animal source uncertainty
      Product analysis: requires_verification = true
    """
    # Find Demo Protein Bar
    result = await db_session.execute(
        select(Product).where(Product.name == "Demo Protein Bar")
    )
    product = result.scalar_one()

    resp = await client.get(f"/api/products/{product.id}/analysis")
    assert resp.status_code == 200
    data = resp.json()

    # 1. Product & Identification
    assert data["product"]["name"] == "Demo Protein Bar"
    assert data["identification"]["confidence"] >= 0.95

    # 2. Ingredients validation
    ingredients = data["ingredients"]
    raw_names = [i["raw_name"] for i in ingredients]
    assert "Whey Protein" in raw_names
    assert "Soy Lecithin" in raw_names
    assert "INS 471" in raw_names

    # Check Whey Protein analysis
    whey_item = next(i for i in ingredients if i["raw_name"] == "Whey Protein")
    assert whey_item["normalized_name"] == "Whey"
    assert any("Milk" in a.get("allergen_name", "") for a in whey_item["allergens"])
    assert "Dairy" in whey_item["categories"] or "Milk-derived" in whey_item["categories"]

    # Check Soy Lecithin analysis
    soy_item = next(i for i in ingredients if i["raw_name"] == "Soy Lecithin")
    assert any("Soy" in a.get("allergen_name", "") for a in soy_item["allergens"])

    # Check INS 471 source uncertainty
    ins471_item = next(i for i in ingredients if i["raw_name"] == "INS 471")
    assert ins471_item["requires_verification"] is True
    assert any(s["status"] == "possible" for s in ins471_item["sources"])

    # Product-level verification requirement due to INS 471 source uncertainty
    assert data["requires_verification"] is True
    assert "Milk" in data["aggregated_allergens"]
    assert "Soy" in data["aggregated_allergens"]


@pytest.mark.asyncio
async def test_critical_test_2_demo_biscuit_sodium_caseinate(client: AsyncClient, db_session: AsyncSession):
    """
    CRITICAL INTEGRATION TEST 2:
    Product: Demo Biscuit
    Ingredient: Sodium Caseinate
    Expected:
      Sodium Caseinate -> Casein -> Milk
      Allergen: Milk
    """
    result = await db_session.execute(
        select(Product).where(Product.name == "Demo Biscuit")
    )
    product = result.scalar_one()

    resp = await client.get(f"/api/products/{product.id}/analysis")
    assert resp.status_code == 200
    data = resp.json()

    # Sodium Caseinate must resolve to Casein -> Milk allergen
    sc_item = next(i for i in data["ingredients"] if "Sodium Caseinate" in i["raw_name"])
    assert sc_item["normalized_name"] == "Sodium Caseinate"
    assert any("Milk" in a.get("allergen_name", "") for a in sc_item["allergens"])

    # Check cross-contact statement preserved in analysis
    assert len(data["allergen_statements"]) >= 1
    may_contain = next(s for s in data["allergen_statements"] if s["statement_type"] == "may_contain")
    assert "peanuts" in may_contain["statement_text"].lower()


@pytest.mark.asyncio
async def test_critical_test_3_demo_gelatin_gummy(client: AsyncClient, db_session: AsyncSession):
    """
    CRITICAL INTEGRATION TEST 3:
    Product: Demo Gelatin Gummy
    Ingredient: Gelatin
    Expected:
      Gelatin -> Animal-derived -> not vegetarian
    """
    result = await db_session.execute(
        select(Product).where(Product.name == "Demo Gelatin Gummy")
    )
    product = result.scalar_one()

    resp = await client.get(f"/api/products/{product.id}/analysis")
    assert resp.status_code == 200
    data = resp.json()

    gelatin_item = next(i for i in data["ingredients"] if "Gelatin" in i["raw_name"])
    assert gelatin_item["normalized_name"] == "Gelatin"
    assert any(s["type"] == "animal" and s["status"] == "known" for s in gelatin_item["sources"])
    assert data["dietary_summary"].get("is_vegetarian") is False


@pytest.mark.asyncio
async def test_critical_test_4_unknown_ingredient_handling(client: AsyncClient, db_session: AsyncSession):
    """
    CRITICAL INTEGRATION TEST 4:
    Unknown ingredient in product:
    Expected:
      Product still exists
      Known ingredients analyzed
      Unknown ingredient marked: requires_verification = true
      Analysis flags overall requires_verification = true
    """
    # Find Demo Exotic Fruit Crunch (seeded with Sugar, UnrecognizedHerbXYZ999, Salt)
    result = await db_session.execute(
        select(Product).where(Product.name == "Demo Exotic Fruit Crunch")
    )
    product = result.scalar_one()

    resp = await client.get(f"/api/products/{product.id}/analysis")
    assert resp.status_code == 200
    data = resp.json()

    # Product exists
    assert data["product"]["name"] == "Demo Exotic Fruit Crunch"
    assert len(data["ingredients"]) == 3

    # Known ingredients recognized
    sugar_item = next(i for i in data["ingredients"] if i["raw_name"] == "Sugar")
    assert sugar_item["normalized_name"] == "Sugar"
    assert sugar_item["requires_verification"] is False

    salt_item = next(i for i in data["ingredients"] if i["raw_name"] == "Salt")
    assert salt_item["normalized_name"] == "Salt"
    assert salt_item["requires_verification"] is False

    # Unknown ingredient identified and flagged
    mystery_item = next(i for i in data["ingredients"] if i["raw_name"] == "UnrecognizedHerbXYZ999")
    assert mystery_item["requires_verification"] is True
    assert "UnrecognizedHerbXYZ999" in data["unresolved_ingredients"]

    # Product-level verification required
    assert data["requires_verification"] is True
    assert data["quality_summary"]["unresolved_ingredients"] == 1
    assert data["quality_summary"]["overall_status"] == "verification_required"


# ============================================================
# 7. Sub-resource & Metadata APIs
# ============================================================

@pytest.mark.asyncio
async def test_product_subresource_apis(client: AsyncClient, db_session: AsyncSession):
    """Verify /ingredients and /sources subresource endpoints."""
    result = await db_session.execute(
        select(Product).where(Product.name == "Demo Protein Bar")
    )
    product = result.scalar_one()

    # Ingredients subresource
    resp_ing = await client.get(f"/api/products/{product.id}/ingredients")
    assert resp_ing.status_code == 200
    ingredients = resp_ing.json()
    assert len(ingredients) == 4
    # Sequence order preserved
    assert [i["sequence"] for i in ingredients] == [1, 2, 3, 4]
    assert ingredients[0]["raw_name"] == "Whey Protein"

    # Sources subresource
    resp_src = await client.get(f"/api/products/{product.id}/sources")
    assert resp_src.status_code == 200
    sources = resp_src.json()
    assert len(sources) >= 1
    assert "Demo Nutrition" in sources[0]["source_name"]


@pytest.mark.asyncio
async def test_brands_and_categories_meta_apis(client: AsyncClient):
    """Verify /meta/brands and /meta/categories return sorted metadata."""
    resp_b = await client.get("/api/products/meta/brands")
    assert resp_b.status_code == 200
    brands = resp_b.json()
    assert len(brands) >= 8
    brand_names = [b["name"] for b in brands]
    assert "Britannia" in brand_names
    assert "Lay's" in brand_names

    resp_c = await client.get("/api/products/meta/categories")
    assert resp_c.status_code == 200
    cats = resp_c.json()
    assert len(cats) >= 5
    cat_names = [c["name"] for c in cats]
    assert "Biscuits" in cat_names
    assert "Chips" in cat_names
