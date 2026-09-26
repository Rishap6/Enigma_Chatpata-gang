from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.family import Family
from app.models.family_member import FamilyMember
from app.models.allergy import Allergy
from app.models.dietary_rule import DietaryRule
from app.models.ingredient_exclusion import IngredientExclusion
from app.models.nutrition_preference import NutritionPreference
from app.models.custom_rule import CustomRule
from app.models.emergency_contact import EmergencyContact
from app.models.notification_preference import NotificationPreference
from app.schemas.family import FamilyResponse

router = APIRouter(prefix="/seed", tags=["Development Seed Data"])


@router.post("", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
async def seed_demo_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Seed optional fictional development demo data for the current authenticated user."""
    # 1. Create Demo Family
    family = Family(
        name="Demo Family",
        owner_user_id=current_user.id,
    )
    db.add(family)
    await db.flush()

    # 2. Member 1: Father
    father = FamilyMember(
        family_id=family.id,
        name="Father",
        age=52,
        relationship="Father",
        notes="Allergic to peanuts and prefers vegetarian options.",
    )
    db.add(father)
    await db.flush()

    db.add(Allergy(member_id=father.id, name="Peanut", severity="severe", notes="Anaphylactic risk. Carries EpiPen."))
    db.add(DietaryRule(member_id=father.id, rule_type="dietary", rule_value="vegetarian", label="Vegetarian"))
    db.add(IngredientExclusion(member_id=father.id, ingredient_name="Gelatin", reason="Animal-derived gelatin"))
    db.add(NutritionPreference(member_id=father.id, preference_type="reduce_sodium", preference_value="true"))
    db.add(CustomRule(member_id=father.id, rule_text="Avoid products containing onion or garlic."))
    db.add(
        EmergencyContact(
            member_id=father.id,
            name="Mother",
            relationship="Spouse",
            phone="+919876543210",
            whatsapp_number="+919876543210",
            is_primary=True,
        )
    )
    db.add(
        NotificationPreference(
            member_id=father.id,
            in_app_enabled=True,
            push_enabled=True,
            whatsapp_enabled=False,
            emergency_call_enabled=True,
        )
    )

    # 3. Member 2: Mother
    mother = FamilyMember(
        family_id=family.id,
        name="Mother",
        age=49,
        relationship="Mother",
        notes="Health conscious, monitoring blood sugar and sodium.",
    )
    db.add(mother)
    await db.flush()

    db.add(NutritionPreference(member_id=mother.id, preference_type="reduce_sugar", preference_value="strict"))
    db.add(NutritionPreference(member_id=mother.id, preference_type="reduce_sodium", preference_value="moderate"))
    db.add(DietaryRule(member_id=mother.id, rule_type="dietary", rule_value="vegetarian", label="Vegetarian"))
    db.add(
        EmergencyContact(
            member_id=mother.id,
            name="Father",
            relationship="Spouse",
            phone="+919876543211",
            whatsapp_number="+919876543211",
            is_primary=True,
        )
    )
    db.add(
        NotificationPreference(
            member_id=mother.id,
            in_app_enabled=True,
            push_enabled=True,
            whatsapp_enabled=False,
            emergency_call_enabled=False,
        )
    )

    # 4. Member 3: Child
    child = FamilyMember(
        family_id=family.id,
        name="Child",
        age=12,
        relationship="Son",
        notes="Lactose intolerance; requires lactose-free dairy alternatives.",
    )
    db.add(child)
    await db.flush()

    db.add(Allergy(member_id=child.id, name="Milk", severity="moderate", notes="Lactose intolerance / milk sensitivity."))
    db.add(DietaryRule(member_id=child.id, rule_type="dietary", rule_value="dairy_free", label="Dairy-free"))
    db.add(
        EmergencyContact(
            member_id=child.id,
            name="Mother",
            relationship="Mother",
            phone="+919876543210",
            whatsapp_number="+919876543210",
            is_primary=True,
        )
    )
    db.add(
        NotificationPreference(
            member_id=child.id,
            in_app_enabled=True,
            push_enabled=True,
            whatsapp_enabled=True,
            emergency_call_enabled=False,
        )
    )

    # 5. Member 4: Grandmother
    grandmother = FamilyMember(
        family_id=family.id,
        name="Grandmother",
        age=76,
        relationship="Grandmother",
        notes="Celiac disease sensitivity; strict gluten avoidance.",
    )
    db.add(grandmother)
    await db.flush()

    db.add(DietaryRule(member_id=grandmother.id, rule_type="dietary", rule_value="gluten_free", label="Gluten-free"))
    db.add(Allergy(member_id=grandmother.id, name="Wheat", severity="severe", notes="Celiac reaction."))
    db.add(CustomRule(member_id=grandmother.id, rule_text="Alert me whenever an ingredient has an animal-derived source."))
    db.add(
        EmergencyContact(
            member_id=grandmother.id,
            name="Father",
            relationship="Son",
            phone="+919876543211",
            whatsapp_number="+919876543211",
            is_primary=True,
        )
    )
    db.add(
        NotificationPreference(
            member_id=grandmother.id,
            in_app_enabled=True,
            push_enabled=True,
            whatsapp_enabled=False,
            emergency_call_enabled=True,
        )
    )

    await db.commit()
    await db.refresh(family)
    return FamilyResponse.model_validate(family)
