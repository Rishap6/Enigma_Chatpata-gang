import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class NotificationPreferenceBase(BaseModel):
    in_app_enabled: bool = Field(default=True, description="Enable in-app notifications")
    push_enabled: bool = Field(default=True, description="Enable push notifications")
    whatsapp_enabled: bool = Field(default=False, description="Enable WhatsApp alerts")
    emergency_call_enabled: bool = Field(default=False, description="Enable emergency call alerts")


class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    emergency_call_enabled: Optional[bool] = None


class NotificationPreferenceResponse(NotificationPreferenceBase):
    id: uuid.UUID
    member_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Phase 9: In-app household notifications
# -------------------------------------------------------------

class ChannelPreviewSchema(BaseModel):
    channel: str
    label: str
    to: str
    message: str


class HouseholdNotificationResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    recipient_member_id: Optional[uuid.UUID] = None
    type: str
    title: str
    message: str
    status: str
    source_type: str
    source_id: Optional[str] = None
    product_id: Optional[uuid.UUID] = None
    receipt_id: Optional[uuid.UUID] = None
    finding_id: Optional[uuid.UUID] = None
    created_at: datetime
    read_at: Optional[datetime] = None
    product_name: Optional[str] = None
    member_name: Optional[str] = None
    action_label: str = "View details"
    action_path: str = "/notifications"
    whatsapp_demo_preview: Optional[ChannelPreviewSchema] = None

    model_config = ConfigDict(from_attributes=True)


class HouseholdNotificationListResponse(BaseModel):
    items: list[HouseholdNotificationResponse]
    total: int


class UnreadCountResponse(BaseModel):
    family_id: uuid.UUID
    unread_count: int


class NotificationGenerateResponse(BaseModel):
    family_id: uuid.UUID
    created_count: int
