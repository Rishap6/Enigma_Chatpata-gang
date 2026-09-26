import uuid
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ingredient import Ingredient
from app.models.ingredient_relationship import IngredientRelationship
from app.schemas.ingredient import (
    IngredientRelationshipResponse,
    RelationshipTraceResponse,
)
from app.engines.relationship_engine import trace_ingredient


class IngredientRelationshipService:
    @staticmethod
    async def get_direct_relationships(
        db: AsyncSession, ingredient_id: uuid.UUID
    ) -> List[IngredientRelationshipResponse]:
        """Gets direct outgoing relationships from an ingredient."""
        stmt = (
            select(IngredientRelationship)
            .options(
                selectinload(IngredientRelationship.source_ingredient),
                selectinload(IngredientRelationship.target_ingredient),
            )
            .where(IngredientRelationship.source_ingredient_id == ingredient_id)
        )
        rels = (await db.execute(stmt)).scalars().all()
        return [
            IngredientRelationshipResponse(
                id=r.id,
                source_ingredient_id=r.source_ingredient_id,
                source_name=r.source_ingredient.display_name if r.source_ingredient else None,
                relationship_type=r.relationship_type,
                target_ingredient_id=r.target_ingredient_id,
                target_name=r.target_ingredient.display_name if r.target_ingredient else None,
                confidence=float(r.confidence),
                notes=r.notes,
            )
            for r in rels
        ]

    @staticmethod
    async def trace_relationships(
        db: AsyncSession, ingredient_id: uuid.UUID, max_depth: int = 5
    ) -> RelationshipTraceResponse:
        """Traces the complete derivation chains with cycle protection."""
        return await trace_ingredient(db, ingredient_id, max_depth=max_depth)
