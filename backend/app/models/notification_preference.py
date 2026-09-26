import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base, GUID


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    member_id = Column(GUID, ForeignKey("family_members.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    in_app_enabled = Column(Boolean, default=True, nullable=False)
    push_enabled = Column(Boolean, default=True, nullable=False)
    whatsapp_enabled = Column(Boolean, default=False, nullable=False)
    emergency_call_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    member = relationship("FamilyMember", back_populates="notification_preferences")
