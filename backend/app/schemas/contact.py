import re
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator


class EmergencyContactBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the emergency contact")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number e.g. +91XXXXXXXXXX")
    whatsapp_number: Optional[str] = Field(None, max_length=50, description="WhatsApp number e.g. +91XXXXXXXXXX")
    relationship: Optional[str] = Field(None, max_length=100, description="Relationship e.g. Mother, Father, Spouse")
    is_primary: bool = Field(default=False, description="Flag indicating if this is primary emergency contact")

    @field_validator("phone", "whatsapp_number")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip() != "":
            cleaned = v.strip()
            # Allow digits, optional leading +, dashes, spaces, parentheses
            if not re.match(r"^(\+)?[0-9\s\-()]{7,25}$", cleaned):
                raise ValueError("Invalid phone number format. Must contain 7-25 digits/valid characters.")
            return cleaned
        return None


class EmergencyContactCreate(EmergencyContactBase):
    pass


class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    whatsapp_number: Optional[str] = Field(None, max_length=50)
    relationship: Optional[str] = Field(None, max_length=100)
    is_primary: Optional[bool] = None

    @field_validator("phone", "whatsapp_number")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip() != "":
            cleaned = v.strip()
            if not re.match(r"^(\+)?[0-9\s\-()]{7,25}$", cleaned):
                raise ValueError("Invalid phone number format. Must contain 7-25 digits/valid characters.")
            return cleaned
        return None


class EmergencyContactResponse(EmergencyContactBase):
    id: uuid.UUID
    member_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
