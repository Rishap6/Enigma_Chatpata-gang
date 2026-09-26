import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class ProductAllergenStatement(Base):
    __tablename__ = "product_allergen_statements"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    statement_type = Column(String(50), nullable=False)  # contains, may_contain, manufactured_in_facility, cross_contact, unknown
    statement_text = Column(String(500), nullable=False)
    confidence = Column(Numeric(precision=4, scale=3), default=1.0, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship
    product = sa_relationship("Product", back_populates="allergen_statements", lazy="selectin")
