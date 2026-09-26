import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

AllergySeverity = Literal["mild", "moderate", "severe"]


class AllergyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the allergy")
    severity: AllergySeverity = Field(..., description="Severity of the allergy: mild, moderate, severe")
    notes: Optional[str] = Field(None, max_length=1000, description="Optional notes or reaction history")


class AllergyCreate(AllergyBase):
    pass


class AllergyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    severity: Optional[AllergySeverity] = None
    notes: Optional[str] = Field(None, max_length=1000)


class AllergyResponse(AllergyBase):
    id: uuid.UUID
    member_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
