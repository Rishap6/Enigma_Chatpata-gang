import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.ingredient import Ingredient
from app.models.ingredient_category import IngredientCategoryMap
from app.schemas.product import (
    ProductAnalysisResponse,
    AnalyzedProductIngredient,
    ProductQualitySummary,
    ProductAllergenStatementResponse,
)
from app.engines.allergen_engine import get_allergens_for_ingredient
from app.engines.relationship_engine import trace_ingredient
from app.engines.source_engine import analyze_source
from app.engines.dietary_engine import get_dietary_properties
from app.engines.ingredient_analysis import analyze_ingredient

def calculate_product_confidence(
    identification_conf: float,
    avg_ingredient_conf: float,
    coverage_ratio: float,
) -> float:
    """Deterministic product-level confidence formula:
    product_confidence = (identification_conf * 0.3) + (avg_ingredient_conf * 0.5) + (coverage_ratio * 0.2)
    """
    return round(
        (identification_conf * 0.3) + (avg_ingredient_conf * 0.5) + (coverage_ratio * 0.2), 2
    )


async def analyze_product(db: AsyncSession, product_id: uuid.UUID) -> Optional[ProductAnalysisResponse]:
    """Analyzes a food product by linking its ordered raw ingredients to Phase 2 Ingredient Intelligence:
    1. Loads product with brand, category, ingredients, allergen statements, sources
    2. Runs Phase 2 intelligence on each ingredient (derivation chains, allergens, sources, dietary properties)
    3. Aggregates allergens and categories
    4. Computes deterministic product confidence and quality metrics
    5. Flags unverified ingredients and source uncertainties (e.g. INS 471)
    """
    stmt = (
        select(Product)
        .options(
            selectinload(Product.brand),
            selectinload(Product.category),
            selectinload(Product.identifiers),
            selectinload(Product.product_ingredients),
            selectinload(Product.allergen_statements),
            selectinload(Product.data_sources),
        )
        .where(Product.id == product_id)
    )
    product = (await db.execute(stmt)).scalars().first()
    if not product:
        return None

    analyzed_ingredients: List[AnalyzedProductIngredient] = []
    unresolved_names: List[str] = []
    all_allergens_set = set()
    all_categories_set = set()
    product_requires_verification = False

    # Process each product ingredient
    for pi in sorted(product.product_ingredients, key=lambda x: x.sequence):
        # If already linked to a Phase 2 Ingredient
        if pi.ingredient_id:
            # 1. Categories
            stmt_cats = (
                select(IngredientCategoryMap)
                .options(selectinload(IngredientCategoryMap.category))
                .where(IngredientCategoryMap.ingredient_id == pi.ingredient_id)
            )
            cat_maps = (await db.execute(stmt_cats)).scalars().all()
            categories = [cm.category.name for cm in cat_maps if cm.category]

            # 2. Allergens
            allergens = await get_allergens_for_ingredient(db, pi.ingredient_id)

            # 3. Traversal chains
            trace_res = await trace_ingredient(db, pi.ingredient_id, max_depth=5)
            chains = [c.model_dump() for c in trace_res.chains]

            # 4. Sources
            source_res = await analyze_source(db, pi.ingredient_id)
            sources = source_res.sources
            src_requires_verification = source_res.requires_verification

            # 5. Dietary properties
            dietary_res = await get_dietary_properties(db, pi.ingredient_id)
            dietary_props = dietary_res.get("properties", [])
            dietary_summary = dietary_res.get("summary", {})

            ing_conf = float(pi.match_confidence) if pi.match_confidence is not None else 1.0
            ing_req_verif = pi.requires_verification or src_requires_verification

            if ing_req_verif:
                product_requires_verification = True

            enriched_allergens = []
            for a in allergens:
                all_allergens_set.add(a["name"])
                a_copy = dict(a)
                a_copy["allergen_name"] = a["name"]
                enriched_allergens.append(a_copy)

            for c in categories:
                all_categories_set.add(c)

            analyzed_ingredients.append(
                AnalyzedProductIngredient(
                    raw_name=pi.raw_name,
                    normalized_name=pi.normalized_name,
                    ingredient_id=pi.ingredient_id,
                    sequence=pi.sequence,
                    match_method=pi.match_method,
                    confidence=ing_conf,
                    categories=categories,
                    allergens=enriched_allergens,
                    relationships=[],
                    relationship_chains=chains,
                    sources=sources,
                    dietary_properties=dietary_props,
                    dietary_summary=dietary_summary,
                    requires_verification=ing_req_verif,
                )
            )
        else:
            # Fallback: Run Phase 2 ingredient analysis on raw label name
            ing_analysis = await analyze_ingredient(db, pi.raw_name)
            if ing_analysis.matched and ing_analysis.normalized_ingredient:
                ing_conf = ing_analysis.confidence
                ing_req_verif = ing_analysis.requires_verification
                if ing_req_verif:
                    product_requires_verification = True

                for a in ing_analysis.allergens:
                    all_allergens_set.add(a["name"])
                for c in ing_analysis.categories:
                    all_categories_set.add(c)

                analyzed_ingredients.append(
                    AnalyzedProductIngredient(
                        raw_name=pi.raw_name,
                        normalized_name=ing_analysis.normalized_ingredient.get("display_name"),
                        ingredient_id=uuid.UUID(ing_analysis.normalized_ingredient["id"]),
                        sequence=pi.sequence,
                        match_method=ing_analysis.match.get("method") if ing_analysis.match else "analysis",
                        confidence=ing_conf,
                        categories=ing_analysis.categories,
                        allergens=ing_analysis.allergens,
                        relationships=ing_analysis.relationships,
                        relationship_chains=[c.model_dump() for c in ing_analysis.relationship_chains],
                        sources=ing_analysis.sources,
                        dietary_properties=ing_analysis.dietary_properties,
                        dietary_summary=ing_analysis.dietary_summary,
                        requires_verification=ing_req_verif,
                    )
                )
            else:
                # Unresolved / Unknown ingredient
                unresolved_names.append(pi.raw_name)
                product_requires_verification = True
                analyzed_ingredients.append(
                    AnalyzedProductIngredient(
                        raw_name=pi.raw_name,
                        normalized_name=None,
                        ingredient_id=None,
                        sequence=pi.sequence,
                        match_method="unresolved",
                        confidence=0.0,
                        categories=[],
                        allergens=[],
                        relationships=[],
                        relationship_chains=[],
                        sources=[],
                        dietary_properties=[],
                        dietary_summary={"status": "unknown", "animal_derived": "unknown", "vegetarian_compatible": "unknown"},
                        requires_verification=True,
                    )
                )

    # Include explicit allergen statements
    for stmt in product.allergen_statements:
        text = stmt.statement_text.lower()
        if "milk" in text or "dairy" in text:
            all_allergens_set.add("Milk")
        if "peanut" in text:
            all_allergens_set.add("Peanut")
        if "wheat" in text or "gluten" in text:
            all_allergens_set.add("Wheat")
        if "soy" in text:
            all_allergens_set.add("Soy")
        if "egg" in text:
            all_allergens_set.add("Egg")
        if "nut" in text:
            all_allergens_set.add("Tree Nut")

    # Synthesize product-level dietary summary
    any_animal = any(
        i.dietary_summary.get("animal_derived") in ["known_animal", "true"]
        for i in analyzed_ingredients
    )
    any_uncertain_origin = any(
        i.dietary_summary.get("vegetarian_compatible") == "uncertain"
        for i in analyzed_ingredients
    )
    any_incompatible_veg = any(
        i.dietary_summary.get("vegetarian_compatible") == "incompatible"
        for i in analyzed_ingredients
    )

    if any_incompatible_veg or any_animal:
        prod_veg_status = "incompatible"
        prod_animal_derived = "known_animal"
    elif any_uncertain_origin or len(unresolved_names) > 0:
        prod_veg_status = "uncertain"
        prod_animal_derived = "uncertain"
        product_requires_verification = True
    else:
        prod_veg_status = "compatible"
        prod_animal_derived = "not_animal"

    # Deterministic Product Confidence Aggregation
    # Formula: (id_confidence * 0.3) + (avg_ing_conf * 0.5) + (coverage_ratio * 0.2)
    id_conf = float(product.confidence) if product.confidence is not None else 1.0
    total_count = len(analyzed_ingredients)
    recognized_count = total_count - len(unresolved_names)
    coverage_ratio = recognized_count / total_count if total_count > 0 else 1.0
    avg_ing_conf = (
        sum(i.confidence for i in analyzed_ingredients) / total_count
        if total_count > 0
        else 1.0
    )

    computed_product_confidence = calculate_product_confidence(
        id_conf, avg_ing_conf, coverage_ratio
    )

    # Quality Summary
    id_conf_label = "High" if id_conf >= 0.9 else ("Medium" if id_conf >= 0.7 else "Low")
    if len(unresolved_names) > 0:
        overall_status = "verification_required"
    elif product_requires_verification:
        overall_status = "verification_required"
    elif computed_product_confidence >= 0.90:
        overall_status = "high_confidence"
    else:
        overall_status = "medium_confidence"

    quality_summary = ProductQualitySummary(
        identification_confidence=id_conf_label,
        ingredient_coverage_pct=round(coverage_ratio * 100, 1),
        total_ingredients=total_count,
        recognized_ingredients=recognized_count,
        unresolved_ingredients=len(unresolved_names),
        has_allergen_statement=len(product.allergen_statements) > 0,
        has_cross_contact_statement=bool(product.cross_contact_statement_raw)
        or any(s.statement_type == "cross_contact" for s in product.allergen_statements),
        primary_source=product.source_type or "curated_dataset",
        overall_status=overall_status,
    )

    allergen_stmts_resp = [
        ProductAllergenStatementResponse.model_validate(s)
        for s in product.allergen_statements
    ]

    return ProductAnalysisResponse(
        product={
            "id": product.id,
            "name": product.name,
            "normalized_name": product.normalized_name,
            "brand": product.brand.name if product.brand else None,
            "category": product.category.name if product.category else None,
            "barcode": product.barcode,
            "gtin": product.gtin,
            "image_url": product.image_url,
            "pack_size": f"{product.pack_size or ''} {product.unit or ''}".strip() or None,
            "country": product.country,
        },
        identification={
            "confidence": id_conf,
            "source_name": product.source_name,
            "source_type": product.source_type,
            "source_reference": product.source_reference,
        },
        ingredients=analyzed_ingredients,
        allergen_statements=allergen_stmts_resp,
        unresolved_ingredients=unresolved_names,
        aggregated_allergens=sorted(list(all_allergens_set)),
        aggregated_categories=sorted(list(all_categories_set)),
        dietary_summary={
            "animal_derived": prod_animal_derived,
            "vegetarian_compatible": prod_veg_status,
            "is_vegetarian": True if prod_veg_status == "compatible" else (False if prod_veg_status == "incompatible" else None),
            "status": "uncertain" if prod_veg_status == "uncertain" else "known",
        },
        product_confidence=computed_product_confidence,
        requires_verification=product_requires_verification,
        quality_summary=quality_summary,
        notes=f"Analyzed {total_count} ingredients ({recognized_count} recognized, {len(unresolved_names)} unresolved).",
    )
