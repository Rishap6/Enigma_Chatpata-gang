import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.allergy import Allergy
from app.models.family_member import FamilyMember
from app.schemas.allergy import AllergyCreate, AllergyUpdate
from app.services.member_service import MemberService


class AllergyService:
    @staticmethod
    async def get_allergy_with_member(db: AsyncSession, allergy_id: uuid.UUID) -> Optional[Allergy]:
        stmt = (
            select(Allergy)
            .where(Allergy.id == allergy_id)
            .options(selectinload(Allergy.member).selectinload(FamilyMember.family))
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def verify_allergy_owner(db: AsyncSession, user_id: uuid.UUID, allergy_id: uuid.UUID) -> Allergy:
        allergy = await AllergyService.get_allergy_with_member(db, allergy_id)
        if not allergy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allergy not found")
        if allergy.member.family.owner_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access or modify this allergy record",
            )
        return allergy

    @staticmethod
    async def add_allergy(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID, allergy_in: AllergyCreate
    ) -> Allergy:
        await MemberService.verify_member_owner(db, user_id, member_id)
        allergy = Allergy(
            member_id=member_id,
            name=allergy_in.name.strip(),
            severity=allergy_in.severity.lower(),
            notes=allergy_in.notes.strip() if allergy_in.notes else None,
        )
        db.add(allergy)
        await db.commit()
        await db.refresh(allergy)
        return allergy

    @staticmethod
    async def get_member_allergies(db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID) -> List[Allergy]:
        member = await MemberService.verify_member_owner(db, user_id, member_id)
        return list(member.allergies)

    @staticmethod
    async def update_allergy(
        db: AsyncSession, user_id: uuid.UUID, allergy_id: uuid.UUID, allergy_in: AllergyUpdate
    ) -> Allergy:
        allergy = await AllergyService.verify_allergy_owner(db, user_id, allergy_id)
        if allergy_in.name is not None:
            allergy.name = allergy_in.name.strip()
        if allergy_in.severity is not None:
            allergy.severity = allergy_in.severity.lower()
        if allergy_in.notes is not None:
            allergy.notes = allergy_in.notes.strip() if allergy_in.notes else None

        await db.commit()
        await db.refresh(allergy)
        return allergy

    @staticmethod
    async def delete_allergy(db: AsyncSession, user_id: uuid.UUID, allergy_id: uuid.UUID) -> None:
        allergy = await AllergyService.verify_allergy_owner(db, user_id, allergy_id)
        await db.delete(allergy)
        await db.commit()
