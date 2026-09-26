import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.family import Family
from app.models.family_member import FamilyMember
from app.models.allergy import Allergy
from app.models.dietary_rule import DietaryRule
from app.models.ingredient_exclusion import IngredientExclusion
from app.models.nutrition_preference import NutritionPreference
from app.models.custom_rule import CustomRule
from app.models.emergency_contact import EmergencyContact
from app.models.notification_preference import NotificationPreference
from app.schemas.member import (
    MemberCreate,
    MemberUpdate,
    MemberCreateFull,
    MemberDetailResponse,
    MemberSummaryResponse,
    FutureEngineMemberRequirements,
)
from app.services.family_service import FamilyService


class MemberService:
    @staticmethod
    async def get_member_raw(db: AsyncSession, member_id: uuid.UUID) -> Optional[FamilyMember]:
        stmt = (
            select(FamilyMember)
            .where(FamilyMember.id == member_id)
            .options(
                selectinload(FamilyMember.family),
                selectinload(FamilyMember.allergies),
                selectinload(FamilyMember.dietary_rules),
                selectinload(FamilyMember.ingredient_exclusions),
                selectinload(FamilyMember.nutrition_preferences),
                selectinload(FamilyMember.custom_rules),
                selectinload(FamilyMember.emergency_contacts),
                selectinload(FamilyMember.notification_preferences),
            )
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def verify_member_owner(db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID) -> FamilyMember:
        member = await MemberService.get_member_raw(db, member_id)
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found")
        if member.family.owner_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access or modify this family member",
            )
        return member

    @staticmethod
    async def create_member(
        db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID, member_in: MemberCreate
    ) -> FamilyMember:
        await FamilyService.verify_family_owner(db, user_id, family_id)
        
        member = FamilyMember(
            family_id=family_id,
            name=member_in.name.strip(),
            age=member_in.age,
            avatar=member_in.avatar,
            relationship=member_in.relationship.strip() if member_in.relationship else None,
            notes=member_in.notes.strip() if member_in.notes else None,
        )
        db.add(member)
        await db.flush()

        # Create default notification preference
        notif_pref = NotificationPreference(
            member_id=member.id,
            in_app_enabled=True,
            push_enabled=True,
            whatsapp_enabled=False,
            emergency_call_enabled=False,
        )
        db.add(notif_pref)
        await db.commit()
        await db.refresh(member)
        return await MemberService.get_member_raw(db, member.id)

    @staticmethod
    async def create_member_full(
        db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID, member_in: MemberCreateFull
    ) -> FamilyMember:
        await FamilyService.verify_family_owner(db, user_id, family_id)

        member = FamilyMember(
            family_id=family_id,
            name=member_in.name.strip(),
            age=member_in.age,
            avatar=member_in.avatar,
            relationship=member_in.relationship.strip() if member_in.relationship else None,
            notes=member_in.notes.strip() if member_in.notes else None,
        )
        db.add(member)
        await db.flush()

        # Add initial allergies
        for a in member_in.allergies:
            db.add(
                Allergy(
                    member_id=member.id,
                    name=a.name.strip(),
                    severity=a.severity.lower(),
                    notes=a.notes.strip() if a.notes else None,
                )
            )

        # Add dietary rules
        for d in member_in.dietary_rules:
            db.add(
                DietaryRule(
                    member_id=member.id,
                    rule_type=d.rule_type.strip(),
                    rule_value=d.rule_value.strip().lower(),
                    label=d.label.strip() if d.label else d.rule_value.strip(),
                )
            )

        # Add ingredient exclusions
        for i in member_in.ingredient_exclusions:
            db.add(
                IngredientExclusion(
                    member_id=member.id,
                    ingredient_name=i.ingredient_name.strip(),
                    reason=i.reason.strip() if i.reason else None,
                )
            )

        # Add nutrition preferences
        for p in member_in.nutrition_preferences:
            db.add(
                NutritionPreference(
                    member_id=member.id,
                    preference_type=p.preference_type.strip().lower(),
                    preference_value=p.preference_value.strip().lower(),
                )
            )

        # Add custom rules
        for c in member_in.custom_rules:
            db.add(
                CustomRule(
                    member_id=member.id,
                    rule_text=c.rule_text.strip(),
                )
            )

        # Add emergency contacts
        for ec in member_in.emergency_contacts:
            db.add(
                EmergencyContact(
                    member_id=member.id,
                    name=ec.name.strip(),
                    phone=ec.phone.strip() if ec.phone else None,
                    whatsapp_number=ec.whatsapp_number.strip() if ec.whatsapp_number else None,
                    relationship=ec.relationship.strip() if ec.relationship else None,
                    is_primary=ec.is_primary,
                )
            )

        # Add notification preference
        notif_in = member_in.notification_preferences
        notif_pref = NotificationPreference(
            member_id=member.id,
            in_app_enabled=notif_in.in_app_enabled if notif_in else True,
            push_enabled=notif_in.push_enabled if notif_in else True,
            whatsapp_enabled=notif_in.whatsapp_enabled if notif_in else False,
            emergency_call_enabled=notif_in.emergency_call_enabled if notif_in else False,
        )
        db.add(notif_pref)

        await db.commit()
        return await MemberService.get_member_raw(db, member.id)

    @staticmethod
    async def get_family_members(
        db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID
    ) -> List[MemberSummaryResponse]:
        family = await FamilyService.verify_family_owner(db, user_id, family_id)
        return [FamilyService.build_member_summary(m) for m in family.members]

    @staticmethod
    async def get_member(db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID) -> FamilyMember:
        return await MemberService.verify_member_owner(db, user_id, member_id)

    @staticmethod
    async def update_member(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID, member_in: MemberUpdate
    ) -> FamilyMember:
        member = await MemberService.verify_member_owner(db, user_id, member_id)
        
        if member_in.name is not None:
            member.name = member_in.name.strip()
        if member_in.age is not None:
            member.age = member_in.age
        if member_in.avatar is not None:
            member.avatar = member_in.avatar
        if member_in.relationship is not None:
            member.relationship = member_in.relationship.strip() if member_in.relationship else None
        if member_in.notes is not None:
            member.notes = member_in.notes.strip() if member_in.notes else None

        await db.commit()
        await db.refresh(member)
        return await MemberService.get_member_raw(db, member.id)

    @staticmethod
    async def delete_member(db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID) -> None:
        member = await MemberService.verify_member_owner(db, user_id, member_id)
        await db.delete(member)
        await db.commit()

    @staticmethod
    async def get_future_requirements(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID
    ) -> FutureEngineMemberRequirements:
        member = await MemberService.verify_member_owner(db, user_id, member_id)
        return FutureEngineMemberRequirements(
            member_id=member.id,
            name=member.name,
            allergies=[{"name": a.name, "severity": a.severity, "notes": a.notes} for a in member.allergies],
            dietary_rules=[d.rule_value for d in member.dietary_rules],
            ingredient_exclusions=[i.ingredient_name for i in member.ingredient_exclusions],
            nutrition_preferences=[f"{p.preference_type}:{p.preference_value}" for p in member.nutrition_preferences],
            custom_rules=[c.rule_text for c in member.custom_rules],
            emergency_contacts=[
                {
                    "name": ec.name,
                    "relationship": ec.relationship,
                    "phone": ec.phone,
                    "whatsapp_number": ec.whatsapp_number,
                    "is_primary": ec.is_primary,
                }
                for ec in member.emergency_contacts
            ],
        )
