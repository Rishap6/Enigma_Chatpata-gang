import re
import unicodedata
from difflib import SequenceMatcher
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ingredient import Ingredient
from app.models.ingredient_alias import IngredientAlias
from app.schemas.ingredient import NormalizationResponse


def normalize_text(text: str) -> str:
    """Deterministic normalization pipeline:
    1. Trim whitespace
    2. Lowercase
    3. Normalize Unicode (NFKD)
    4. Remove percentage notations (e.g. 67%, 0.5%)
    5. Remove extraneous punctuation, retaining alphanumeric and single spaces
    6. Collapse repeated spaces
    """
    if not text:
        return ""
    # Unicode normalize
    norm = unicodedata.normalize("NFKD", text)
    # Lowercase
    norm = norm.lower().strip()
    # Remove percentage numbers e.g. (67%), 0.5%, 67 %
    norm = re.sub(r"\b\d+(?:\.\d+)?\s*%", " ", norm)
    # Replace common separators with space
    norm = re.sub(r"[\-_/\\,;:()[\]{}]", " ", norm)
    # Remove characters other than letters, numbers, and spaces
    norm = re.sub(r"[^\w\s]", "", norm)
    # Collapse multiple spaces
    norm = re.sub(r"\s+", " ", norm).strip()
    return norm


async def normalize_ingredient(
    db: AsyncSession,
    raw_text: str,
    fuzzy_high_threshold: float = 0.90,
    fuzzy_medium_threshold: float = 0.70,
) -> NormalizationResponse:
    """Resolves raw text into a canonical ingredient using deterministic database lookup first,
    followed by confidence-bounded fuzzy matching.
    Never hallucinates or invents non-existent ingredients.
    """
    if not raw_text or not raw_text.strip():
        return NormalizationResponse(
            matched=False,
            confidence=0.0,
            requires_verification=True,
            match_method="unresolved",
        )

    clean_raw = raw_text.strip()
    # Strip any lingering __PAREN_ markers from raw input
    clean_raw = re.sub(r"__PAREN_\d+__", "", clean_raw).strip()
    normalized_input = normalize_text(clean_raw)

    # 1. Exact Match on Canonical Name (Case-Insensitive & underscore-agnostic)
    canon_variations = [normalized_input, normalized_input.replace(" ", "_"), normalized_input.replace("_", " ")]
    stmt_canonical = (
        select(Ingredient)
        .where(Ingredient.canonical_name.in_(canon_variations), Ingredient.is_active == True)
    )
    result = await db.execute(stmt_canonical)
    ingredient = result.scalars().first()
    if ingredient:
        return NormalizationResponse(
            matched=True,
            canonical_name=ingredient.canonical_name,
            display_name=ingredient.display_name,
            ingredient_id=ingredient.id,
            matched_alias=clean_raw,
            match_method="exact_canonical",
            confidence=1.0,
            requires_verification=False,
        )

    # 2. Exact Match on Raw Alias
    stmt_alias_exact = (
        select(IngredientAlias)
        .options(selectinload(IngredientAlias.ingredient))
        .where(IngredientAlias.alias.ilike(clean_raw))
    )
    alias_res = (await db.execute(stmt_alias_exact)).scalars().first()
    if alias_res and alias_res.ingredient and alias_res.ingredient.is_active:
        return NormalizationResponse(
            matched=True,
            canonical_name=alias_res.ingredient.canonical_name,
            display_name=alias_res.ingredient.display_name,
            ingredient_id=alias_res.ingredient.id,
            matched_alias=alias_res.alias,
            match_method="alias",
            confidence=0.99,
            requires_verification=False,
        )

    # 3. Match on Normalized Alias
    stmt_alias_norm = (
        select(IngredientAlias)
        .options(selectinload(IngredientAlias.ingredient))
        .where(IngredientAlias.alias_normalized.in_(canon_variations))
    )
    alias_norm_res = (await db.execute(stmt_alias_norm)).scalars().first()
    if alias_norm_res and alias_norm_res.ingredient and alias_norm_res.ingredient.is_active:
        return NormalizationResponse(
            matched=True,
            canonical_name=alias_norm_res.ingredient.canonical_name,
            display_name=alias_norm_res.ingredient.display_name,
            ingredient_id=alias_norm_res.ingredient.id,
            matched_alias=alias_norm_res.alias,
            match_method="normalized_alias",
            confidence=0.98,
            requires_verification=False,
        )

    # 3b. Composite / Bracket unwrapping: Iteratively strip bracketed/parenthesized clauses
    base_text = clean_raw
    while re.search(r"[\(\[\{][^\(\)\[\]\{\}]*[\)\]\}]", base_text):
        base_text = re.sub(r"[\(\[\{][^\(\)\[\]\{\}]*[\)\]\}]", " ", base_text)
    base_text = base_text.strip()

    if base_text and base_text != clean_raw:
        base_norm = normalize_text(base_text)
        base_variations = [base_norm, base_norm.replace(" ", "_"), base_norm.replace("_", " ")]
        if base_norm and base_norm != normalized_input:
            stmt_base_canon = (
                select(Ingredient)
                .where(Ingredient.canonical_name.in_(base_variations), Ingredient.is_active == True)
            )
            base_ing = (await db.execute(stmt_base_canon)).scalars().first()
            if base_ing:
                return NormalizationResponse(
                    matched=True,
                    canonical_name=base_ing.canonical_name,
                    display_name=base_ing.display_name,
                    ingredient_id=base_ing.id,
                    matched_alias=clean_raw,
                    match_method="base_canonical",
                    confidence=0.97,
                    requires_verification=False,
                )

            stmt_base_alias = (
                select(IngredientAlias)
                .options(selectinload(IngredientAlias.ingredient))
                .where(IngredientAlias.alias_normalized.in_(base_variations))
            )
            base_alias_res = (await db.execute(stmt_base_alias)).scalars().first()
            if base_alias_res and base_alias_res.ingredient and base_alias_res.ingredient.is_active:
                return NormalizationResponse(
                    matched=True,
                    canonical_name=base_alias_res.ingredient.canonical_name,
                    display_name=base_alias_res.ingredient.display_name,
                    ingredient_id=base_alias_res.ingredient.id,
                    matched_alias=base_alias_res.alias,
                    match_method="base_alias",
                    confidence=0.96,
                    requires_verification=False,
                )

        # Also check inside parentheses/brackets as sub-alias
        inner_matches = re.findall(r"[\(\[](.*?)[\)\]]", clean_raw)
        for inner in inner_matches:
            inner_norm = normalize_text(inner)
            if not inner_norm or inner_norm == normalized_input:
                continue
            inner_vars = [inner_norm, inner_norm.replace(" ", "_"), inner_norm.replace("_", " ")]
            stmt_inner_alias = (
                select(IngredientAlias)
                .options(selectinload(IngredientAlias.ingredient))
                .where(IngredientAlias.alias_normalized.in_(inner_vars))
            )
            inner_alias_res = (await db.execute(stmt_inner_alias)).scalars().first()
            if inner_alias_res and inner_alias_res.ingredient and inner_alias_res.ingredient.is_active:
                return NormalizationResponse(
                    matched=True,
                    canonical_name=inner_alias_res.ingredient.canonical_name,
                    display_name=inner_alias_res.ingredient.display_name,
                    ingredient_id=inner_alias_res.ingredient.id,
                    matched_alias=inner_alias_res.alias,
                    match_method="parenthetical_alias",
                    confidence=0.95,
                    requires_verification=False,
                )

    # 4. Confidence-Bounded Fuzzy Matching
    # Load active ingredients and aliases to compute similarity
    stmt_all_ing = select(Ingredient).where(Ingredient.is_active == True)
    all_ingredients = (await db.execute(stmt_all_ing)).scalars().all()

    stmt_all_alias = select(IngredientAlias).options(selectinload(IngredientAlias.ingredient))
    all_aliases = (await db.execute(stmt_all_alias)).scalars().all()

    best_match_ratio = 0.0
    best_candidate_ing: Optional[Ingredient] = None
    best_matched_alias: Optional[str] = None

    # Check canonical names
    for ing in all_ingredients:
        ratio = SequenceMatcher(None, normalized_input, ing.canonical_name).ratio()
        if ratio > best_match_ratio:
            best_match_ratio = ratio
            best_candidate_ing = ing
            best_matched_alias = ing.display_name

    # Check aliases
    for al in all_aliases:
        if not al.ingredient or not al.ingredient.is_active:
            continue
        ratio = SequenceMatcher(None, normalized_input, al.alias_normalized).ratio()
        if ratio > best_match_ratio:
            best_match_ratio = ratio
            best_candidate_ing = al.ingredient
            best_matched_alias = al.alias

    # Evaluate confidence thresholds
    if best_match_ratio >= fuzzy_high_threshold and best_candidate_ing:
        return NormalizationResponse(
            matched=True,
            canonical_name=best_candidate_ing.canonical_name,
            display_name=best_candidate_ing.display_name,
            ingredient_id=best_candidate_ing.id,
            matched_alias=best_matched_alias,
            match_method="fuzzy",
            confidence=round(best_match_ratio, 2),
            requires_verification=False,
        )

    if best_match_ratio >= fuzzy_medium_threshold and best_candidate_ing:
        # Moderate confidence: identify candidate, but do not silently treat as certain
        return NormalizationResponse(
            matched=False,
            canonical_name=best_candidate_ing.canonical_name,
            display_name=best_candidate_ing.display_name,
            ingredient_id=best_candidate_ing.id,
            candidate=best_candidate_ing.display_name,
            matched_alias=best_matched_alias,
            match_method="fuzzy_unverified",
            confidence=round(best_match_ratio, 2),
            requires_verification=True,
        )

    # 5. Unresolved / Unknown Ingredient
    return NormalizationResponse(
        matched=False,
        confidence=0.0,
        requires_verification=True,
        match_method="unresolved",
    )
