import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class NutritionPreferenceBase(BaseModel):
    preference_type: str = Field(..., min_length=1, max_length=100, description="Preference type e.g. reduce_sugar, reduce_sodium")
    preference_value: str = Field(default="true", min_length=1, max_length=255, description="Preference value e.g. true, moderate, strict")


class NutritionPreferenceCreate(NutritionPreferenceBase):
    pass


class NutritionPreferenceResponse(NutritionPreferenceBase):
    id: uuid.UUID
    member_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomRuleBase(BaseModel):
    rule_text: str = Field(..., min_length=1, max_length=1000, description="Raw user-authored food rule")


class CustomRuleCreate(CustomRuleBase):
    pass


class CustomRuleResponse(CustomRuleBase):
    id: uuid.UUID
    member_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
