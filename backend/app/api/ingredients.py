import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.user import User
from app.schemas.ingredient import (
    IngredientDetailResponse,
    IngredientSearchItem,
    IngredientRelationshipResponse,
    RelationshipTraceResponse,
    NormalizationRequest,
    NormalizationResponse,
    UnifiedIngredientAnalysisRequest,
    UnifiedIngredientAnalysisResponse,
)
from app.services.ingredient_service import IngredientService
from app.services.ingredient_relationship_service import IngredientRelationshipService
from app.services.ingredient_analysis_service import IngredientAnalysisService

router = APIRouter(prefix="/ingredients", tags=["Ingredient Intelligence"])


@router.get("", response_model=List[IngredientDetailResponse])
async def list_ingredients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """List known ingredients with aliases, categories, allergens, and dietary properties."""
    return await IngredientService.list_ingredients(db, skip=skip, limit=limit)


@router.get("/search", response_model=List[IngredientSearchItem])
async def search_ingredients(
    q: str = Query(..., min_length=1, max_length=200, description="Ingredient or alias query"),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Fast search matching canonical names, display names, and normalized aliases."""
    return await IngredientService.search_ingredients(db, query=q, limit=limit)


@router.post("/normalize", response_model=NormalizationResponse)
async def normalize_ingredient_endpoint(
    req: NormalizationRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Normalize raw ingredient text into canonical ingredient using deterministic & fuzzy matching."""
    return await IngredientAnalysisService.normalize(db, req.text)


@router.post("/analyze", response_model=UnifiedIngredientAnalysisResponse)
async def analyze_ingredient_endpoint(
    req: UnifiedIngredientAnalysisRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Perform full structured ingredient analysis: normalization, relationships, categories, allergens, sources, dietary properties, and confidence."""
    return await IngredientAnalysisService.analyze(db, req.text)


@router.get("/{ingredient_id}", response_model=IngredientDetailResponse)
async def get_ingredient_detail(
    ingredient_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get full details for a specific canonical ingredient."""
    ing = await IngredientService.get_ingredient_by_id(db, ingredient_id)
    if not ing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingredient with ID {ingredient_id} not found",
        )
    return ing


@router.get("/{ingredient_id}/relationships", response_model=List[IngredientRelationshipResponse])
async def get_ingredient_relationships(
    ingredient_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get direct outgoing relationships for an ingredient."""
    ing = await IngredientService.get_ingredient_by_id(db, ingredient_id)
    if not ing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingredient with ID {ingredient_id} not found",
        )
    return await IngredientRelationshipService.get_direct_relationships(db, ingredient_id)


@router.get("/{ingredient_id}/trace", response_model=RelationshipTraceResponse)
async def trace_ingredient_relationships(
    ingredient_id: uuid.UUID,
    max_depth: int = Query(5, ge=1, le=10),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Recursively traverse ingredient relationships with cycle protection."""
    ing = await IngredientService.get_ingredient_by_id(db, ingredient_id)
    if not ing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingredient with ID {ingredient_id} not found",
        )
    return await IngredientRelationshipService.trace_relationships(db, ingredient_id, max_depth=max_depth)


@router.get("/{ingredient_id}/sources")
async def get_ingredient_sources(
    ingredient_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get source intelligence (plant, animal, mineral, etc.) including uncertainty."""
    ing = await IngredientService.get_ingredient_by_id(db, ingredient_id)
    if not ing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingredient with ID {ingredient_id} not found",
        )
    return await IngredientService.get_sources(db, ingredient_id)


@router.get("/{ingredient_id}/allergens")
async def get_ingredient_allergens(
    ingredient_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get direct and derived allergen mappings."""
    ing = await IngredientService.get_ingredient_by_id(db, ingredient_id)
    if not ing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingredient with ID {ingredient_id} not found",
        )
    return await IngredientService.get_allergens(db, ingredient_id)


@router.get("/{ingredient_id}/dietary-properties")
async def get_ingredient_dietary_properties(
    ingredient_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get dietary properties (vegetarian, vegan, animal-derived status) with uncertainty."""
    ing = await IngredientService.get_ingredient_by_id(db, ingredient_id)
    if not ing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingredient with ID {ingredient_id} not found",
        )
    return await IngredientService.get_dietary_properties(db, ingredient_id)
