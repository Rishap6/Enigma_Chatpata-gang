import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class ProductPurchaseHistory(Base):
    __tablename__ = "product_purchase_history"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    family_id = Column(GUID, ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    receipt_id = Column(GUID, ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False, index=True)
    purchase_date = Column(DateTime(timezone=True), nullable=True, index=True)
    
    quantity = Column(Numeric(precision=8, scale=2), default=1.0, nullable=True)
    unit_price = Column(Numeric(precision=10, scale=2), nullable=True)
    total_price = Column(Numeric(precision=10, scale=2), nullable=True)
    match_confidence = Column(Numeric(precision=4, scale=3), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    family = sa_relationship("Family", lazy="selectin")
    product = sa_relationship("Product", lazy="selectin")
    receipt = sa_relationship("Receipt", lazy="selectin")
