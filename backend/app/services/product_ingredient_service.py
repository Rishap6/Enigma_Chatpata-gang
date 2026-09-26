import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.product_ingredient import ProductIngredient
from app.models.product import Product
from app.engines.ingredient_normalization import normalize_ingredient
from app.engines.source_engine import analyze_source


class ProductIngredientService:
    @staticmethod
    async def ingest_product_ingredients(
        db: AsyncSession,
        product_id: uuid.UUID,
        raw_ingredients: List[str],
    ) -> List[ProductIngredient]:
        """Ingests raw ingredient strings for a product:
        1. Preserves raw label text verbatim.
        2. Sends raw text to Phase 2 normalization engine.
        3. Links Phase 2 canonical ingredient reference.
        4. Preserves match method, match confidence, sequence, and verification flags.
        """
        # Remove existing ingredients if replacing
        await db.execute(
            delete(ProductIngredient).where(ProductIngredient.product_id == product_id)
        )

        ingested_items: List[ProductIngredient] = []

        for seq, raw_text in enumerate(raw_ingredients, start=1):
            clean_raw = raw_text.strip()
            if not clean_raw:
                continue

            # Run through Phase 2 normalization
            norm_res = await normalize_ingredient(db, clean_raw)

            requires_verif = norm_res.requires_verification
            # Also check source uncertainty for matched ingredients (e.g. INS 471)
            if norm_res.matched and norm_res.ingredient_id:
                src_res = await analyze_source(db, norm_res.ingredient_id)
                if src_res.requires_verification:
                    requires_verif = True

            prod_ing = ProductIngredient(
                product_id=product_id,
                ingredient_id=norm_res.ingredient_id if norm_res.matched else None,
                raw_name=clean_raw,
                normalized_name=norm_res.display_name if norm_res.matched else None,
                sequence=seq,
                match_method=norm_res.match_method,
                match_confidence=norm_res.confidence,
                requires_verification=requires_verif,
            )
            db.add(prod_ing)
            ingested_items.append(prod_ing)

        await db.flush()
        await db.commit()
        return ingested_items
