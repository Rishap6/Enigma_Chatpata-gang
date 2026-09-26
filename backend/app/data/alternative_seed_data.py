import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.product import Product
from app.models.product_alternative import ProductAlternative


async def seed_product_alternatives(db: AsyncSession):
    print("Seeding Product Safe Alternatives & Substitutions Database...")

    # Load all products by gtin / name
    prods = (await db.execute(select(Product))).scalars().all()
    prod_map = {p.gtin: p for p in prods if p.gtin}
    name_map = {p.name.lower(): p for p in prods}

    # Curated alternatives definitions
    curated_items = [
        # Snickers (Contains Peanuts, Milk/Lactose, Soy)
        {
            "gtin": "8906002482481",
            "name_match": "snickers",
            "alternatives": [
                {
                    "alternative_name": "The Whole Truth 71% Dark Chocolate Bar",
                    "alternative_brand": "The Whole Truth",
                    "alternative_category": "Chocolate & Confectionery",
                    "reason": "100% Lactose-Free & Dairy-Free, Zero Milk Solids, Clean Ingredients (Only Cocoa & Dates)",
                    "target_allergen": "Milk / Lactose",
                    "dietary_tags": "Lactose-Free,Dairy-Free,Vegan,Refined-Sugar-Free",
                    "health_benefit": "Zero dairy or milk powder. Naturally sweetened with dates, 100% safe for lactose intolerance.",
                },
                {
                    "alternative_name": "Yoga Bar Dark Chocolate Oat & Fruit Bar",
                    "alternative_brand": "Yoga Bar",
                    "alternative_category": "Energy & Nutrition Bar",
                    "reason": "Peanut-Free & Lactose-Free safe energy snack for children and adults",
                    "target_allergen": "Peanut",
                    "dietary_tags": "Peanut-Free,Dairy-Free,High-Fiber",
                    "health_benefit": "Contains whole grain oats and berries with zero peanuts or dairy allergens.",
                },
                {
                    "alternative_name": "5 Star Chocolate Caramel Bar",
                    "alternative_brand": "Cadbury",
                    "alternative_category": "Chocolate & Confectionery",
                    "reason": "Peanut-Free chocolate caramel bar alternative",
                    "target_allergen": "Peanut",
                    "dietary_tags": "Peanut-Free,Vegetarian",
                    "health_benefit": "Satisfies the chocolate-caramel craving without tree nut or peanut allergen risks.",
                },
            ],
        },
        # Kurkure Masala Munch (Extruded corn snack, Spices)
        {
            "gtin": "8901491100519",
            "name_match": "kurkure",
            "alternatives": [
                {
                    "alternative_name": "Farmley Peri Peri Roasted Foxnuts (Makhana)",
                    "alternative_brand": "Farmley",
                    "alternative_category": "Healthy Savoury Snacks",
                    "reason": "Naturally Gluten-Free, Non-Fried, Zero Trans Fat, Low Glycemic Index",
                    "target_allergen": "Gluten / Wheat",
                    "dietary_tags": "Gluten-Free,Roasted,Low-Sodium,Vegan",
                    "health_benefit": "Roasted in olive oil, zero palm oil, high in antioxidants and dietary minerals.",
                },
                {
                    "alternative_name": "Too Yumm! Multigrain Karare Masala",
                    "alternative_brand": "Too Yumm!",
                    "alternative_category": "Namkeen & Savoury Snacks",
                    "reason": "Baked (Not Fried), 40% Less Fat than regular extruded snacks",
                    "target_allergen": "High-Fat / Palm-Oil",
                    "dietary_tags": "Baked-Not-Fried,Low-Fat,Vegetarian",
                    "health_benefit": "Zero trans fats, prepared by baking instead of deep frying in palmolein.",
                },
            ],
        },
        # Lay's Hot 'n' Sweet / Lay's Classic (Contains Lactose, Nut traces)
        {
            "gtin": "8901491100267",
            "name_match": "lay's",
            "alternatives": [
                {
                    "alternative_name": "TagZ Popped Salted Potato Chips",
                    "alternative_brand": "TagZ",
                    "alternative_category": "Potato Chips & Wafers",
                    "reason": "Popped (Never Fried), 50% Less Fat, 100% Lactose-Free & Vegan",
                    "target_allergen": "Milk / Lactose",
                    "dietary_tags": "Lactose-Free,Dairy-Free,Popped,Vegan",
                    "health_benefit": "Zero milk solids, zero palmolein oil, made with high-temperature popping technology.",
                },
                {
                    "alternative_name": "BRB Popped Potato Chips Sweet Chipotle",
                    "alternative_brand": "BRB",
                    "alternative_category": "Potato Chips & Wafers",
                    "reason": "Dairy-Free, Nut-Free, Certified Vegan savory snack",
                    "target_allergen": "Nut / Milk",
                    "dietary_tags": "Nut-Free,Dairy-Free,Vegan",
                    "health_benefit": "Popped potato snack free from tree nut allergens and dairy additives.",
                },
            ],
        },
        # Parle Platina Hide & Seek / Oreo (Contains Maida/Gluten, Milk solids)
        {
            "gtin": "8901719116520",
            "name_match": "hide & seek",
            "alternatives": [
                {
                    "alternative_name": "Nairn's Gluten-Free Choco Chip Biscuit",
                    "alternative_brand": "Nairn's",
                    "alternative_category": "Biscuits & Cookies",
                    "reason": "100% Certified Gluten-Free Whole Grain Oats, Dairy-Free & Vegan",
                    "target_allergen": "Wheat / Gluten",
                    "dietary_tags": "Gluten-Free,Dairy-Free,Vegan,High-Fiber",
                    "health_benefit": "Dedicated gluten-free certified facility. Zero maida/refined wheat flour.",
                },
                {
                    "alternative_name": "Open Secret Nutty Choco Chip Cookie",
                    "alternative_brand": "Open Secret",
                    "alternative_category": "Biscuits & Cookies",
                    "reason": "Zero Refined Flour (Maida), 40% Roasted Nuts & Jaggery",
                    "target_allergen": "Refined-Flour",
                    "dietary_tags": "No-Maida,No-Palm-Oil,High-Protein",
                    "health_benefit": "Sweetened with jaggery, made with almond/peanut flour with zero maida.",
                },
            ],
        },
        # Cadbury Dairy Milk / Dairy Products (Milk / Lactose Intolerance)
        {
            "gtin": "8901233024890",
            "name_match": "cadbury",
            "alternatives": [
                {
                    "alternative_name": "Amul Lactose-Free Milk (T-Special)",
                    "alternative_brand": "Amul",
                    "alternative_category": "Dairy & Milk",
                    "reason": "Enzymatically Pre-Digested Lactose (<0.01%), Safe for Lactose Intolerance",
                    "target_allergen": "Milk / Lactose",
                    "dietary_tags": "Lactose-Free,High-Calcium,Gentle-Digestion",
                    "health_benefit": "Treated with lactase enzyme so lactose is broken down into simple sugars for zero bloating.",
                },
                {
                    "alternative_name": "Raw Pressery Cold-Pressed Almond Milk (Unsweetened)",
                    "alternative_brand": "Raw Pressery",
                    "alternative_category": "Plant-Based Beverages",
                    "reason": "100% Plant-Based, Dairy-Free, Zero Lactose, Keto & Vegan",
                    "target_allergen": "Milk / Lactose",
                    "dietary_tags": "Lactose-Free,Dairy-Free,Vegan,Gluten-Free",
                    "health_benefit": "Rich in natural Vitamin E and calcium with zero cow milk dairy allergens.",
                },
            ],
        },
    ]

    for item in curated_items:
        # Find matching product in DB
        prod = None
        if item.get("gtin") and item["gtin"] in prod_map:
            prod = prod_map[item["gtin"]]
        elif item.get("name_match"):
            for name, p in name_map.items():
                if item["name_match"] in name:
                    prod = p
                    break

        if not prod:
            continue

        for alt_def in item["alternatives"]:
            # Check if alternative already exists
            existing = (
                await db.execute(
                    select(ProductAlternative).where(
                        ProductAlternative.product_id == prod.id,
                        ProductAlternative.alternative_name == alt_def["alternative_name"],
                    )
                )
            ).scalars().first()

            if not existing:
                db.add(
                    ProductAlternative(
                        product_id=prod.id,
                        alternative_name=alt_def["alternative_name"],
                        alternative_brand=alt_def.get("alternative_brand"),
                        alternative_category=alt_def.get("alternative_category"),
                        reason=alt_def["reason"],
                        target_allergen=alt_def.get("target_allergen"),
                        dietary_tags=alt_def.get("dietary_tags"),
                        health_benefit=alt_def.get("health_benefit"),
                        confidence=1.0,
                        is_active=True,
                    )
                )

    await db.commit()
    print("Product Safe Alternatives seeded successfully!")


if __name__ == "__main__":
    async def main():
        async with AsyncSessionLocal() as session:
            await seed_product_alternatives(session)

    asyncio.run(main())
