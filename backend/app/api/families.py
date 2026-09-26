import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.family import (
    FamilyCreate,
    FamilyUpdate,
    FamilyResponse,
    FamilyDetailResponse,
    FamilyDashboardResponse,
)
from app.services.family_service import FamilyService

router = APIRouter(prefix="/families", tags=["Families"])


@router.post("", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
async def create_family(
    family_in: FamilyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new family household for the authenticated user."""
    family = await FamilyService.create_family(db, current_user.id, family_in)
    return FamilyResponse.model_validate(family)


@router.get("", response_model=List[FamilyResponse])
async def list_families(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all families owned by the authenticated user."""
    families = await FamilyService.get_user_families(db, current_user.id)
    return [FamilyResponse.model_validate(f) for f in families]


@router.get("/{family_id}", response_model=FamilyDetailResponse)
async def get_family(
    family_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a family and its member summary by family ID."""
    family = await FamilyService.verify_family_owner(db, current_user.id, family_id)
    member_summaries = [FamilyService.build_member_summary(m) for m in family.members]
    return FamilyDetailResponse(
        id=family.id,
        name=family.name,
        owner_user_id=family.owner_user_id,
        created_at=family.created_at,
        updated_at=family.updated_at,
        members=member_summaries,
    )


@router.get("/{family_id}/dashboard", response_model=FamilyDashboardResponse)
async def get_family_dashboard(
    family_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get family food safety dashboard summary including metrics and alerts."""
    return await FamilyService.get_family_dashboard(db, current_user.id, family_id)


@router.put("/{family_id}", response_model=FamilyResponse)
async def update_family(
    family_id: uuid.UUID,
    family_in: FamilyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update family name."""
    family = await FamilyService.update_family(db, current_user.id, family_id, family_in)
    return FamilyResponse.model_validate(family)


@router.delete("/{family_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_family(
    family_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a family and all associated members and configurations."""
    await FamilyService.delete_family(db, current_user.id, family_id)
    return None
