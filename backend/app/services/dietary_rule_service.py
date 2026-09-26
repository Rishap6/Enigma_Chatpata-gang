import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dietary_rule import DietaryRule
from app.models.family_member import FamilyMember
from app.schemas.dietary_rule import DietaryRuleCreate
from app.services.member_service import MemberService


class DietaryRuleService:
    @staticmethod
    async def get_dietary_rule_with_member(db: AsyncSession, rule_id: uuid.UUID) -> Optional[DietaryRule]:
        stmt = (
            select(DietaryRule)
            .where(DietaryRule.id == rule_id)
            .options(selectinload(DietaryRule.member).selectinload(FamilyMember.family))
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def verify_rule_owner(db: AsyncSession, user_id: uuid.UUID, rule_id: uuid.UUID) -> DietaryRule:
        rule = await DietaryRuleService.get_dietary_rule_with_member(db, rule_id)
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dietary rule not found")
        if rule.member.family.owner_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access or modify this dietary rule",
            )
        return rule

    @staticmethod
    async def add_dietary_rule(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID, rule_in: DietaryRuleCreate
    ) -> DietaryRule:
        await MemberService.verify_member_owner(db, user_id, member_id)
        rule = DietaryRule(
            member_id=member_id,
            rule_type=rule_in.rule_type.strip(),
            rule_value=rule_in.rule_value.strip().lower(),
            label=rule_in.label.strip() if rule_in.label else rule_in.rule_value.strip(),
        )
        db.add(rule)
        await db.commit()
        await db.refresh(rule)
        return rule

    @staticmethod
    async def get_member_dietary_rules(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID
    ) -> List[DietaryRule]:
        member = await MemberService.verify_member_owner(db, user_id, member_id)
        return list(member.dietary_rules)

    @staticmethod
    async def delete_dietary_rule(db: AsyncSession, user_id: uuid.UUID, rule_id: uuid.UUID) -> None:
        rule = await DietaryRuleService.verify_rule_owner(db, user_id, rule_id)
        await db.delete(rule)
        await db.commit()
