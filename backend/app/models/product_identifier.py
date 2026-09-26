import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class ProductIdentifier(Base):
    __tablename__ = "product_identifiers"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    identifier_type = Column(String(50), nullable=False)  # GTIN, EAN13, EAN8, UPC, internal
    identifier_value = Column(String(100), nullable=False, index=True)  # string to preserve leading zeroes
    country = Column(String(50), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("identifier_type", "identifier_value", name="uq_product_identifier_type_val"),
    )

    # Relationship
    product = sa_relationship("Product", back_populates="identifiers", lazy="selectin")
