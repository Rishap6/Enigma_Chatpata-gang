import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    owner_user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    family_id = Column(GUID, ForeignKey("families.id", ondelete="SET NULL"), nullable=True, index=True)
    original_filename = Column(String(255), nullable=True)
    storage_path = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    ocr_text = Column(Text, nullable=True)
    processing_status = Column(String(50), default="uploaded", nullable=False, index=True)
    ocr_confidence = Column(Numeric(precision=4, scale=3), nullable=True)
    purchase_date = Column(DateTime(timezone=True), nullable=True)
    subtotal = Column(Numeric(precision=10, scale=2), nullable=True)
    tax = Column(Numeric(precision=10, scale=2), nullable=True)
    total_amount = Column(Numeric(precision=10, scale=2), nullable=True)
    currency = Column(String(10), default="INR", nullable=True)
    image_hash = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    owner = sa_relationship("User", lazy="selectin")
    family = sa_relationship("Family", lazy="selectin")
    items = sa_relationship("ReceiptItem", back_populates="receipt", cascade="all, delete-orphan", lazy="selectin", order_by="ReceiptItem.line_number")
    events = sa_relationship("ReceiptProcessingEvent", back_populates="receipt", cascade="all, delete-orphan", lazy="selectin", order_by="ReceiptProcessingEvent.created_at")
