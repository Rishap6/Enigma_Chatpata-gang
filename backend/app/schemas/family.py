import uuid
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.member import MemberSummaryResponse


class FamilyBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Family or household name, e.g. 'Khatri Family'")


class FamilyCreate(FamilyBase):
    pass


class FamilyUpdate(FamilyBase):
    pass


class FamilyResponse(FamilyBase):
    id: uuid.UUID
    owner_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FamilyDetailResponse(FamilyBase):
    id: uuid.UUID
    owner_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    members: List[MemberSummaryResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class FamilyDashboardStats(BaseModel):
    total_members: int = 0
    total_allergies: int = 0
    total_dietary_restrictions: int = 0
    total_custom_rules: int = 0
    total_ingredient_exclusions: int = 0


class FamilyDashboardResponse(BaseModel):
    family: FamilyResponse
    stats: FamilyDashboardStats
    members: List[MemberSummaryResponse]
