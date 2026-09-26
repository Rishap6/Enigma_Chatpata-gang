import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Numeric
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class ProductAlternative(Base):
    __tablename__ = "product_alternatives"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    alternative_product_id = Column(GUID, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)

    alternative_name = Column(String(255), nullable=False)
    alternative_brand = Column(String(255), nullable=True)
    alternative_category = Column(String(100), nullable=True)
    reason = Column(Text, nullable=False)  # e.g. "100% Lactose-Free & Dairy-Free Chocolate"
    target_allergen = Column(String(100), nullable=True)  # "Milk / Lactose", "Peanut", "Wheat / Gluten", etc.
    dietary_tags = Column(String(255), nullable=True)  # "Lactose-Free,Dairy-Free,Vegan"
    health_benefit = Column(Text, nullable=True)
    confidence = Column(Numeric(precision=4, scale=3), default=1.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    product = sa_relationship("Product", foreign_keys=[product_id], backref="alternatives")
    alternative_product = sa_relationship("Product", foreign_keys=[alternative_product_id])
