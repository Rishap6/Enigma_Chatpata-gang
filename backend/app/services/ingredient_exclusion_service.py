import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ingredient_exclusion import IngredientExclusion
from app.models.family_member import FamilyMember
from app.schemas.ingredient_exclusion import IngredientExclusionCreate
from app.services.member_service import MemberService


class IngredientExclusionService:
    @staticmethod
    async def get_exclusion_with_member(db: AsyncSession, exclusion_id: uuid.UUID) -> Optional[IngredientExclusion]:
        stmt = (
            select(IngredientExclusion)
            .where(IngredientExclusion.id == exclusion_id)
            .options(selectinload(IngredientExclusion.member).selectinload(FamilyMember.family))
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def verify_exclusion_owner(
        db: AsyncSession, user_id: uuid.UUID, exclusion_id: uuid.UUID
    ) -> IngredientExclusion:
        exclusion = await IngredientExclusionService.get_exclusion_with_member(db, exclusion_id)
        if not exclusion:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient exclusion not found")
        if exclusion.member.family.owner_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access or modify this ingredient exclusion",
            )
        return exclusion

    @staticmethod
    async def add_ingredient_exclusion(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID, exclusion_in: IngredientExclusionCreate
    ) -> IngredientExclusion:
        await MemberService.verify_member_owner(db, user_id, member_id)
        exclusion = IngredientExclusion(
            member_id=member_id,
            ingredient_name=exclusion_in.ingredient_name.strip(),
            reason=exclusion_in.reason.strip() if exclusion_in.reason else None,
        )
        db.add(exclusion)
        await db.commit()
        await db.refresh(exclusion)
        return exclusion

    @staticmethod
    async def get_member_ingredient_exclusions(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID
    ) -> List[IngredientExclusion]:
        member = await MemberService.verify_member_owner(db, user_id, member_id)
        return list(member.ingredient_exclusions)

    @staticmethod
    async def delete_ingredient_exclusion(db: AsyncSession, user_id: uuid.UUID, exclusion_id: uuid.UUID) -> None:
        exclusion = await IngredientExclusionService.verify_exclusion_owner(db, user_id, exclusion_id)
        await db.delete(exclusion)
        await db.commit()
