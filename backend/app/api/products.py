import math
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.user import User
from app.schemas.product import (
    ProductListResponse,
    ProductDetailResponse,
    ProductIngredientResponse,
    ProductDataSourceResponse,
    ProductMatchRequest,
    ProductMatchResponse,
    ProductAnalysisResponse,
    BrandResponse,
    ProductCategoryResponse,
)
from app.services.product_service import ProductService
from app.services.product_matching_service import ProductMatchingService
from app.services.product_analysis_service import ProductAnalysisService

router = APIRouter(prefix="/products", tags=["Product Intelligence"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    page: int = Query(1, ge=1, description="Page number starting at 1"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for product name or barcode"),
    brand: Optional[str] = Query(None, description="Filter by brand name"),
    category: Optional[str] = Query(None, description="Filter by product category name"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Search and filter products with pagination.
    Supports filtering by search query, brand, and category.
    """
    items, total = await ProductService.list_products(
        db, search=search, brand=brand, category=category, page=page, page_size=page_size
    )
    pages = math.ceil(total / page_size) if total > 0 else 1
    return ProductListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("/match", response_model=ProductMatchResponse)
async def match_product(
    request: ProductMatchRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Match product by raw OCR text / label name, brand, or barcode/GTIN.
    Applies multi-signal matching hierarchy:
    1. Exact barcode/GTIN match
    2. Exact product identifier match
    3. Exact normalized product name
    4. Brand + normalized product name
    5. Fuzzy name matching
    6. Candidate list requiring user selection
    """
    return await ProductMatchingService.match_product(
        db, name=request.name, brand=request.brand, barcode=request.barcode
    )


@router.get("/meta/brands", response_model=List[BrandResponse])
async def list_brands(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """List all available product brands."""
    return await ProductService.list_brands(db)


@router.get("/meta/categories", response_model=List[ProductCategoryResponse])
async def list_categories(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """List all available hierarchical product categories."""
    return await ProductService.list_categories(db)


@router.get("/identifier/{identifier_type}/{identifier_value}", response_model=ProductDetailResponse)
async def get_product_by_identifier(
    identifier_type: str,
    identifier_value: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Lookup a product by its standardized identifier (GTIN, EAN13, EAN8, UPC, etc.).
    Preserves leading zeros and performs exact string matching.
    Designed for Phase 4 Barcode Scanner integration.
    """
    product = await ProductService.get_product_by_identifier(
        db, identifier_type=identifier_type, identifier_value=identifier_value
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with {identifier_type} '{identifier_value}' not found",
        )
    return product


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product(
    product_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get complete product details including brand, category, identifiers, raw ingredients, and allergen statements."""
    product = await ProductService.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id '{product_id}' not found",
        )
    return product


@router.get("/{product_id}/analysis", response_model=ProductAnalysisResponse)
async def analyze_product(
    product_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate unified product intelligence profile.
    Integrates product ingredients directly with Phase 2 Ingredient Intelligence:
    - Normalizes raw label ingredients
    - Resolves allergen mappings and category hierarchies
    - Traces hidden derivations (e.g. Sodium Caseinate -> Casein -> Milk)
    - Evaluates ingredient source uncertainty (e.g. INS 471 plant/animal)
    - Produces deterministic product-level confidence and data quality score.
    Contract payload for Phase 6 Family Risk Engine.
    """
    analysis = await ProductAnalysisService.analyze_product(db, product_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id '{product_id}' not found",
        )
    return analysis


@router.get("/{product_id}/ingredients", response_model=List[ProductIngredientResponse])
async def get_product_ingredients(
    product_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get the ordered sequence of ingredients for a product."""
    # Ensure product exists
    product = await ProductService.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id '{product_id}' not found",
        )
    return await ProductService.get_product_ingredients(db, product_id)


@router.get("/{product_id}/sources", response_model=List[ProductDataSourceResponse])
async def get_product_sources(
    product_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get data provenance and source metadata for a product."""
    product = await ProductService.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id '{product_id}' not found",
        )
    return await ProductService.get_product_sources(db, product_id)
