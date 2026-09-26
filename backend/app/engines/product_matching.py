import uuid
from difflib import SequenceMatcher
from typing import Optional, List, Tuple
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.product_identifier import ProductIdentifier
from app.models.brand import Brand
from app.schemas.product import (
    ProductMatchResponse,
    ProductMatchCandidate,
    ProductSummaryResponse,
    ProductDetailResponse,
    BrandResponse,
    ProductCategoryResponse,
    ProductIdentifierResponse,
    ProductIngredientResponse,
    ProductAllergenStatementResponse,
    ProductDataSourceResponse,
)
from app.engines.product_normalization import normalize_product_name


def _build_product_summary(p: Product) -> ProductSummaryResponse:
    return ProductSummaryResponse(
        id=p.id,
        name=p.name,
        normalized_name=p.normalized_name,
        brand_id=p.brand_id,
        brand_name=p.brand.name if p.brand else None,
        category_id=p.category_id,
        category_name=p.category.name if p.category else None,
        barcode=p.barcode,
        gtin=p.gtin,
        pack_size=p.pack_size,
        unit=p.unit,
        country=p.country,
        image_url=p.image_url,
        confidence=float(p.confidence) if p.confidence is not None else 1.0,
        is_active=p.is_active,
        ingredient_count=len(p.product_ingredients) if p.product_ingredients else 0,
        requires_verification=any(pi.requires_verification for pi in p.product_ingredients) if p.product_ingredients else False,
    )


def _build_product_detail(p: Product) -> ProductDetailResponse:
    brand_resp = BrandResponse.model_validate(p.brand) if p.brand else None
    cat_resp = ProductCategoryResponse.model_validate(p.category) if p.category else None
    identifiers = [ProductIdentifierResponse.model_validate(i) for i in p.identifiers] if p.identifiers else []
    ingredients = [ProductIngredientResponse.model_validate(pi) for pi in p.product_ingredients] if p.product_ingredients else []
    allergen_stmts = [ProductAllergenStatementResponse.model_validate(s) for s in p.allergen_statements] if p.allergen_statements else []
    data_sources = [ProductDataSourceResponse.model_validate(ds) for ds in p.data_sources] if p.data_sources else []

    return ProductDetailResponse(
        id=p.id,
        name=p.name,
        normalized_name=p.normalized_name,
        description=p.description,
        brand_id=p.brand_id,
        brand=brand_resp,
        category_id=p.category_id,
        category=cat_resp,
        barcode=p.barcode,
        gtin=p.gtin,
        pack_size=p.pack_size,
        unit=p.unit,
        serving_size=p.serving_size,
        country=p.country,
        image_url=p.image_url,
        ingredients_raw=p.ingredients_raw,
        allergen_statement_raw=p.allergen_statement_raw,
        cross_contact_statement_raw=p.cross_contact_statement_raw,
        source_name=p.source_name,
        source_type=p.source_type,
        source_reference=p.source_reference,
        confidence=float(p.confidence) if p.confidence is not None else 1.0,
        is_active=p.is_active,
        created_at=p.created_at,
        updated_at=p.updated_at,
        identifiers=identifiers,
        ingredients=ingredients,
        allergen_statements=allergen_stmts,
        data_sources=data_sources,
    )


async def match_product(
    db: AsyncSession,
    name: str,
    brand: Optional[str] = None,
    barcode: Optional[str] = None,
) -> ProductMatchResponse:
    """Product Matching Engine with hierarchical signals:
    1. Exact barcode or GTIN (highest confidence: 1.0)
    2. Exact product identifier value (confidence: 1.0)
    3. Exact normalized product name (confidence: 0.98)
    4. Brand + normalized product name (confidence: 0.92 - 0.95)
    5. Bounded fuzzy name matching (confidence: 0.85 - 0.90)
    6. Candidate list for low confidence (0.60 - 0.84) -> requires_selection = True
    7. Unresolved (< 0.60) -> matched = False, requires_verification = True
    """
    clean_barcode = barcode.strip() if barcode else None

    # Helper query to load products with all eager relations
    base_query = (
        select(Product)
        .options(
            selectinload(Product.brand),
            selectinload(Product.category),
            selectinload(Product.identifiers),
            selectinload(Product.product_ingredients),
            selectinload(Product.allergen_statements),
            selectinload(Product.data_sources),
        )
        .where(Product.is_active == True)
    )

    # 1. Exact Barcode / GTIN match on product record
    if clean_barcode:
        stmt_barcode = base_query.where(
            or_(
                Product.barcode == clean_barcode,
                Product.gtin == clean_barcode,
            )
        )
        prod = (await db.execute(stmt_barcode)).scalars().first()
        if prod:
            return ProductMatchResponse(
                matched=True,
                product=_build_product_detail(prod),
                confidence=1.0,
                match_method="barcode_exact",
                requires_selection=False,
                candidates=[],
            )

        # 2. Exact match in product_identifiers table
        stmt_id = (
            select(ProductIdentifier)
            .options(
                selectinload(ProductIdentifier.product).selectinload(Product.brand),
                selectinload(ProductIdentifier.product).selectinload(Product.category),
                selectinload(ProductIdentifier.product).selectinload(Product.identifiers),
                selectinload(ProductIdentifier.product).selectinload(Product.product_ingredients),
                selectinload(ProductIdentifier.product).selectinload(Product.allergen_statements),
                selectinload(ProductIdentifier.product).selectinload(Product.data_sources),
            )
            .where(ProductIdentifier.identifier_value == clean_barcode)
        )
        ident = (await db.execute(stmt_id)).scalars().first()
        if ident and ident.product and ident.product.is_active:
            return ProductMatchResponse(
                matched=True,
                product=_build_product_detail(ident.product),
                confidence=1.0,
                match_method="gtin_exact",
                requires_selection=False,
                candidates=[],
            )

    # Normalize name and brand input
    norm_info = normalize_product_name(name)
    norm_name = norm_info["normalized_name"]
    norm_brand = normalize_product_name(brand)["normalized_name"] if brand else None

    if not norm_name:
        return ProductMatchResponse(
            matched=False,
            confidence=0.0,
            requires_selection=False,
            candidates=[],
        )

    # 3. Exact Normalized Name Match
    stmt_exact = base_query.where(Product.normalized_name == norm_name)
    exact_prod = (await db.execute(stmt_exact)).scalars().first()
    if exact_prod:
        return ProductMatchResponse(
            matched=True,
            product=_build_product_detail(exact_prod),
            confidence=0.98,
            match_method="exact_normalized",
            requires_selection=False,
            candidates=[],
        )

    # Fetch all active products for brand & fuzzy ranking
    all_prods = (await db.execute(base_query)).scalars().all()
    if not all_prods:
        return ProductMatchResponse(
            matched=False,
            confidence=0.0,
            requires_selection=False,
            candidates=[],
        )

    # 4. Brand-aware matching
    scored_candidates: List[Tuple[float, Product, str]] = []

    for p in all_prods:
        p_brand_norm = p.brand.normalized_name if p.brand else ""
        brand_match = False
        if norm_brand and p_brand_norm:
            if norm_brand in p_brand_norm or p_brand_norm in norm_brand:
                brand_match = True
        elif p_brand_norm and p_brand_norm in norm_name:
            brand_match = True

        # Calculate name similarity with both norm_name and brand-prepended variants
        query_variants = [norm_name]
        if norm_brand and norm_brand not in norm_name:
            query_variants.append(f"{norm_brand} {norm_name}")

        ratio = max(
            SequenceMatcher(None, variant, p.normalized_name).ratio()
            for variant in query_variants
        )

        # Token set overlap
        input_tokens = set(norm_name.split())
        prod_tokens = set(p.normalized_name.split())
        if norm_brand:
            input_tokens_no_brand = input_tokens - {norm_brand}
            prod_tokens_no_brand = prod_tokens - {norm_brand, p_brand_norm}
        else:
            input_tokens_no_brand = input_tokens
            prod_tokens_no_brand = prod_tokens

        overlap = len(input_tokens_no_brand.intersection(prod_tokens_no_brand))
        overlap_score = overlap / max(len(input_tokens_no_brand), 1)

        # Composite score
        if brand_match:
            combined_score = (ratio * 0.45) + (overlap_score * 0.35) + 0.20
            method = "brand_name_fuzzy"
        else:
            combined_score = (ratio * 0.65) + (overlap_score * 0.35)
            method = "fuzzy_name"

        final_score = min(round(combined_score, 2), 0.99)
        scored_candidates.append((final_score, p, method))

    # Sort descending by score
    scored_candidates.sort(key=lambda x: x[0], reverse=True)
    best_score, best_prod, best_method = scored_candidates[0]

    # Evaluate confidence thresholds
    if best_score >= 0.85:
        return ProductMatchResponse(
            matched=True,
            product=_build_product_detail(best_prod),
            confidence=best_score,
            match_method=best_method,
            requires_selection=False,
            candidates=[
                ProductMatchCandidate(
                    product=_build_product_summary(p),
                    confidence=score,
                    match_method=m,
                )
                for score, p, m in scored_candidates[:3]
            ],
        )

    if best_score >= 0.60:
        # Moderate confidence: Ambiguous, requires user selection
        return ProductMatchResponse(
            matched=False,
            product=None,
            confidence=best_score,
            match_method="low_confidence",
            requires_selection=True,
            candidates=[
                ProductMatchCandidate(
                    product=_build_product_summary(p),
                    confidence=score,
                    match_method=m,
                )
                for score, p, m in scored_candidates[:5]
                if score >= 0.55
            ],
        )

    # 5. Unknown / Low Confidence Product
    return ProductMatchResponse(
        matched=False,
        product=None,
        confidence=0.0,
        match_method="unknown_product",
        requires_selection=False,
        candidates=[],
    )
