import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.allergy import AllergyCreate, AllergyUpdate, AllergyResponse
from app.services.allergy_service import AllergyService

router = APIRouter(tags=["Allergies"])


@router.post(
    "/members/{member_id}/allergies",
    response_model=AllergyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_allergy(
    member_id: uuid.UUID,
    allergy_in: AllergyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a declared allergy for a family member."""
    allergy = await AllergyService.add_allergy(db, current_user.id, member_id, allergy_in)
    return AllergyResponse.model_validate(allergy)


@router.get("/members/{member_id}/allergies", response_model=List[AllergyResponse])
async def list_member_allergies(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all allergies for a family member."""
    allergies = await AllergyService.get_member_allergies(db, current_user.id, member_id)
    return [AllergyResponse.model_validate(a) for a in allergies]


@router.put("/allergies/{allergy_id}", response_model=AllergyResponse)
async def update_allergy(
    allergy_id: uuid.UUID,
    allergy_in: AllergyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an allergy name, severity, or notes."""
    allergy = await AllergyService.update_allergy(db, current_user.id, allergy_id, allergy_in)
    return AllergyResponse.model_validate(allergy)


@router.delete("/allergies/{allergy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_allergy(
    allergy_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an allergy."""
    await AllergyService.delete_allergy(db, current_user.id, allergy_id)
    return None
