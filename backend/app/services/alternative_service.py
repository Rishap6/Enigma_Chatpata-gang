import uuid
from typing import List, Optional, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.product_alternative import ProductAlternative
from app.models.product_ingredient import ProductIngredient
from app.models.ingredient import Ingredient
from app.models.ingredient_category import IngredientCategoryMap
from app.models.allergen_knowledge import IngredientAllergenMap
from app.models.dietary_property import IngredientDietaryMap
from app.schemas.alternative import AlternativeItem, ProductAlternativesResponse


class AlternativeService:
    async def get_alternatives_for_product(
        self,
        db: AsyncSession,
        product_id: uuid.UUID,
    ) -> ProductAlternativesResponse:
        """Finds safe alternatives for a product based on curated database mappings
        and dynamic allergy/dietary safety analysis (e.g. Lactose-Free, Peanut-Free, Gluten-Free).
        """
        stmt_prod = (
            select(Product)
            .options(
                selectinload(Product.brand),
                selectinload(Product.category),
                selectinload(Product.product_ingredients)
                .selectinload(ProductIngredient.ingredient)
                .selectinload(Ingredient.allergen_maps)
                .selectinload(IngredientAllergenMap.allergen),
                selectinload(Product.product_ingredients)
                .selectinload(ProductIngredient.ingredient)
                .selectinload(Ingredient.dietary_maps)
                .selectinload(IngredientDietaryMap.dietary_property),
            )
            .where(Product.id == product_id)
        )
        product = (await db.execute(stmt_prod)).scalars().first()
        if not product:
            return ProductAlternativesResponse(
                product_id=product_id,
                product_name="Unknown Product",
                flagged_allergens=[],
                dietary_conflicts=[],
                total_alternatives=0,
                alternatives=[],
            )

        # 1. Detect allergens & dietary traits in this product
        flagged_allergens: Set[str] = set()
        dietary_conflicts: Set[str] = set()

        for pi in product.product_ingredients:
            if pi.ingredient:
                for am in pi.ingredient.allergen_maps:
                    if am.allergen:
                        flagged_allergens.add(am.allergen.name)
                for dm in pi.ingredient.dietary_maps:
                    if dm.dietary_property and dm.status in ["incompatible", "uncertain"]:
                        dietary_conflicts.add(dm.dietary_property.name)

        # Detect common keywords from product name & raw ingredients
        raw_text = (product.ingredients_raw or "").lower()
        if "milk" in raw_text or "dairy" in raw_text or "lactose" in raw_text or "butter" in raw_text:
            flagged_allergens.add("Milk / Lactose")
        if "peanut" in raw_text or "groundnut" in raw_text:
            flagged_allergens.add("Peanut")
        if "wheat" in raw_text or "maida" in raw_text or "gluten" in raw_text:
            flagged_allergens.add("Wheat / Gluten")

        # 2. Fetch curated alternatives
        stmt_alt = select(ProductAlternative).where(
            ProductAlternative.product_id == product_id,
            ProductAlternative.is_active == True,
        )
        curated_db_items = (await db.execute(stmt_alt)).scalars().all()

        results: List[AlternativeItem] = []
        for alt in curated_db_items:
            tags = [t.strip() for t in (alt.dietary_tags or "").split(",") if t.strip()]
            results.append(
                AlternativeItem(
                    id=alt.id,
                    product_id=alt.product_id,
                    alternative_product_id=alt.alternative_product_id,
                    alternative_name=alt.alternative_name,
                    alternative_brand=alt.alternative_brand,
                    alternative_category=alt.alternative_category,
                    reason=alt.reason,
                    target_allergen=alt.target_allergen,
                    dietary_tags=tags,
                    health_benefit=alt.health_benefit,
                    confidence=float(alt.confidence),
                    is_curated=True,
                )
            )

        # 3. Dynamic alternative lookup if category matches other safe products in database
        if product.category_id:
            stmt_other = (
                select(Product)
                .options(selectinload(Product.brand), selectinload(Product.category))
                .where(
                    Product.category_id == product.category_id,
                    Product.id != product_id,
                    Product.is_active == True,
                )
                .limit(5)
            )
            other_prods = (await db.execute(stmt_other)).scalars().all()
            for op in other_prods:
                # Check if this product is already in curated results
                if any(r.alternative_name == op.name for r in results):
                    continue

                op_raw = (op.ingredients_raw or "").lower()
                # Check if it avoids the primary allergens of the scanned product
                avoids_milk = "milk" not in op_raw and "dairy" not in op_raw and "lactose" not in op_raw
                avoids_peanut = "peanut" not in op_raw and "groundnut" not in op_raw
                avoids_wheat = "wheat" not in op_raw and "maida" not in op_raw and "gluten" not in op_raw

                reasons = []
                tags = []
                if "Milk" in flagged_allergens or "Milk / Lactose" in flagged_allergens:
                    if avoids_milk:
                        reasons.append("100% Lactose-Free & Dairy-Free")
                        tags.extend(["Lactose-Free", "Dairy-Free"])
                if "Peanut" in flagged_allergens:
                    if avoids_peanut:
                        reasons.append("Peanut-Free")
                        tags.append("Nut-Free")
                if "Wheat" in flagged_allergens or "Wheat / Gluten" in flagged_allergens:
                    if avoids_wheat:
                        reasons.append("Gluten-Free Alternative")
                        tags.append("Gluten-Free")

                if reasons:
                    results.append(
                        AlternativeItem(
                            id=uuid.uuid4(),
                            product_id=product_id,
                            alternative_product_id=op.id,
                            alternative_name=op.name,
                            alternative_brand=op.brand.name if op.brand else None,
                            alternative_category=op.category.name if op.category else None,
                            reason=" & ".join(reasons) + " alternative in same category",
                            target_allergen=", ".join(list(flagged_allergens)[:2]) or "Allergen-Free",
                            dietary_tags=list(set(tags)),
                            health_benefit=f"Safe alternative to {product.name}",
                            confidence=0.95,
                            is_curated=False,
                        )
                    )

        return ProductAlternativesResponse(
            product_id=product.id,
            product_name=product.name,
            flagged_allergens=sorted(list(flagged_allergens)),
            dietary_conflicts=sorted(list(dietary_conflicts)),
            total_alternatives=len(results),
            alternatives=results,
        )


alternative_service = AlternativeService()
