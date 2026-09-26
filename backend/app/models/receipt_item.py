import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Numeric, Integer
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class ReceiptItem(Base):
    __tablename__ = "receipt_items"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    receipt_id = Column(GUID, ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False, index=True)
    line_number = Column(Integer, nullable=False)
    raw_text = Column(Text, nullable=False)
    product_name_raw = Column(String(255), nullable=True)
    product_name_normalized = Column(String(255), nullable=True)
    brand_hint = Column(String(100), nullable=True)
    quantity = Column(Numeric(precision=8, scale=2), default=1.0, nullable=True)
    unit_price = Column(Numeric(precision=10, scale=2), nullable=True)
    total_price = Column(Numeric(precision=10, scale=2), nullable=True)
    currency = Column(String(10), default="INR", nullable=True)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    match_method = Column(String(50), nullable=True)
    match_confidence = Column(Numeric(precision=4, scale=3), nullable=True)
    requires_selection = Column(Boolean, default=False, nullable=False, index=True)
    requires_verification = Column(Boolean, default=False, nullable=False)
    user_corrected = Column(Boolean, default=False, nullable=False)
    candidate_product_ids = Column(Text, nullable=True)  # JSON-encoded array of candidate IDs
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    receipt = sa_relationship("Receipt", back_populates="items")
    product = sa_relationship("Product", lazy="selectin")
