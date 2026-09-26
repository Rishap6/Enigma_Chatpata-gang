import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class IngredientExclusionBase(BaseModel):
    ingredient_name: str = Field(..., min_length=1, max_length=255, description="Name of excluded ingredient")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for exclusion")


class IngredientExclusionCreate(IngredientExclusionBase):
    pass


class IngredientExclusionResponse(IngredientExclusionBase):
    id: uuid.UUID
    member_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
