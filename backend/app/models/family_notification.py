import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, GUID


class FamilyNotification(Base):
    """In-app household alert tied to risk findings or historical patterns."""

    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint("family_id", "dedupe_key", name="uq_notifications_family_dedupe"),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    family_id = Column(GUID, ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_member_id = Column(
        GUID, ForeignKey("family_members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="unread", index=True)
    source_type = Column(String(50), nullable=False)
    source_id = Column(String(255), nullable=True)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    receipt_id = Column(GUID, ForeignKey("receipts.id", ondelete="SET NULL"), nullable=True, index=True)
    finding_id = Column(GUID, ForeignKey("risk_findings.id", ondelete="SET NULL"), nullable=True, index=True)
    dedupe_key = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    family = relationship("Family", lazy="selectin")
    recipient_member = relationship("FamilyMember", lazy="selectin")
    product = relationship("Product", lazy="selectin")
