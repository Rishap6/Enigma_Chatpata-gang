import uuid
from typing import List, Union
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.member import (
    MemberCreate,
    MemberCreateFull,
    MemberUpdate,
    MemberDetailResponse,
    MemberSummaryResponse,
    FutureEngineMemberRequirements,
)
from app.schemas.allergy import AllergyResponse
from app.schemas.dietary_rule import DietaryRuleResponse
from app.schemas.ingredient_exclusion import IngredientExclusionResponse
from app.schemas.preference import NutritionPreferenceResponse, CustomRuleResponse
from app.schemas.contact import EmergencyContactResponse
from app.schemas.notification import NotificationPreferenceResponse
from app.services.member_service import MemberService

router = APIRouter(tags=["Members"])


def serialize_member_detail(m) -> MemberDetailResponse:
    return MemberDetailResponse(
        id=m.id,
        family_id=m.family_id,
        name=m.name,
        age=m.age,
        avatar=m.avatar,
        relationship=m.relationship,
        notes=m.notes,
        created_at=m.created_at,
        updated_at=m.updated_at,
        allergies=[AllergyResponse.model_validate(a) for a in m.allergies] if m.allergies else [],
        dietary_rules=[DietaryRuleResponse.model_validate(d) for d in m.dietary_rules] if m.dietary_rules else [],
        ingredient_exclusions=[
            IngredientExclusionResponse.model_validate(i) for i in m.ingredient_exclusions
        ] if m.ingredient_exclusions else [],
        nutrition_preferences=[
            NutritionPreferenceResponse.model_validate(p) for p in m.nutrition_preferences
        ] if m.nutrition_preferences else [],
        custom_rules=[CustomRuleResponse.model_validate(c) for c in m.custom_rules] if m.custom_rules else [],
        emergency_contacts=[
            EmergencyContactResponse.model_validate(ec) for ec in m.emergency_contacts
        ] if m.emergency_contacts else [],
        notification_preferences=NotificationPreferenceResponse.model_validate(m.notification_preferences)
        if m.notification_preferences
        else None,
    )


@router.post(
    "/families/{family_id}/members",
    response_model=MemberDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_member(
    family_id: uuid.UUID,
    member_in: Union[MemberCreateFull, MemberCreate],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new family member, supporting either basic creation or full wizard configuration."""
    if isinstance(member_in, MemberCreateFull):
        member = await MemberService.create_member_full(db, current_user.id, family_id, member_in)
    else:
        member = await MemberService.create_member(db, current_user.id, family_id, member_in)
    return serialize_member_detail(member)


@router.get("/families/{family_id}/members", response_model=List[MemberSummaryResponse])
async def list_family_members(
    family_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all members belonging to a family."""
    return await MemberService.get_family_members(db, current_user.id, family_id)


@router.get("/members/{member_id}", response_model=MemberDetailResponse)
async def get_member(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get complete member profile including all rules, allergies, and contacts."""
    member = await MemberService.get_member(db, current_user.id, member_id)
    return serialize_member_detail(member)


@router.put("/members/{member_id}", response_model=MemberDetailResponse)
async def update_member(
    member_id: uuid.UUID,
    member_in: MemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update basic information of a family member."""
    member = await MemberService.update_member(db, current_user.id, member_id, member_in)
    return serialize_member_detail(member)


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a family member and cascade-delete all dependent configurations."""
    await MemberService.delete_member(db, current_user.id, member_id)
    return None


@router.get("/members/{member_id}/future-requirements", response_model=FutureEngineMemberRequirements)
async def get_future_engine_requirements(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Structured requirements export for future Phase 5/6 risk engines."""
    return await MemberService.get_future_requirements(db, current_user.id, member_id)
