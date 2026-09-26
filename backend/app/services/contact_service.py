import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.emergency_contact import EmergencyContact
from app.models.family_member import FamilyMember
from app.schemas.contact import EmergencyContactCreate, EmergencyContactUpdate
from app.services.member_service import MemberService


class ContactService:
    @staticmethod
    async def get_contact_with_member(db: AsyncSession, contact_id: uuid.UUID) -> Optional[EmergencyContact]:
        stmt = (
            select(EmergencyContact)
            .where(EmergencyContact.id == contact_id)
            .options(selectinload(EmergencyContact.member).selectinload(FamilyMember.family))
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def verify_contact_owner(
        db: AsyncSession, user_id: uuid.UUID, contact_id: uuid.UUID
    ) -> EmergencyContact:
        contact = await ContactService.get_contact_with_member(db, contact_id)
        if not contact:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency contact not found")
        if contact.member.family.owner_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access or modify this emergency contact",
            )
        return contact

    @staticmethod
    async def add_emergency_contact(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID, contact_in: EmergencyContactCreate
    ) -> EmergencyContact:
        await MemberService.verify_member_owner(db, user_id, member_id)
        contact = EmergencyContact(
            member_id=member_id,
            name=contact_in.name.strip(),
            phone=contact_in.phone.strip() if contact_in.phone else None,
            whatsapp_number=contact_in.whatsapp_number.strip() if contact_in.whatsapp_number else None,
            relationship=contact_in.relationship.strip() if contact_in.relationship else None,
            is_primary=contact_in.is_primary,
        )
        db.add(contact)
        await db.commit()
        await db.refresh(contact)
        return contact

    @staticmethod
    async def get_member_emergency_contacts(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID
    ) -> List[EmergencyContact]:
        member = await MemberService.verify_member_owner(db, user_id, member_id)
        return list(member.emergency_contacts)

    @staticmethod
    async def update_emergency_contact(
        db: AsyncSession, user_id: uuid.UUID, contact_id: uuid.UUID, contact_in: EmergencyContactUpdate
    ) -> EmergencyContact:
        contact = await ContactService.verify_contact_owner(db, user_id, contact_id)
        if contact_in.name is not None:
            contact.name = contact_in.name.strip()
        if contact_in.phone is not None:
            contact.phone = contact_in.phone.strip() if contact_in.phone else None
        if contact_in.whatsapp_number is not None:
            contact.whatsapp_number = contact_in.whatsapp_number.strip() if contact_in.whatsapp_number else None
        if contact_in.relationship is not None:
            contact.relationship = contact_in.relationship.strip() if contact_in.relationship else None
        if contact_in.is_primary is not None:
            contact.is_primary = contact_in.is_primary

        await db.commit()
        await db.refresh(contact)
        return contact

    @staticmethod
    async def delete_emergency_contact(db: AsyncSession, user_id: uuid.UUID, contact_id: uuid.UUID) -> None:
        contact = await ContactService.verify_contact_owner(db, user_id, contact_id)
        await db.delete(contact)
        await db.commit()
