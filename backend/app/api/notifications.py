import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.notification import (
    NotificationPreferenceUpdate,
    NotificationPreferenceResponse,
    HouseholdNotificationListResponse,
    HouseholdNotificationResponse,
    UnreadCountResponse,
    NotificationGenerateResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(tags=["Notifications"])


@router.get(
    "/members/{member_id}/notification-preferences",
    response_model=NotificationPreferenceResponse,
)
async def get_notification_preferences(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get alert and notification preference settings for a member."""
    pref = await NotificationService.get_or_create_notification_preferences(
        db, current_user.id, member_id
    )
    return NotificationPreferenceResponse.model_validate(pref)


@router.put(
    "/members/{member_id}/notification-preferences",
    response_model=NotificationPreferenceResponse,
)
async def update_notification_preferences(
    member_id: uuid.UUID,
    notif_in: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update alert and notification channels for a member."""
    pref = await NotificationService.update_notification_preferences(
        db, current_user.id, member_id, notif_in
    )
    return NotificationPreferenceResponse.model_validate(pref)


@router.get("/notifications", response_model=HouseholdNotificationListResponse)
async def list_household_notifications(
    family_id: uuid.UUID = Query(..., description="Family scope for notifications"),
    status: Optional[str] = Query(None, description="Filter: unread or read"),
    notification_type: Optional[str] = Query(None, alias="type", description="Notification type filter"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await NotificationService.list_notifications(
        db,
        current_user.id,
        family_id,
        status_filter=status,
        type_filter=notification_type,
        limit=limit,
        offset=offset,
    )
    return HouseholdNotificationListResponse(items=items, total=total)


@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
async def get_unread_notification_count(
    family_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await NotificationService.unread_count(db, current_user.id, family_id)
    return UnreadCountResponse(family_id=family_id, unread_count=count)


@router.get("/notifications/{notification_id}", response_model=HouseholdNotificationResponse)
async def get_household_notification(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await NotificationService.get_notification(db, current_user.id, notification_id)


@router.put("/notifications/{notification_id}/read", response_model=HouseholdNotificationResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await NotificationService.mark_read(db, current_user.id, notification_id)


@router.put("/notifications/read-all")
async def mark_all_notifications_read(
    family_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated = await NotificationService.mark_all_read(db, current_user.id, family_id)
    return {"family_id": str(family_id), "marked_read": updated}


@router.post("/notifications/generate", response_model=NotificationGenerateResponse)
async def generate_notifications(
    family_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate recurring-pattern notifications (deduplicated). Does not re-run risk analysis."""
    created = await NotificationService.generate_for_family(db, current_user.id, family_id)
    return NotificationGenerateResponse(family_id=family_id, created_count=created)
