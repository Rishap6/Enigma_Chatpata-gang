import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.allergy import AllergyCreate, AllergyResponse
from app.schemas.dietary_rule import DietaryRuleCreate, DietaryRuleResponse
from app.schemas.ingredient_exclusion import IngredientExclusionCreate, IngredientExclusionResponse
from app.schemas.preference import (
    NutritionPreferenceCreate,
    NutritionPreferenceResponse,
    CustomRuleCreate,
    CustomRuleResponse,
)
from app.schemas.contact import EmergencyContactCreate, EmergencyContactResponse
from app.schemas.notification import NotificationPreferenceBase, NotificationPreferenceResponse


class MemberBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Full name or nickname of the family member")
    age: Optional[int] = Field(None, ge=0, le=150, description="Age in years (non-negative, sensible maximum)")
    avatar: Optional[str] = Field(None, max_length=500, description="Avatar image URL or identifier")
    relationship: Optional[str] = Field(None, max_length=100, description="Relationship e.g. Father, Mother, Son, Self")
    notes: Optional[str] = Field(None, max_length=2000, description="General notes about the member")


class MemberCreate(MemberBase):
    pass


class MemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    age: Optional[int] = Field(None, ge=0, le=150)
    avatar: Optional[str] = Field(None, max_length=500)
    relationship: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=2000)


# Composite creation schema for the wizard flow
class MemberCreateFull(MemberBase):
    allergies: List[AllergyCreate] = Field(default_factory=list)
    dietary_rules: List[DietaryRuleCreate] = Field(default_factory=list)
    ingredient_exclusions: List[IngredientExclusionCreate] = Field(default_factory=list)
    nutrition_preferences: List[NutritionPreferenceCreate] = Field(default_factory=list)
    custom_rules: List[CustomRuleCreate] = Field(default_factory=list)
    emergency_contacts: List[EmergencyContactCreate] = Field(default_factory=list)
    notification_preferences: Optional[NotificationPreferenceBase] = None


class MemberSummaryResponse(MemberBase):
    id: uuid.UUID
    family_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    allergy_count: int = 0
    dietary_rule_count: int = 0
    ingredient_exclusion_count: int = 0
    custom_rule_count: int = 0
    emergency_contact_count: int = 0
    # Quick tags for easy UI preview
    allergies_summary: List[str] = Field(default_factory=list)
    dietary_summary: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class MemberDetailResponse(MemberBase):
    id: uuid.UUID
    family_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    allergies: List[AllergyResponse] = Field(default_factory=list)
    dietary_rules: List[DietaryRuleResponse] = Field(default_factory=list)
    ingredient_exclusions: List[IngredientExclusionResponse] = Field(default_factory=list)
    nutrition_preferences: List[NutritionPreferenceResponse] = Field(default_factory=list)
    custom_rules: List[CustomRuleResponse] = Field(default_factory=list)
    emergency_contacts: List[EmergencyContactResponse] = Field(default_factory=list)
    notification_preferences: Optional[NotificationPreferenceResponse] = None

    model_config = ConfigDict(from_attributes=True)


# Future engine consumed format
class FutureEngineMemberRequirements(BaseModel):
    member_id: uuid.UUID
    name: str
    allergies: List[dict]
    dietary_rules: List[str]
    ingredient_exclusions: List[str]
    nutrition_preferences: List[str]
    custom_rules: List[str]
    emergency_contacts: List[dict]
