import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.ingredient_exclusion import (
    IngredientExclusionCreate,
    IngredientExclusionResponse,
)
from app.services.ingredient_exclusion_service import IngredientExclusionService

router = APIRouter(tags=["Ingredient Exclusions"])


@router.post(
    "/members/{member_id}/ingredient-exclusions",
    response_model=IngredientExclusionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_ingredient_exclusion(
    member_id: uuid.UUID,
    exclusion_in: IngredientExclusionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add an ingredient exclusion for a member."""
    exclusion = await IngredientExclusionService.add_ingredient_exclusion(
        db, current_user.id, member_id, exclusion_in
    )
    return IngredientExclusionResponse.model_validate(exclusion)


@router.get(
    "/members/{member_id}/ingredient-exclusions",
    response_model=List[IngredientExclusionResponse],
)
async def list_member_ingredient_exclusions(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all ingredient exclusions for a member."""
    exclusions = await IngredientExclusionService.get_member_ingredient_exclusions(
        db, current_user.id, member_id
    )
    return [IngredientExclusionResponse.model_validate(e) for e in exclusions]


@router.delete("/ingredient-exclusions/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingredient_exclusion(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an ingredient exclusion."""
    await IngredientExclusionService.delete_ingredient_exclusion(db, current_user.id, id)
    return None
