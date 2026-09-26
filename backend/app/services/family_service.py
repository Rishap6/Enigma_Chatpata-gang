import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.family import Family
from app.models.family_member import FamilyMember
from app.models.allergy import Allergy
from app.models.dietary_rule import DietaryRule
from app.models.custom_rule import CustomRule
from app.models.ingredient_exclusion import IngredientExclusion
from app.schemas.family import FamilyCreate, FamilyUpdate, FamilyDashboardResponse, FamilyDashboardStats, FamilyResponse
from app.schemas.member import MemberSummaryResponse


class FamilyService:
    @staticmethod
    async def get_family_by_id(db: AsyncSession, family_id: uuid.UUID) -> Optional[Family]:
        stmt = (
            select(Family)
            .where(Family.id == family_id)
            .options(
                selectinload(Family.members).selectinload(FamilyMember.allergies),
                selectinload(Family.members).selectinload(FamilyMember.dietary_rules),
                selectinload(Family.members).selectinload(FamilyMember.ingredient_exclusions),
                selectinload(Family.members).selectinload(FamilyMember.custom_rules),
                selectinload(Family.members).selectinload(FamilyMember.emergency_contacts),
            )
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def verify_family_owner(db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID) -> Family:
        family = await FamilyService.get_family_by_id(db, family_id)
        if not family:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family not found")
        if family.owner_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access or modify this family",
            )
        return family

    @staticmethod
    async def create_family(db: AsyncSession, user_id: uuid.UUID, family_in: FamilyCreate) -> Family:
        family = Family(
            name=family_in.name.strip(),
            owner_user_id=user_id,
        )
        db.add(family)
        await db.commit()
        await db.refresh(family)
        return family

    @staticmethod
    async def get_user_families(db: AsyncSession, user_id: uuid.UUID) -> List[Family]:
        stmt = (
            select(Family)
            .where(Family.owner_user_id == user_id)
            .options(
                selectinload(Family.members).selectinload(FamilyMember.allergies),
                selectinload(Family.members).selectinload(FamilyMember.dietary_rules),
                selectinload(Family.members).selectinload(FamilyMember.ingredient_exclusions),
                selectinload(Family.members).selectinload(FamilyMember.custom_rules),
                selectinload(Family.members).selectinload(FamilyMember.emergency_contacts),
            )
            .order_by(Family.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def update_family(
        db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID, family_in: FamilyUpdate
    ) -> Family:
        family = await FamilyService.verify_family_owner(db, user_id, family_id)
        family.name = family_in.name.strip()
        await db.commit()
        await db.refresh(family)
        return family

    @staticmethod
    async def delete_family(db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID) -> None:
        family = await FamilyService.verify_family_owner(db, user_id, family_id)
        await db.delete(family)
        await db.commit()

    @staticmethod
    def build_member_summary(m: FamilyMember) -> MemberSummaryResponse:
        allergy_names = [a.name for a in m.allergies] if m.allergies else []
        dietary_names = [d.label or d.rule_value for d in m.dietary_rules] if m.dietary_rules else []
        return MemberSummaryResponse(
            id=m.id,
            family_id=m.family_id,
            name=m.name,
            age=m.age,
            avatar=m.avatar,
            relationship=m.relationship,
            notes=m.notes,
            created_at=m.created_at,
            updated_at=m.updated_at,
            allergy_count=len(m.allergies) if m.allergies else 0,
            dietary_rule_count=len(m.dietary_rules) if m.dietary_rules else 0,
            ingredient_exclusion_count=len(m.ingredient_exclusions) if m.ingredient_exclusions else 0,
            custom_rule_count=len(m.custom_rules) if m.custom_rules else 0,
            emergency_contact_count=len(m.emergency_contacts) if m.emergency_contacts else 0,
            allergies_summary=allergy_names,
            dietary_summary=dietary_names,
        )

    @staticmethod
    async def get_family_dashboard(
        db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID
    ) -> FamilyDashboardResponse:
        family = await FamilyService.verify_family_owner(db, user_id, family_id)
        
        member_summaries = [FamilyService.build_member_summary(m) for m in family.members]
        
        total_allergies = sum(m.allergy_count for m in member_summaries)
        total_dietary = sum(m.dietary_rule_count for m in member_summaries)
        total_custom = sum(m.custom_rule_count for m in member_summaries)
        total_exclusions = sum(m.ingredient_exclusion_count for m in member_summaries)
        
        stats = FamilyDashboardStats(
            total_members=len(family.members),
            total_allergies=total_allergies,
            total_dietary_restrictions=total_dietary,
            total_custom_rules=total_custom,
            total_ingredient_exclusions=total_exclusions,
        )

        return FamilyDashboardResponse(
            family=FamilyResponse.model_validate(family),
            stats=stats,
            members=member_summaries,
        )
