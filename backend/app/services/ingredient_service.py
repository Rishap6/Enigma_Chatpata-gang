import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ingredient import Ingredient
from app.models.ingredient_alias import IngredientAlias
from app.models.ingredient_category import IngredientCategoryMap
from app.models.allergen_knowledge import IngredientAllergenMap
from app.models.dietary_property import IngredientDietaryMap
from app.models.ingredient_source import IngredientSource
from app.schemas.ingredient import (
    IngredientSearchItem,
    IngredientDetailResponse,
    IngredientSourceResponse,
)
from app.engines.allergen_engine import get_allergens_for_ingredient
from app.engines.dietary_engine import get_dietary_properties
from app.engines.source_engine import analyze_source
from app.engines.ingredient_normalization import normalize_text


class IngredientService:
    @staticmethod
    async def search_ingredients(db: AsyncSession, query: str, limit: int = 20) -> List[IngredientSearchItem]:
        """Fast indexed search matching canonical name and aliases."""
        if not query or not query.strip():
            return []

        clean_q = query.strip()
        norm_q = normalize_text(clean_q)

        results: Dict[uuid.UUID, IngredientSearchItem] = {}

        # 1. Search canonical names
        stmt_canonical = (
            select(Ingredient)
            .where(
                or_(
                    Ingredient.canonical_name.ilike(f"%{norm_q}%"),
                    Ingredient.display_name.ilike(f"%{clean_q}%"),
                ),
                Ingredient.is_active == True,
            )
            .limit(limit)
        )
        for ing in (await db.execute(stmt_canonical)).scalars().all():
            results[ing.id] = IngredientSearchItem(
                id=ing.id,
                canonical_name=ing.canonical_name,
                display_name=ing.display_name,
                matched_alias=None,
                match_method="canonical",
                confidence=1.0 if ing.canonical_name == norm_q else 0.95,
            )

        # 2. Search aliases
        stmt_alias = (
            select(IngredientAlias)
            .options(selectinload(IngredientAlias.ingredient))
            .where(
                or_(
                    IngredientAlias.alias.ilike(f"%{clean_q}%"),
                    IngredientAlias.alias_normalized.ilike(f"%{norm_q}%"),
                )
            )
            .limit(limit)
        )
        for al in (await db.execute(stmt_alias)).scalars().all():
            if al.ingredient and al.ingredient.is_active and al.ingredient.id not in results:
                results[al.ingredient.id] = IngredientSearchItem(
                    id=al.ingredient.id,
                    canonical_name=al.ingredient.canonical_name,
                    display_name=al.ingredient.display_name,
                    matched_alias=al.alias,
                    match_method="alias",
                    confidence=0.98 if al.alias_normalized == norm_q else 0.90,
                )

        return list(results.values())[:limit]

    @staticmethod
    async def list_ingredients(db: AsyncSession, skip: int = 0, limit: int = 50) -> List[IngredientDetailResponse]:
        stmt = (
            select(Ingredient)
            .options(
                selectinload(Ingredient.aliases),
                selectinload(Ingredient.category_maps).selectinload(IngredientCategoryMap.category),
                selectinload(Ingredient.allergen_maps).selectinload(IngredientAllergenMap.allergen),
                selectinload(Ingredient.dietary_maps).selectinload(IngredientDietaryMap.dietary_property),
                selectinload(Ingredient.sources),
            )
            .where(Ingredient.is_active == True)
            .order_by(Ingredient.display_name)
            .offset(skip)
            .limit(limit)
        )
        ingredients = (await db.execute(stmt)).scalars().all()
        return [IngredientService._serialize_ingredient(ing) for ing in ingredients]

    @staticmethod
    async def get_ingredient_by_id(db: AsyncSession, ingredient_id: uuid.UUID) -> Optional[IngredientDetailResponse]:
        stmt = (
            select(Ingredient)
            .options(
                selectinload(Ingredient.aliases),
                selectinload(Ingredient.category_maps).selectinload(IngredientCategoryMap.category),
                selectinload(Ingredient.allergen_maps).selectinload(IngredientAllergenMap.allergen),
                selectinload(Ingredient.dietary_maps).selectinload(IngredientDietaryMap.dietary_property),
                selectinload(Ingredient.sources),
            )
            .where(Ingredient.id == ingredient_id)
        )
        ing = (await db.execute(stmt)).scalars().first()
        if not ing:
            return None
        return IngredientService._serialize_ingredient(ing)

    @staticmethod
    async def get_allergens(db: AsyncSession, ingredient_id: uuid.UUID) -> List[Dict[str, Any]]:
        return await get_allergens_for_ingredient(db, ingredient_id)

    @staticmethod
    async def get_dietary_properties(db: AsyncSession, ingredient_id: uuid.UUID) -> Dict[str, Any]:
        return await get_dietary_properties(db, ingredient_id)

    @staticmethod
    async def get_sources(db: AsyncSession, ingredient_id: uuid.UUID) -> Dict[str, Any]:
        return (await analyze_source(db, ingredient_id)).model_dump()

    @staticmethod
    def _serialize_ingredient(ing: Ingredient) -> IngredientDetailResponse:
        aliases = [a.alias for a in ing.aliases] if ing.aliases else []
        categories = [cm.category.name for cm in ing.category_maps if cm.category] if ing.category_maps else []
        allergens = [
            {"name": am.allergen.name, "relationship": am.relationship_type, "confidence": float(am.confidence)}
            for am in ing.allergen_maps if am.allergen
        ] if ing.allergen_maps else []
        dietary = [
            {"name": dm.dietary_property.name, "status": dm.status, "confidence": float(dm.confidence)}
            for dm in ing.dietary_maps if dm.dietary_property
        ] if ing.dietary_maps else []
        sources = [
            {"type": s.source_type, "status": s.source_status, "confidence": float(s.confidence)}
            for s in ing.sources
        ] if ing.sources else []

        return IngredientDetailResponse(
            id=ing.id,
            canonical_name=ing.canonical_name,
            display_name=ing.display_name,
            description=ing.description,
            ingredient_type=ing.ingredient_type,
            is_active=ing.is_active,
            created_at=ing.created_at,
            updated_at=ing.updated_at,
            aliases=aliases,
            categories=categories,
            allergens=allergens,
            dietary_properties=dietary,
            sources=sources,
        )
