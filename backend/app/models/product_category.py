import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class ProductCategory(Base):
    __tablename__ = "product_categories"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    parent_category_id = Column(GUID, ForeignKey("product_categories.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    parent_category = sa_relationship("ProductCategory", remote_side=[id], back_populates="subcategories", lazy="selectin")
    subcategories = sa_relationship("ProductCategory", back_populates="parent_category", lazy="selectin")
    products = sa_relationship("Product", back_populates="category", lazy="selectin")
