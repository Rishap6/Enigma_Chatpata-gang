import uuid
from typing import List, Dict, Any, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ingredient import Ingredient
from app.models.allergen_knowledge import AllergenKnowledge, IngredientAllergenMap
from app.models.ingredient_relationship import IngredientRelationship


async def get_allergens_for_ingredient(db: AsyncSession, ingredient_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Resolves allergens for an ingredient considering:
    1. Direct allergen mappings
    2. Traversed ancestor relationships (e.g. Sodium Caseinate -> Casein -> Milk -> Milk Allergen)
    """
    allergens_found: Dict[str, Dict[str, Any]] = {}

    # 1. Direct allergen mappings
    stmt_direct = (
        select(IngredientAllergenMap)
        .options(
            selectinload(IngredientAllergenMap.allergen),
            selectinload(IngredientAllergenMap.evidence),
        )
        .where(IngredientAllergenMap.ingredient_id == ingredient_id)
    )
    direct_maps = (await db.execute(stmt_direct)).scalars().all()

    for dm in direct_maps:
        if dm.allergen:
            allergens_found[dm.allergen.name] = {
                "allergen_id": dm.allergen.id,
                "name": dm.allergen.name,
                "relationship_type": dm.relationship_type,
                "confidence": float(dm.confidence),
                "is_derived": False,
                "derivation_path": None,
                "evidence": dm.evidence.source_name if dm.evidence else None,
            }

    # 2. Traverse derivation ancestors
    visited: Set[uuid.UUID] = {ingredient_id}
    queue: List[Tuple[uuid.UUID, List[str], float]] = [(ingredient_id, [], 1.0)]

    while queue:
        curr_id, path, curr_conf = queue.pop(0)

        # Check relationships from curr_id
        stmt_rel = (
            select(IngredientRelationship)
            .options(
                selectinload(IngredientRelationship.target_ingredient).selectinload(Ingredient.allergen_maps).selectinload(IngredientAllergenMap.allergen)
            )
            .where(
                IngredientRelationship.source_ingredient_id == curr_id,
                IngredientRelationship.relationship_type.in_(["derived_from", "contains", "produced_from", "part_of"])
            )
        )
        rels = (await db.execute(stmt_rel)).scalars().all()

        for rel in rels:
            target = rel.target_ingredient
            if not target or target.id in visited:
                continue

            visited.add(target.id)
            new_path = path + [target.display_name]
            combined_conf = curr_conf * float(rel.confidence)

            # Check if target has direct allergens
            for am in target.allergen_maps:
                if am.allergen and am.allergen.name not in allergens_found:
                    allergens_found[am.allergen.name] = {
                        "allergen_id": am.allergen.id,
                        "name": am.allergen.name,
                        "relationship_type": am.relationship_type,
                        "confidence": round(combined_conf * float(am.confidence), 2),
                        "is_derived": True,
                        "derivation_path": " -> ".join(new_path),
                        "evidence": am.evidence.source_name if am.evidence else None,
                    }

            # Continue searching up to 4 levels deep
            if len(new_path) < 4:
                queue.append((target.id, new_path, combined_conf))

    return list(allergens_found.values())
