import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.preference import (
    NutritionPreferenceCreate,
    NutritionPreferenceResponse,
    CustomRuleCreate,
    CustomRuleResponse,
)
from app.services.preference_service import PreferenceService

router = APIRouter(tags=["Preferences & Custom Rules"])


# --- Nutrition Preferences ---
@router.post(
    "/members/{member_id}/nutrition-preferences",
    response_model=NutritionPreferenceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_nutrition_preference(
    member_id: uuid.UUID,
    pref_in: NutritionPreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a nutrition preference for a member."""
    pref = await PreferenceService.add_nutrition_preference(db, current_user.id, member_id, pref_in)
    return NutritionPreferenceResponse.model_validate(pref)


@router.get(
    "/members/{member_id}/nutrition-preferences",
    response_model=List[NutritionPreferenceResponse],
)
async def list_member_nutrition_preferences(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all nutrition preferences for a member."""
    prefs = await PreferenceService.get_member_nutrition_preferences(db, current_user.id, member_id)
    return [NutritionPreferenceResponse.model_validate(p) for p in prefs]


@router.delete("/nutrition-preferences/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nutrition_preference(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a nutrition preference."""
    await PreferenceService.delete_nutrition_preference(db, current_user.id, id)
    return None


# --- Custom Rules ---
@router.post(
    "/members/{member_id}/custom-rules",
    response_model=CustomRuleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_custom_rule(
    member_id: uuid.UUID,
    rule_in: CustomRuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a raw user-authored food rule for a member."""
    rule = await PreferenceService.add_custom_rule(db, current_user.id, member_id, rule_in)
    return CustomRuleResponse.model_validate(rule)


@router.get(
    "/members/{member_id}/custom-rules",
    response_model=List[CustomRuleResponse],
)
async def list_member_custom_rules(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all custom rules for a member."""
    rules = await PreferenceService.get_member_custom_rules(db, current_user.id, member_id)
    return [CustomRuleResponse.model_validate(r) for r in rules]


@router.delete("/custom-rules/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_rule(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a custom rule."""
    await PreferenceService.delete_custom_rule(db, current_user.id, id)
    return None
