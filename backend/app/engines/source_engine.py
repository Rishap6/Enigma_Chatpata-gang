import uuid
from typing import List, Dict, Any, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ingredient import Ingredient
from app.models.ingredient_source import IngredientSource
from app.models.ingredient_relationship import IngredientRelationship
from app.schemas.ingredient import SourceAnalysisResponse


async def analyze_source(db: AsyncSession, ingredient_id: uuid.UUID) -> SourceAnalysisResponse:
    """Analyzes source origins for an ingredient including derived ancestry.
    Identifies uncertainty when conflicting sources exist (e.g. plant vs animal for INS 471).
    """
    # 1. Direct sources
    stmt_direct = (
        select(IngredientSource)
        .options(selectinload(IngredientSource.evidence))
        .where(IngredientSource.ingredient_id == ingredient_id)
    )
    direct_sources = (await db.execute(stmt_direct)).scalars().all()

    # 2. Inherited sources from derived parents
    stmt_parents = (
        select(IngredientRelationship)
        .options(
            selectinload(IngredientRelationship.target_ingredient).selectinload(Ingredient.sources)
        )
        .where(
            IngredientRelationship.source_ingredient_id == ingredient_id,
            IngredientRelationship.relationship_type.in_(["derived_from", "contains", "produced_from"])
        )
    )
    parent_rels = (await db.execute(stmt_parents)).scalars().all()

    all_sources_dict: Dict[str, Dict[str, Any]] = {}

    for s in direct_sources:
        key = f"{s.source_type}_{s.source_status}"
        all_sources_dict[key] = {
            "type": s.source_type,
            "status": s.source_status,
            "description": s.description,
            "confidence": float(s.confidence),
            "evidence": s.evidence.source_name if s.evidence else None,
            "is_derived": False,
        }

    for pr in parent_rels:
        if pr.target_ingredient and pr.target_ingredient.sources:
            for ps in pr.target_ingredient.sources:
                key = f"{ps.source_type}_{ps.source_status}"
                if key not in all_sources_dict:
                    all_sources_dict[key] = {
                        "type": ps.source_type,
                        "status": ps.source_status,
                        "description": f"Derived via {pr.target_ingredient.display_name}: {ps.description or ''}".strip(),
                        "confidence": float(ps.confidence) * float(pr.confidence),
                        "evidence": ps.evidence.source_name if ps.evidence else None,
                        "is_derived": True,
                    }

    source_list = list(all_sources_dict.values())

    if not source_list:
        return SourceAnalysisResponse(
            status="unknown",
            sources=[{"type": "unknown", "status": "unknown", "confidence": 0.0}],
            requires_verification=True,
            confidence=0.0,
        )

    # Check uncertainty conditions
    source_types: Set[str] = {s["type"] for s in source_list}
    has_known = any(s["status"] == "known" for s in source_list)
    has_possible = any(s["status"] == "possible" for s in source_list)

    # If both animal and plant are listed as possible, overall source is uncertain
    if "plant" in source_types and "animal" in source_types:
        overall_status = "unknown"
        requires_verif = True
        overall_conf = 0.50
    elif has_known and not has_possible:
        overall_status = "known"
        requires_verif = False
        overall_conf = max(s["confidence"] for s in source_list)
    elif has_possible:
        overall_status = "unknown"
        requires_verif = True
        overall_conf = 0.60
    else:
        overall_status = "unknown"
        requires_verif = True
        overall_conf = 0.0

    return SourceAnalysisResponse(
        status=overall_status,
        sources=source_list,
        requires_verification=requires_verif,
        confidence=round(overall_conf, 2),
    )
