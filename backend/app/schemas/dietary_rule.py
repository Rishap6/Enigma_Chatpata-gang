import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class DietaryRuleBase(BaseModel):
    rule_type: str = Field(default="dietary", min_length=1, max_length=100, description="Type of rule, e.g. dietary")
    rule_value: str = Field(..., min_length=1, max_length=100, description="Machine-readable rule value e.g. vegetarian, vegan, gluten_free")
    label: Optional[str] = Field(None, max_length=255, description="Display label e.g. Vegetarian")


class DietaryRuleCreate(DietaryRuleBase):
    pass


class DietaryRuleResponse(DietaryRuleBase):
    id: uuid.UUID
    member_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
