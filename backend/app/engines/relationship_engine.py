import uuid
from typing import List, Set, Dict, Any, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ingredient import Ingredient
from app.models.ingredient_relationship import IngredientRelationship
from app.schemas.ingredient import RelationshipChainItem, RelationshipTraceResponse


async def trace_ingredient(
    db: AsyncSession,
    ingredient_id: uuid.UUID,
    max_depth: int = 5,
) -> RelationshipTraceResponse:
    """Recursively traces ingredient derivation chains and relationships.
    Guarantees cycle protection and bounded depth traversal.
    """
    stmt = (
        select(Ingredient)
        .options(
            selectinload(Ingredient.outgoing_relationships).selectinload(IngredientRelationship.target_ingredient)
        )
        .where(Ingredient.id == ingredient_id)
    )
    result = await db.execute(stmt)
    start_ing = result.scalars().first()

    if not start_ing:
        return RelationshipTraceResponse(
            ingredient_id=ingredient_id,
            canonical_name="unknown",
            display_name="Unknown Ingredient",
            chains=[],
            cycle_detected=False,
            visited_count=0,
        )

    chains: List[RelationshipChainItem] = []
    visited_all: Set[uuid.UUID] = {start_ing.id}
    cycle_detected_global = False

    async def _dfs(
        current_ing_id: uuid.UUID,
        current_name: str,
        path_names: List[str],
        path_rel_types: List[str],
        path_visited_ids: Set[uuid.UUID],
        current_depth: int,
    ):
        nonlocal cycle_detected_global

        if current_depth >= max_depth:
            if len(path_names) > 1:
                chains.append(RelationshipChainItem(path=list(path_names), relationship_types=list(path_rel_types)))
            return

        # Fetch outgoing relationships from current ingredient
        stmt_rel = (
            select(IngredientRelationship)
            .options(selectinload(IngredientRelationship.target_ingredient))
            .where(IngredientRelationship.source_ingredient_id == current_ing_id)
        )
        rels = (await db.execute(stmt_rel)).scalars().all()

        if not rels:
            if len(path_names) > 1:
                chains.append(RelationshipChainItem(path=list(path_names), relationship_types=list(path_rel_types)))
            return

        for rel in rels:
            target = rel.target_ingredient
            if not target:
                continue

            # Cycle detection in this branch
            if target.id in path_visited_ids:
                cycle_detected_global = True
                # Record the path up to cycle termination
                chains.append(
                    RelationshipChainItem(
                        path=list(path_names) + [f"{target.display_name} (Cycle detected)"],
                        relationship_types=list(path_rel_types) + [rel.relationship_type],
                    )
                )
                continue

            visited_all.add(target.id)
            new_visited = set(path_visited_ids)
            new_visited.add(target.id)

            await _dfs(
                target.id,
                target.display_name,
                path_names + [target.display_name],
                path_rel_types + [rel.relationship_type],
                new_visited,
                current_depth + 1,
            )

    await _dfs(
        current_ing_id=start_ing.id,
        current_name=start_ing.display_name,
        path_names=[start_ing.display_name],
        path_rel_types=[],
        path_visited_ids={start_ing.id},
        current_depth=0,
    )

    return RelationshipTraceResponse(
        ingredient_id=start_ing.id,
        canonical_name=start_ing.canonical_name,
        display_name=start_ing.display_name,
        chains=chains,
        cycle_detected=cycle_detected_global,
        visited_count=len(visited_all),
    )
