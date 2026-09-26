import uuid
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand import Brand
from app.models.product_category import ProductCategory
from app.models.product import Product
from app.models.product_identifier import ProductIdentifier
from app.models.product_allergen_statement import ProductAllergenStatement
from app.models.product_data_source import ProductDataSource
from app.engines.product_normalization import normalize_product_name
from app.services.product_ingredient_service import ProductIngredientService
from app.data.seed_data import seed_ingredient_knowledge


async def seed_product_knowledge(db: AsyncSession):
    """Seeds the Product Intelligence Knowledge Base idempotently:
    1. Ensures Phase 2 ingredient knowledge is seeded first
    2. Brands (Britannia, Lay's, Amul, Nestlé, Cadbury, Kissan, etc.)
    3. Product Categories (hierarchical)
    4. Products (25+ demo & grocery products covering dairy, derived dairy, peanut, wheat, soy, egg, gelatin, additives, cross-contact, and uncertainty)
    5. Product Identifiers (GTIN, EAN13, EAN8, UPC)
    6. Product Ingredients (ordered, linked to Phase 2)
    7. Allergen Statements & Data Sources
    """
    print("Ensuring Phase 2 Ingredient Intelligence is seeded...")
    await seed_ingredient_knowledge(db)

    print("Seeding Brands...")
    brand_definitions = [
        ("Britannia", "britannia", "Leading Indian food company producing bakery & dairy goods.", "https://britannia.co.in"),
        ("Lay's", "lays", "Global potato chip brand by PepsiCo.", "https://lays.com"),
        ("Amul", "amul", "The Taste of India - dairy cooperative society.", "https://amul.com"),
        ("Nestlé", "nestle", "Multinational food and drink processing conglomerate.", "https://nestle.com"),
        ("Cadbury", "cadbury", "British multinational confectionery company owned by Mondelez.", "https://mondelezinternational.com"),
        ("Kissan", "kissan", "Popular fruit and vegetable spreads, sauces, and condiments.", "https://kissan.in"),
        ("Aashirvaad", "aashirvaad", "Staples and packaged foods brand by ITC.", "https://itcportal.com"),
        ("Kellogg's", "kelloggs", "Breakfast cereal and convenience foods manufacturer.", "https://kelloggs.com"),
        ("Demo Nutrition", "demo nutrition", "Developer test brand for food intelligence testing.", "https://example.com"),
    ]

    brand_map: Dict[str, Brand] = {}
    for name, norm_name, desc, web in brand_definitions:
        stmt = select(Brand).where(Brand.normalized_name == norm_name)
        b = (await db.execute(stmt)).scalars().first()
        if not b:
            b = Brand(name=name, normalized_name=norm_name, description=desc, website=web)
            db.add(b)
            await db.flush()
        brand_map[norm_name] = b

    print("Seeding Product Categories...")
    category_defs = [
        ("Food", None, "General food products"),
        ("Snacks", "Food", "Savory and packaged snack foods"),
        ("Chips", "Snacks", "Potato and grain crispy chips"),
        ("Biscuits", "Snacks", "Baked sweet and savory biscuits"),
        ("Cookies", "Snacks", "Baked confectionery cookies"),
        ("Dairy", "Food", "Milk, butter, and fermented dairy products"),
        ("Milk", "Dairy", "Fresh and packaged fluid milk products"),
        ("Bakery", "Food", "Bread, buns, and morning goods"),
        ("Bread", "Bakery", "Sliced sandwich and table bread"),
        ("Breakfast", "Food", "Morning cereals and grain bowls"),
        ("Cereal", "Breakfast", "Corn flakes, muesli, and oats"),
        ("Condiments", "Food", "Sauces, ketchup, and dressings"),
        ("Sauces", "Condiments", "Table sauces and culinary gravies"),
        ("Confectionery", "Food", "Chocolates, sweets, and bars"),
        ("Chocolate", "Confectionery", "Milk and dark chocolate confections"),
        ("Health & Fitness", "Food", "Performance and dietary nutrition"),
        ("Protein Bars", "Health & Fitness", "High protein nutrition bars"),
    ]

    category_map: Dict[str, ProductCategory] = {}
    for cat_name, parent_name, desc in category_defs:
        stmt = select(ProductCategory).where(ProductCategory.name == cat_name)
        c = (await db.execute(stmt)).scalars().first()
        parent_id = category_map[parent_name].id if parent_name and parent_name in category_map else None
        if not c:
            c = ProductCategory(name=cat_name, parent_category_id=parent_id, description=desc)
            db.add(c)
            await db.flush()
        category_map[cat_name] = c

    # Product Seed Catalogue
    products_seed = [
        # 1. Demo Protein Bar (CRITICAL TEST 1: Whey Protein, Soy Lecithin, Cocoa, INS 471 uncertainty)
        {
            "brand": "demo nutrition",
            "name": "Demo Protein Bar",
            "category": "Protein Bars",
            "barcode": "8901234560010",
            "gtin": "08901234560010",
            "identifiers": [("GTIN", "08901234560010"), ("EAN13", "8901234560010")],
            "pack_size": "60",
            "unit": "g",
            "serving_size": "60g",
            "country": "India",
            "ingredients": ["Whey Protein", "Soy Lecithin", "Cocoa", "INS 471"],
            "allergen_statements": [("contains", "Contains milk and soy."), ("may_contain", "May contain traces of peanuts.")],
            "cross_contact": "Manufactured on shared equipment handling peanuts and tree nuts.",
            "source_type": "curated_dataset",
            "confidence": 0.98,
        },
        # 2. Demo Digestive Biscuit (CRITICAL TEST 2: Sodium Caseinate, Wheat Flour)
        {
            "brand": "demo nutrition",
            "name": "Demo Biscuit",
            "category": "Biscuits",
            "barcode": "8901234560027",
            "gtin": "08901234560027",
            "identifiers": [("GTIN", "08901234560027"), ("EAN13", "8901234560027")],
            "pack_size": "100",
            "unit": "g",
            "serving_size": "30g",
            "country": "India",
            "ingredients": ["Wheat Flour", "Sugar", "Sodium Caseinate", "Palm Oil", "Salt"],
            "allergen_statements": [("contains", "Contains wheat and milk."), ("may_contain", "May contain peanuts.")],
            "cross_contact": "May contain peanuts and sesame.",
            "source_type": "curated_dataset",
            "confidence": 0.96,
        },
        # 3. Demo Gelatin Gummy (CRITICAL TEST 4: Gelatin animal-derived)
        {
            "brand": "demo nutrition",
            "name": "Demo Gelatin Gummy",
            "category": "Confectionery",
            "barcode": "8901234560034",
            "gtin": "08901234560034",
            "identifiers": [("GTIN", "08901234560034")],
            "pack_size": "80",
            "unit": "g",
            "serving_size": "20g",
            "country": "India",
            "ingredients": ["Sugar", "Glucose", "Gelatin"],
            "allergen_statements": [("contains", "Contains porcine/bovine gelatin.")],
            "cross_contact": None,
            "source_type": "curated_dataset",
            "confidence": 0.98,
        },
        # 4. Demo Maida Bread (CRITICAL TEST: Maida -> Wheat / Gluten)
        {
            "brand": "britannia",
            "name": "Britannia Daily Fresh White Bread",
            "category": "Bread",
            "barcode": "8901063142013",
            "gtin": "08901063142013",
            "identifiers": [("GTIN", "08901063142013"), ("EAN13", "8901063142013")],
            "pack_size": "400",
            "unit": "g",
            "serving_size": "50g",
            "country": "India",
            "ingredients": ["Maida", "Sugar", "Yeast", "Salt", "Palm Oil"],
            "allergen_statements": [("contains", "Contains Wheat (Gluten).")],
            "cross_contact": "Made in a facility processing milk and soy.",
            "source_type": "manufacturer",
            "confidence": 0.99,
        },
        # 5. Britannia NutriChoice Digestive Biscuit (For Matching Test "BRIT NUTR CHC 40G")
        {
            "brand": "britannia",
            "name": "Britannia NutriChoice Digestive Biscuit",
            "category": "Biscuits",
            "barcode": "8901063012347",
            "gtin": "08901063012347",
            "identifiers": [("GTIN", "08901063012347"), ("EAN13", "8901063012347")],
            "pack_size": "100",
            "unit": "g",
            "serving_size": "25g",
            "country": "India",
            "ingredients": ["Wheat Flour", "Sugar", "Palm Oil", "Wheat", "Milk Solids", "Salt"],
            "allergen_statements": [("contains", "Contains Wheat and Milk.")],
            "cross_contact": "May contain traces of nuts and soy.",
            "source_type": "manufacturer",
            "confidence": 0.97,
        },
        # 6. Lay's Classic Salted Potato Chips
        {
            "brand": "lays",
            "name": "Lay's Classic Salted Potato Chips",
            "category": "Chips",
            "barcode": "8901491101837",
            "gtin": "08901491101837",
            "identifiers": [("GTIN", "08901491101837"), ("EAN13", "8901491101837")],
            "pack_size": "50",
            "unit": "g",
            "serving_size": "30g",
            "country": "India",
            "ingredients": ["Potato", "Palm Oil", "Salt"],
            "allergen_statements": [],
            "cross_contact": "Processed on lines handling dairy and wheat.",
            "source_type": "manufacturer",
            "confidence": 0.99,
        },
        # 7. Lay's India's Magic Masala
        {
            "brand": "lays",
            "name": "Lay's India's Magic Masala Potato Chips",
            "category": "Chips",
            "barcode": "8901491101844",
            "gtin": "08901491101844",
            "identifiers": [("GTIN", "08901491101844")],
            "pack_size": "50",
            "unit": "g",
            "serving_size": "30g",
            "country": "India",
            "ingredients": ["Potato", "Palm Oil", "Salt", "Sugar", "Milk Solids"],
            "allergen_statements": [("contains", "Contains Milk.")],
            "cross_contact": None,
            "source_type": "manufacturer",
            "confidence": 0.95,
        },
        # 8. Amul Taaza Homogenised Toned Milk
        {
            "brand": "amul",
            "name": "Amul Taaza Homogenised Toned Milk",
            "category": "Milk",
            "barcode": "8901262010051",
            "gtin": "08901262010051",
            "identifiers": [("GTIN", "08901262010051"), ("EAN13", "8901262010051")],
            "pack_size": "1",
            "unit": "L",
            "serving_size": "200ml",
            "country": "India",
            "ingredients": ["Milk", "Milk Solids"],
            "allergen_statements": [("contains", "Contains Milk.")],
            "cross_contact": None,
            "source_type": "manufacturer",
            "confidence": 1.0,
        },
        # 9. Amul Salted Butter
        {
            "brand": "amul",
            "name": "Amul Pasteurised Salted Butter",
            "category": "Dairy",
            "barcode": "8901262010082",
            "gtin": "08901262010082",
            "identifiers": [("GTIN", "08901262010082")],
            "pack_size": "100",
            "unit": "g",
            "serving_size": "10g",
            "country": "India",
            "ingredients": ["Butter", "Salt"],
            "allergen_statements": [("contains", "Contains Milk (Butter).")],
            "cross_contact": None,
            "source_type": "manufacturer",
            "confidence": 1.0,
        },
        # 10. Cadbury Dairy Milk Chocolate
        {
            "brand": "cadbury",
            "name": "Cadbury Dairy Milk Chocolate Bar",
            "category": "Chocolate",
            "barcode": "7622210815124",
            "gtin": "07622210815124",
            "identifiers": [("GTIN", "07622210815124"), ("EAN13", "7622210815124")],
            "pack_size": "50",
            "unit": "g",
            "serving_size": "25g",
            "country": "India",
            "ingredients": ["Sugar", "Milk Solids", "Cocoa Butter", "Cocoa", "Soy Lecithin", "INS 471"],
            "allergen_statements": [("contains", "Contains Milk and Soy.")],
            "cross_contact": "May contain tree nuts, wheat.",
            "source_type": "manufacturer",
            "confidence": 0.98,
        },
        # 11. Nestlé Everyday Dairy Whitener
        {
            "brand": "nestle",
            "name": "Nestlé Everyday Dairy Whitener Powder",
            "category": "Dairy",
            "barcode": "8901058852378",
            "gtin": "08901058852378",
            "identifiers": [("GTIN", "08901058852378")],
            "pack_size": "400",
            "unit": "g",
            "serving_size": "10g",
            "country": "India",
            "ingredients": ["Milk Solids", "Sugar", "Soy Lecithin"],
            "allergen_statements": [("contains", "Contains Milk and Soy.")],
            "cross_contact": None,
            "source_type": "manufacturer",
            "confidence": 0.99,
        },
        # 12. Kissan Fresh Tomato Ketchup
        {
            "brand": "kissan",
            "name": "Kissan Fresh Tomato Ketchup",
            "category": "Ketchup",
            "barcode": "8901030383180",
            "gtin": "08901030383180",
            "identifiers": [("GTIN", "08901030383180")],
            "pack_size": "500",
            "unit": "g",
            "serving_size": "15g",
            "country": "India",
            "ingredients": ["Tomato Paste", "Sugar", "Salt"],
            "allergen_statements": [],
            "cross_contact": None,
            "source_type": "manufacturer",
            "confidence": 0.98,
        },
        # 13. Aashirvaad Shudh Chakki Atta (Wheat flour)
        {
            "brand": "aashirvaad",
            "name": "Aashirvaad Superior MP Chakki Atta",
            "category": "Bakery",
            "barcode": "8901725132224",
            "gtin": "08901725132224",
            "identifiers": [("GTIN", "08901725132224")],
            "pack_size": "5",
            "unit": "kg",
            "serving_size": "100g",
            "country": "India",
            "ingredients": ["Wheat"],
            "allergen_statements": [("contains", "Contains Wheat (Gluten).")],
            "cross_contact": None,
            "source_type": "manufacturer",
            "confidence": 1.0,
        },
        # 14. Kellogg's Corn Flakes
        {
            "brand": "kelloggs",
            "name": "Kellogg's Real Almond & Honey Corn Flakes",
            "category": "Cereal",
            "barcode": "8901499008237",
            "gtin": "08901499008237",
            "identifiers": [("GTIN", "08901499008237")],
            "pack_size": "300",
            "unit": "g",
            "serving_size": "30g",
            "country": "India",
            "ingredients": ["Corn", "Sugar", "Salt"],
            "allergen_statements": [("may_contain", "May contain gluten and tree nuts.")],
            "cross_contact": "Processed in a plant handling wheat, tree nuts and soy.",
            "source_type": "manufacturer",
            "confidence": 0.95,
        },
        # 15. Demo Peanut Crunch (CRITICAL TEST: Peanut Allergen)
        {
            "brand": "demo nutrition",
            "name": "Demo Crunchy Peanut Bites",
            "category": "Snacks",
            "barcode": "8901234560041",
            "gtin": "08901234560041",
            "identifiers": [("GTIN", "08901234560041")],
            "pack_size": "50",
            "unit": "g",
            "serving_size": "25g",
            "country": "India",
            "ingredients": ["Groundnut", "Sugar", "Salt"],
            "allergen_statements": [("contains", "Contains Peanuts.")],
            "cross_contact": None,
            "source_type": "curated_dataset",
            "confidence": 0.98,
        },
        # 16. Demo Semolina Pasta (Semolina / Suji -> Wheat)
        {
            "brand": "demo nutrition",
            "name": "Demo Durum Wheat Semolina Pasta",
            "category": "Snacks",
            "barcode": "8901234560058",
            "gtin": "08901234560058",
            "identifiers": [("GTIN", "08901234560058")],
            "pack_size": "500",
            "unit": "g",
            "serving_size": "80g",
            "country": "India",
            "ingredients": ["Semolina"],
            "allergen_statements": [("contains", "Contains Wheat (Gluten).")],
            "cross_contact": "May contain egg.",
            "source_type": "curated_dataset",
            "confidence": 0.99,
        },
        # 17. Demo Egg Mayonnaise Spread
        {
            "brand": "demo nutrition",
            "name": "Demo Creamy Egg Mayonnaise",
            "category": "Sauces",
            "barcode": "8901234560065",
            "gtin": "08901234560065",
            "identifiers": [("GTIN", "08901234560065")],
            "pack_size": "250",
            "unit": "g",
            "serving_size": "15g",
            "country": "India",
            "ingredients": ["Palm Oil", "Egg Yolk", "Sugar", "Salt"],
            "allergen_statements": [("contains", "Contains Egg.")],
            "cross_contact": "Manufactured on equipment processing mustard and milk.",
            "source_type": "curated_dataset",
            "confidence": 0.96,
        },
        # 18. Demo Unknown Ingredient Snack (CRITICAL TEST 6: Unknown ingredient in product)
        {
            "brand": "demo nutrition",
            "name": "Demo Exotic Fruit Crunch",
            "category": "Snacks",
            "barcode": "8901234560072",
            "gtin": "08901234560072",
            "identifiers": [("GTIN", "08901234560072")],
            "pack_size": "70",
            "unit": "g",
            "serving_size": "35g",
            "country": "India",
            "ingredients": ["Sugar", "UnrecognizedHerbXYZ999", "Salt"],
            "allergen_statements": [],
            "cross_contact": None,
            "source_type": "curated_dataset",
            "confidence": 0.90,
        },
        # 19. Britannia Bourbon Chocolate Biscuit
        {
            "brand": "britannia",
            "name": "Britannia Bourbon Chocolate Cream Biscuit",
            "category": "Cookies",
            "barcode": "8901063133332",
            "gtin": "08901063133332",
            "identifiers": [("GTIN", "08901063133332")],
            "pack_size": "120",
            "unit": "g",
            "serving_size": "30g",
            "country": "India",
            "ingredients": ["Wheat Flour", "Sugar", "Palm Oil", "Cocoa", "Milk Solids", "INS 322"],
            "allergen_statements": [("contains", "Contains Wheat, Milk, and Soy.")],
            "cross_contact": "May contain tree nuts.",
            "source_type": "manufacturer",
            "confidence": 0.97,
        },
        # 20. Britannia Good Day Butter Cookies
        {
            "brand": "britannia",
            "name": "Britannia Good Day Rich Butter Cookies",
            "category": "Cookies",
            "barcode": "8901063101119",
            "gtin": "08901063101119",
            "identifiers": [("GTIN", "08901063101119")],
            "pack_size": "100",
            "unit": "g",
            "serving_size": "25g",
            "country": "India",
            "ingredients": ["Wheat Flour", "Sugar", "Butter", "Palm Oil", "Milk Solids"],
            "allergen_statements": [("contains", "Contains Wheat and Milk.")],
            "cross_contact": "May contain nuts and soy.",
            "source_type": "manufacturer",
            "confidence": 0.98,
        },
    ]

    print(f"Seeding {len(products_seed)} Products and Ingredients...")
    for p_data in products_seed:
        norm_title = normalize_product_name(p_data["name"])["normalized_name"]
        stmt_p = select(Product).where(Product.normalized_name == norm_title)
        prod = (await db.execute(stmt_p)).scalars().first()

        brand_obj = brand_map.get(p_data["brand"])
        cat_obj = category_map.get(p_data["category"])

        if not prod:
            prod = Product(
                brand_id=brand_obj.id if brand_obj else None,
                name=p_data["name"],
                normalized_name=norm_title,
                category_id=cat_obj.id if cat_obj else None,
                barcode=p_data.get("barcode"),
                gtin=p_data.get("gtin"),
                pack_size=p_data.get("pack_size"),
                unit=p_data.get("unit"),
                serving_size=p_data.get("serving_size"),
                country=p_data.get("country"),
                ingredients_raw=", ".join(p_data["ingredients"]),
                cross_contact_statement_raw=p_data.get("cross_contact"),
                source_type=p_data.get("source_type", "curated_dataset"),
                source_name=f"{brand_obj.name if brand_obj else 'Curated'} Official Specification",
                confidence=p_data.get("confidence", 1.0),
                is_active=True,
            )
            db.add(prod)
            await db.flush()

        # Seed Identifiers
        for id_type, id_val in p_data.get("identifiers", []):
            stmt_id = select(ProductIdentifier).where(
                ProductIdentifier.identifier_type == id_type,
                ProductIdentifier.identifier_value == id_val,
            )
            existing_id = (await db.execute(stmt_id)).scalars().first()
            if not existing_id:
                db.add(
                    ProductIdentifier(
                        product_id=prod.id,
                        identifier_type=id_type,
                        identifier_value=id_val,
                        is_primary=(id_type == "GTIN"),
                    )
                )

        # Seed Allergen Statements
        for st_type, st_text in p_data.get("allergen_statements", []):
            stmt_st = select(ProductAllergenStatement).where(
                ProductAllergenStatement.product_id == prod.id,
                ProductAllergenStatement.statement_type == st_type,
                ProductAllergenStatement.statement_text == st_text,
            )
            existing_st = (await db.execute(stmt_st)).scalars().first()
            if not existing_st:
                db.add(
                    ProductAllergenStatement(
                        product_id=prod.id,
                        statement_type=st_type,
                        statement_text=st_text,
                        confidence=1.0,
                    )
                )

        # Seed Data Source
        stmt_ds = select(ProductDataSource).where(
            ProductDataSource.product_id == prod.id,
            ProductDataSource.source_name == (prod.source_name or "Curated Knowledge Base"),
        )
        existing_ds = (await db.execute(stmt_ds)).scalars().first()
        if not existing_ds:
            db.add(
                ProductDataSource(
                    product_id=prod.id,
                    source_name=prod.source_name or "Curated Knowledge Base",
                    source_type=prod.source_type or "curated_dataset",
                    reference="Product Intelligence Seed Dataset v1",
                    confidence=prod.confidence,
                )
            )

        # Ingest and link ingredients through Phase 2 normalization
        await ProductIngredientService.ingest_product_ingredients(
            db,
            product_id=prod.id,
            raw_ingredients=p_data["ingredients"],
        )

    await db.commit()
    print("Product Intelligence Knowledge Base seeded successfully!")
