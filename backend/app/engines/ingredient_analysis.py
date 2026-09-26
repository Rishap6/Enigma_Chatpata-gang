import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ingredient import Ingredient
from app.models.ingredient_category import IngredientCategoryMap
from app.schemas.ingredient import UnifiedIngredientAnalysisResponse, RelationshipChainItem
from app.engines.ingredient_normalization import normalize_ingredient
from app.engines.relationship_engine import trace_ingredient
from app.engines.source_engine import analyze_source
from app.engines.allergen_engine import get_allergens_for_ingredient
from app.engines.dietary_engine import get_dietary_properties


async def analyze_ingredient(
    db: AsyncSession,
    raw_text: str,
) -> UnifiedIngredientAnalysisResponse:
    """Unified Ingredient Analysis Pipeline:
    Raw text -> Normalization -> Identification -> Relationship Traversal ->
    Category Resolution -> Allergen Resolution -> Source Analysis ->
    Dietary Property Analysis -> Confidence Aggregation -> Complete Structured Output.
    """
    clean_raw = raw_text.strip() if raw_text else ""

    # Step 1: Normalization
    norm_res = await normalize_ingredient(db, clean_raw)

    if not norm_res.matched or not norm_res.ingredient_id:
        return UnifiedIngredientAnalysisResponse(
            raw_input=clean_raw,
            matched=False,
            normalized_ingredient=None,
            match={
                "method": norm_res.match_method,
                "confidence": norm_res.confidence,
                "candidate": norm_res.candidate,
            },
            categories=[],
            allergens=[],
            relationships=[],
            relationship_chains=[],
            sources=[],
            dietary_properties=[],
            dietary_summary={
                "status": "unknown",
                "animal_derived": "unknown",
                "vegetarian_compatible": "unknown",
            },
            confidence=norm_res.confidence,
            requires_verification=True,
            evidence=[],
            notes=f"Unrecognized ingredient: '{clean_raw}'. Requires verification or manual review.",
        )

    # Step 2: Fetch Ingredient details with categories
    stmt_ing = (
        select(Ingredient)
        .options(
            selectinload(Ingredient.category_maps).selectinload(IngredientCategoryMap.category),
            selectinload(Ingredient.outgoing_relationships),
        )
        .where(Ingredient.id == norm_res.ingredient_id)
    )
    ingredient = (await db.execute(stmt_ing)).scalars().first()

    categories: List[str] = []
    if ingredient and ingredient.category_maps:
        for cm in ingredient.category_maps:
            if cm.category:
                categories.append(cm.category.name)

    # Step 3: Traversal of derivation and relationships
    trace_res = await trace_ingredient(db, norm_res.ingredient_id, max_depth=5)

    relationships_list: List[Dict[str, Any]] = []
    if ingredient and ingredient.outgoing_relationships:
        for r in ingredient.outgoing_relationships:
            relationships_list.append({
                "from": ingredient.display_name,
                "relationship": r.relationship_type,
                "to": r.target_ingredient.display_name if r.target_ingredient else "Unknown",
                "confidence": float(r.confidence),
            })

    # Step 4: Allergens resolution (direct + derived)
    allergens = await get_allergens_for_ingredient(db, norm_res.ingredient_id)

    # Step 5: Source analysis (known vs possible vs uncertain)
    source_analysis = await analyze_source(db, norm_res.ingredient_id)

    # Step 6: Dietary properties
    dietary_analysis = await get_dietary_properties(db, norm_res.ingredient_id)

    # Step 7: Confidence aggregation & verification requirement
    # Base confidence comes from normalization match
    base_confidence = norm_res.confidence

    # If sources or dietary are uncertain, flag verification
    requires_verif = (
        source_analysis.requires_verification
        or dietary_analysis["summary"].get("status") == "uncertain"
        or base_confidence < 0.90
    )

    # Aggregate confidence
    source_conf = source_analysis.confidence if source_analysis.confidence > 0 else 0.8
    aggregated_confidence = round(base_confidence * source_conf, 2)
    if not requires_verif and aggregated_confidence < 0.90:
        aggregated_confidence = round(base_confidence, 2)

    return UnifiedIngredientAnalysisResponse(
        raw_input=clean_raw,
        matched=True,
        normalized_ingredient={
            "id": ingredient.id if ingredient else norm_res.ingredient_id,
            "canonical_name": norm_res.canonical_name,
            "display_name": norm_res.display_name,
            "ingredient_type": ingredient.ingredient_type if ingredient else "basic_ingredient",
            "description": ingredient.description if ingredient else None,
        },
        match={
            "method": norm_res.match_method,
            "confidence": norm_res.confidence,
            "matched_alias": norm_res.matched_alias,
        },
        categories=categories,
        allergens=allergens,
        relationships=relationships_list,
        relationship_chains=trace_res.chains,
        sources=source_analysis.sources,
        dietary_properties=dietary_analysis["properties"],
        dietary_summary=dietary_analysis["summary"],
        confidence=aggregated_confidence,
        requires_verification=requires_verif,
        evidence=[],
        notes="Source status uncertain. Verification recommended." if source_analysis.status == "unknown" else None,
    )
