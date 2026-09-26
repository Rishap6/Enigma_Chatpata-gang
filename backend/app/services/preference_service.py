import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.nutrition_preference import NutritionPreference
from app.models.custom_rule import CustomRule
from app.models.family_member import FamilyMember
from app.schemas.preference import NutritionPreferenceCreate, CustomRuleCreate
from app.services.member_service import MemberService


class PreferenceService:
    # --- Nutrition Preferences ---
    @staticmethod
    async def get_preference_with_member(db: AsyncSession, pref_id: uuid.UUID) -> Optional[NutritionPreference]:
        stmt = (
            select(NutritionPreference)
            .where(NutritionPreference.id == pref_id)
            .options(selectinload(NutritionPreference.member).selectinload(FamilyMember.family))
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def verify_preference_owner(
        db: AsyncSession, user_id: uuid.UUID, pref_id: uuid.UUID
    ) -> NutritionPreference:
        pref = await PreferenceService.get_preference_with_member(db, pref_id)
        if not pref:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nutrition preference not found")
        if pref.member.family.owner_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access or modify this nutrition preference",
            )
        return pref

    @staticmethod
    async def add_nutrition_preference(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID, pref_in: NutritionPreferenceCreate
    ) -> NutritionPreference:
        await MemberService.verify_member_owner(db, user_id, member_id)
        pref = NutritionPreference(
            member_id=member_id,
            preference_type=pref_in.preference_type.strip().lower(),
            preference_value=pref_in.preference_value.strip().lower(),
        )
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
        return pref

    @staticmethod
    async def get_member_nutrition_preferences(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID
    ) -> List[NutritionPreference]:
        member = await MemberService.verify_member_owner(db, user_id, member_id)
        return list(member.nutrition_preferences)

    @staticmethod
    async def delete_nutrition_preference(db: AsyncSession, user_id: uuid.UUID, pref_id: uuid.UUID) -> None:
        pref = await PreferenceService.verify_preference_owner(db, user_id, pref_id)
        await db.delete(pref)
        await db.commit()

    # --- Custom Rules ---
    @staticmethod
    async def get_custom_rule_with_member(db: AsyncSession, rule_id: uuid.UUID) -> Optional[CustomRule]:
        stmt = (
            select(CustomRule)
            .where(CustomRule.id == rule_id)
            .options(selectinload(CustomRule.member).selectinload(FamilyMember.family))
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def verify_custom_rule_owner(
        db: AsyncSession, user_id: uuid.UUID, rule_id: uuid.UUID
    ) -> CustomRule:
        rule = await PreferenceService.get_custom_rule_with_member(db, rule_id)
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom rule not found")
        if rule.member.family.owner_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access or modify this custom rule",
            )
        return rule

    @staticmethod
    async def add_custom_rule(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID, rule_in: CustomRuleCreate
    ) -> CustomRule:
        await MemberService.verify_member_owner(db, user_id, member_id)
        rule = CustomRule(
            member_id=member_id,
            rule_text=rule_in.rule_text.strip(),
        )
        db.add(rule)
        await db.commit()
        await db.refresh(rule)
        return rule

    @staticmethod
    async def get_member_custom_rules(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID
    ) -> List[CustomRule]:
        member = await MemberService.verify_member_owner(db, user_id, member_id)
        return list(member.custom_rules)

    @staticmethod
    async def delete_custom_rule(db: AsyncSession, user_id: uuid.UUID, rule_id: uuid.UUID) -> None:
        rule = await PreferenceService.verify_custom_rule_owner(db, user_id, rule_id)
        await db.delete(rule)
        await db.commit()
