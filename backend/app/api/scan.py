"""
Phase 10 — Barcode + Ingredient Scanner API
Provides:
  1. POST /scan/barcode → lookup product by GTIN barcode
  2. POST /scan/ingredients → parse raw OCR ingredient text, normalize via Phase 2, analyze allergens/dietary
  3. POST /scan/compare → compare catalog ingredients vs OCR-scanned ingredients
  4. POST /scan/seed-csv → import new_products_gtin.csv into the product catalog
"""

import uuid
import csv
import io
import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.user import User
from app.models.product import Product
from app.models.product_identifier import ProductIdentifier
from app.models.brand import Brand
from app.models.product_category import ProductCategory
from app.models.product_allergen_statement import ProductAllergenStatement
from app.models.product_data_source import ProductDataSource
from app.engines.product_normalization import normalize_product_name
from app.engines.ingredient_normalization import normalize_ingredient
from app.engines.source_engine import analyze_source
from app.engines.allergen_engine import get_allergens_for_ingredient
from app.services.product_ingredient_service import ProductIngredientService


router = APIRouter(prefix="/scan", tags=["Scanner Intelligence"])


# ────────────── Schemas ──────────────


class BarcodeScanRequest(BaseModel):
    barcode: str = Field(..., description="Raw barcode/GTIN string from scanner")


class BarcodeScanResponse(BaseModel):
    found: bool
    barcode: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    brand_name: Optional[str] = None
    category_name: Optional[str] = None
    ingredients_raw: Optional[str] = None
    gtin: Optional[str] = None
    serving_size: Optional[str] = None
    pack_size: Optional[str] = None


class IngredientScanRequest(BaseModel):
    raw_text: str = Field(..., description="Raw OCR text from ingredient label")
    product_id: Optional[str] = Field(None, description="Optional linked product ID for comparison")


class ParsedIngredientItem(BaseModel):
    raw_name: str
    normalized_name: Optional[str] = None
    matched: bool = False
    confidence: float = 0.0
    match_method: Optional[str] = None
    allergen_flags: List[str] = []
    dietary_flags: List[str] = []
    source_uncertain: bool = False
    requires_verification: bool = False


class IngredientScanResponse(BaseModel):
    raw_text: str
    parsed_count: int
    ingredients: List[ParsedIngredientItem]
    allergens_detected: List[str] = []
    dietary_flags: List[str] = []
    verification_required_count: int = 0
    source_uncertain_count: int = 0


class CompareRequest(BaseModel):
    product_id: str = Field(..., description="Catalog product ID")
    ocr_ingredients: List[str] = Field(..., description="OCR-parsed ingredient list")


class ComparisonItem(BaseModel):
    name: str
    status: str  # "matching", "additional", "missing", "uncertain"
    catalog_name: Optional[str] = None
    ocr_name: Optional[str] = None
    confidence: float = 0.0


class CompareResponse(BaseModel):
    product_id: str
    product_name: str
    matching: List[ComparisonItem] = []
    additional: List[ComparisonItem] = []
    missing: List[ComparisonItem] = []
    uncertain: List[ComparisonItem] = []
    match_score: float = 0.0


class CSVSeedResponse(BaseModel):
    imported: int
    skipped: int
    errors: List[str] = []


# ────────────── Helpers ──────────────


def parse_ingredient_text(raw_text: str) -> List[str]:
    """Parse raw OCR ingredient text into individual ingredient strings.
    Handles comma-separated, semicolon-separated, and parenthesized sub-ingredients.
    """
    if not raw_text or not raw_text.strip():
        return []

    # Remove common label prefixes
    text = raw_text.strip()
    text = re.sub(r'^(?:ingredients?\s*:?\s*)', '', text, flags=re.IGNORECASE)

    # Split on commas, semicolons but preserve parenthesized content
    # First, temporarily replace content inside parentheses
    paren_map: Dict[str, str] = {}
    counter = 0

    def replace_paren(match: re.Match) -> str:
        nonlocal counter
        key = f"__PAREN_{counter}__"
        paren_map[key] = match.group(0)
        counter += 1
        return key

    text = re.sub(r'\([^)]*\)', replace_paren, text)
    text = re.sub(r'\[[^\]]*\]', replace_paren, text)

    # Split on commas and semicolons
    parts = re.split(r'[,;]', text)

    ingredients = []
    for part in parts:
        cleaned = part.strip()
        if not cleaned:
            continue
        # Restore parenthesized content iteratively to handle nesting
        while "__PAREN_" in cleaned:
            old = cleaned
            for key, val in paren_map.items():
                cleaned = cleaned.replace(key, val)
            if cleaned == old:
                break
        cleaned = re.sub(r"__PAREN_\d+__", "", cleaned)
        # Remove trailing periods
        cleaned = cleaned.rstrip('.')
        cleaned = cleaned.strip()
        if cleaned and len(cleaned) > 1:
            ingredients.append(cleaned)

    return ingredients


def normalize_for_comparison(name: str) -> str:
    """Normalize an ingredient name for fuzzy comparison."""
    s = name.lower().strip()
    s = re.sub(r'[^a-z0-9\s]', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


# ────────────── Endpoints ──────────────


@router.post("/barcode", response_model=BarcodeScanResponse)
async def scan_barcode(
    request: BarcodeScanRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Lookup product by barcode/GTIN. Returns product info if found."""
    barcode = request.barcode.strip()

    # Try exact barcode match on Product table
    stmt = select(Product).where(
        (Product.barcode == barcode) | (Product.gtin == barcode)
    )
    product = (await db.execute(stmt)).scalars().first()

    # Also try ProductIdentifier table
    if not product:
        stmt_id = select(ProductIdentifier).where(
            ProductIdentifier.identifier_value == barcode
        )
        ident = (await db.execute(stmt_id)).scalars().first()
        if ident:
            stmt_p = select(Product).where(Product.id == ident.product_id)
            product = (await db.execute(stmt_p)).scalars().first()

    if not product:
        return BarcodeScanResponse(found=False, barcode=barcode)

    return BarcodeScanResponse(
        found=True,
        barcode=barcode,
        product_id=str(product.id),
        product_name=product.name,
        brand_name=product.brand.name if product.brand else None,
        category_name=product.category.name if product.category else None,
        ingredients_raw=product.ingredients_raw,
        gtin=product.gtin,
        serving_size=product.serving_size,
        pack_size=product.pack_size,
    )


@router.post("/ingredients", response_model=IngredientScanResponse)
async def scan_ingredients(
    request: IngredientScanRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Parse raw OCR ingredient text, normalize via Phase 2, and analyze for allergens/dietary flags."""
    raw_text = request.raw_text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="No ingredient text provided")

    parsed_names = parse_ingredient_text(raw_text)
    if not parsed_names:
        raise HTTPException(status_code=400, detail="Could not parse any ingredients from the provided text")

    all_allergens: set = set()
    all_dietary: set = set()
    verification_count = 0
    source_uncertain_count = 0

    items: List[ParsedIngredientItem] = []

    for raw_name in parsed_names:
        # Phase 2 normalization
        norm_res = await normalize_ingredient(db, raw_name)

        allergen_flags: List[str] = []
        dietary_flags: List[str] = []
        source_uncertain = False
        requires_verif = norm_res.requires_verification

        if norm_res.matched and norm_res.ingredient_id:
            # Check allergens via Phase 2 allergen engine
            allergen_list = await get_allergens_for_ingredient(db, norm_res.ingredient_id)
            if allergen_list:
                for a in allergen_list:
                    a_name = a.get("name", "")
                    if a_name:
                        allergen_flags.append(a_name)
                        all_allergens.add(a_name)

            # Check source uncertainty
            src_res = await analyze_source(db, norm_res.ingredient_id)
            if src_res.requires_verification:
                source_uncertain = True
                requires_verif = True
                source_uncertain_count += 1

            # Check dietary flags from source
            if src_res.sources:
                for src in src_res.sources:
                    if src.source_type and src.source_type.lower() in ('animal', 'plant_or_animal'):
                        dietary_flags.append(f"source:{src.source_type}")
                        all_dietary.add(f"source:{src.source_type}")

        if requires_verif:
            verification_count += 1

        items.append(ParsedIngredientItem(
            raw_name=raw_name,
            normalized_name=norm_res.display_name if norm_res.matched else None,
            matched=norm_res.matched,
            confidence=norm_res.confidence,
            match_method=norm_res.match_method,
            allergen_flags=allergen_flags,
            dietary_flags=dietary_flags,
            source_uncertain=source_uncertain,
            requires_verification=requires_verif,
        ))

    return IngredientScanResponse(
        raw_text=raw_text,
        parsed_count=len(items),
        ingredients=items,
        allergens_detected=sorted(all_allergens),
        dietary_flags=sorted(all_dietary),
        verification_required_count=verification_count,
        source_uncertain_count=source_uncertain_count,
    )


@router.post("/compare", response_model=CompareResponse)
async def compare_ingredients(
    request: CompareRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Compare catalog stored ingredients vs OCR-scanned ingredients.
    Shows matching, additional (in OCR but not catalog), missing (in catalog but not OCR), and uncertain items.
    Never silently overwrites catalog data.
    """
    try:
        product_id = uuid.UUID(request.product_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid product ID format")

    stmt = select(Product).where(Product.id == product_id)
    product = (await db.execute(stmt)).scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Get catalog ingredients
    catalog_ingredients = []
    if product.product_ingredients:
        for pi in product.product_ingredients:
            catalog_ingredients.append(pi.normalized_name or pi.raw_name)

    # Normalize both lists for comparison
    catalog_normalized = {normalize_for_comparison(c): c for c in catalog_ingredients}
    ocr_normalized = {normalize_for_comparison(o): o for o in request.ocr_ingredients}

    matching: List[ComparisonItem] = []
    additional: List[ComparisonItem] = []
    missing: List[ComparisonItem] = []
    uncertain: List[ComparisonItem] = []

    # Find matches and missing
    for norm_key, original in catalog_normalized.items():
        if norm_key in ocr_normalized:
            matching.append(ComparisonItem(
                name=original,
                status="matching",
                catalog_name=original,
                ocr_name=ocr_normalized[norm_key],
                confidence=1.0,
            ))
        else:
            # Check for partial/fuzzy match
            found_fuzzy = False
            for ocr_key, ocr_original in ocr_normalized.items():
                if norm_key in ocr_key or ocr_key in norm_key:
                    uncertain.append(ComparisonItem(
                        name=original,
                        status="uncertain",
                        catalog_name=original,
                        ocr_name=ocr_original,
                        confidence=0.6,
                    ))
                    found_fuzzy = True
                    break
            if not found_fuzzy:
                missing.append(ComparisonItem(
                    name=original,
                    status="missing",
                    catalog_name=original,
                    confidence=0.0,
                ))

    # Find additional (in OCR but not in catalog)
    matched_ocr_keys = {normalize_for_comparison(m.ocr_name) for m in matching if m.ocr_name}
    uncertain_ocr_keys = {normalize_for_comparison(u.ocr_name) for u in uncertain if u.ocr_name}
    for norm_key, original in ocr_normalized.items():
        if norm_key not in catalog_normalized and norm_key not in matched_ocr_keys and norm_key not in uncertain_ocr_keys:
            additional.append(ComparisonItem(
                name=original,
                status="additional",
                ocr_name=original,
                confidence=0.0,
            ))

    total = len(matching) + len(additional) + len(missing) + len(uncertain)
    match_score = len(matching) / max(total, 1)

    return CompareResponse(
        product_id=str(product.id),
        product_name=product.name,
        matching=matching,
        additional=additional,
        missing=missing,
        uncertain=uncertain,
        match_score=round(match_score, 3),
    )


@router.post("/seed-csv", response_model=CSVSeedResponse)
async def seed_from_csv(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Import products from new_products_gtin.csv into the catalog.
    Preserves GTIN/barcodes as strings. Does not invent missing data.
    Uses row-level savepoints so one bad row doesn't abort the whole import.
    """
    content = await file.read()
    text = content.decode("utf-8-sig")  # handle BOM

    reader = csv.DictReader(io.StringIO(text))
    imported = 0
    skipped = 0
    errors: List[str] = []

    for row_num, row in enumerate(reader, start=2):
        try:
            item_name = (row.get("Item_Name") or "").strip()
            brand_name = (row.get("Brand_Name") or "").strip()
            category_name = (row.get("Category") or "").strip()
            gtin = (row.get("GTIN") or "").strip()
            ingredients_raw = (row.get("Ingredients") or "").strip()
            serving_size = (row.get("Serving_Size_g") or "").strip()

            if not item_name:
                skipped += 1
                continue

            # Skip if GTIN not visible / not valid
            if gtin in ("NOT VISIBLE IN PHOTO", ""):
                gtin = None

            # Check for existing product by normalized name
            norm_result = normalize_product_name(item_name)
            norm_name = norm_result["normalized_name"]
            stmt = select(Product).where(Product.normalized_name == norm_name)
            existing = (await db.execute(stmt)).scalars().first()
            if existing:
                # If existing product has no gtin but CSV provides one, update it
                if gtin and not existing.gtin:
                    existing.gtin = gtin
                    existing.barcode = gtin
                    await db.flush()
                skipped += 1
                continue

            # Also check by GTIN to avoid duplicates
            if gtin:
                stmt_gtin = select(Product).where(
                    (Product.gtin == gtin) | (Product.barcode == gtin)
                )
                existing_gtin = (await db.execute(stmt_gtin)).scalars().first()
                if existing_gtin:
                    skipped += 1
                    continue

            # Find or create brand
            brand_obj = None
            if brand_name:
                # Extract base brand (remove parent company in parens)
                brand_base = re.sub(r'\s*\(.*?\)\s*', '', brand_name).strip()
                brand_norm_base = brand_base.lower()

                # Search by normalized_name first, then by name
                stmt_b = select(Brand).where(
                    (Brand.normalized_name == brand_norm_base) | (Brand.name == brand_base)
                )
                brand_obj = (await db.execute(stmt_b)).scalars().first()
                if not brand_obj:
                    brand_obj = Brand(
                        name=brand_base,
                        normalized_name=brand_norm_base,
                        description=f"Brand from CSV import: {brand_name}",
                    )
                    db.add(brand_obj)
                    await db.flush()

            # Find or create category
            cat_obj = None
            if category_name:
                stmt_c = select(ProductCategory).where(ProductCategory.name == category_name)
                cat_obj = (await db.execute(stmt_c)).scalars().first()
                if not cat_obj:
                    cat_obj = ProductCategory(name=category_name, description=f"CSV import category")
                    db.add(cat_obj)
                    await db.flush()

            # Create product
            barcode = gtin  # preserve as string
            product = Product(
                brand_id=brand_obj.id if brand_obj else None,
                name=item_name,
                normalized_name=norm_name,
                category_id=cat_obj.id if cat_obj else None,
                barcode=barcode,
                gtin=gtin,
                serving_size=serving_size if serving_size else None,
                country="India",
                ingredients_raw=ingredients_raw if ingredients_raw else None,
                source_type="csv_import",
                source_name="new_products_gtin.csv",
                confidence=0.85,
                is_active=True,
            )
            db.add(product)
            await db.flush()

            # Add GTIN identifier
            if gtin:
                db.add(ProductIdentifier(
                    product_id=product.id,
                    identifier_type="GTIN",
                    identifier_value=gtin,
                    is_primary=True,
                ))

            # Add allergen statement from ingredients if detectable
            if ingredients_raw:
                # Extract "Contains ..." and "may contain ..." statements
                contains_match = re.search(r'Contains\s+([^.;]+)', ingredients_raw, re.IGNORECASE)
                may_contain_match = re.search(r'may contain\s+([^.;]+)', ingredients_raw, re.IGNORECASE)

                if contains_match:
                    db.add(ProductAllergenStatement(
                        product_id=product.id,
                        statement_type="contains",
                        statement_text=f"Contains {contains_match.group(1).strip()}.",
                        confidence=0.85,
                    ))
                if may_contain_match:
                    db.add(ProductAllergenStatement(
                        product_id=product.id,
                        statement_type="may_contain",
                        statement_text=f"May contain {may_contain_match.group(1).strip()}.",
                        confidence=0.85,
                    ))

            # Add data source
            db.add(ProductDataSource(
                product_id=product.id,
                source_name="new_products_gtin.csv",
                source_type="csv_import",
                reference=f"Row {row_num} from CSV seed file",
                confidence=0.85,
            ))

            # Ingest ingredients via Phase 2 normalization
            if ingredients_raw:
                parsed = parse_ingredient_text(ingredients_raw)
                if parsed:
                    try:
                        await ProductIngredientService.ingest_product_ingredients(
                            db, product_id=product.id, raw_ingredients=parsed,
                        )
                    except Exception as ing_err:
                        errors.append(f"Row {row_num}: ingredient ingestion warning: {str(ing_err)}")

            imported += 1

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            # Expunge any pending state from the failed row to prevent cascade failures
            try:
                await db.rollback()
            except Exception:
                pass

    try:
        await db.commit()
    except Exception as commit_err:
        errors.append(f"Commit error: {str(commit_err)}")
        await db.rollback()

    return CSVSeedResponse(imported=imported, skipped=skipped, errors=errors)
