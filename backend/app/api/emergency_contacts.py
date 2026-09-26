import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.contact import (
    EmergencyContactCreate,
    EmergencyContactUpdate,
    EmergencyContactResponse,
)
from app.services.contact_service import ContactService

router = APIRouter(tags=["Emergency Contacts"])


@router.post(
    "/members/{member_id}/emergency-contacts",
    response_model=EmergencyContactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_emergency_contact(
    member_id: uuid.UUID,
    contact_in: EmergencyContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Configure an emergency safety contact for a member."""
    contact = await ContactService.add_emergency_contact(
        db, current_user.id, member_id, contact_in
    )
    return EmergencyContactResponse.model_validate(contact)


@router.get(
    "/members/{member_id}/emergency-contacts",
    response_model=List[EmergencyContactResponse],
)
async def list_member_emergency_contacts(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all emergency contacts for a member."""
    contacts = await ContactService.get_member_emergency_contacts(
        db, current_user.id, member_id
    )
    return [EmergencyContactResponse.model_validate(c) for c in contacts]


@router.put("/emergency-contacts/{id}", response_model=EmergencyContactResponse)
async def update_emergency_contact(
    id: uuid.UUID,
    contact_in: EmergencyContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an emergency contact's details."""
    contact = await ContactService.update_emergency_contact(
        db, current_user.id, id, contact_in
    )
    return EmergencyContactResponse.model_validate(contact)


@router.delete("/emergency-contacts/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_emergency_contact(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an emergency contact."""
    await ContactService.delete_emergency_contact(db, current_user.id, id)
    return None
