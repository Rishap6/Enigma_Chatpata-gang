import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Integer, Numeric
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class ProductIngredient(Base):
    __tablename__ = "product_ingredients"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_id = Column(GUID, ForeignKey("ingredients.id", ondelete="SET NULL"), nullable=True, index=True)
    raw_name = Column(String(500), nullable=False)  # original label text preserved exactly
    normalized_name = Column(String(255), nullable=True)
    sequence = Column(Integer, nullable=False)
    match_method = Column(String(50), nullable=True)  # exact_canonical, alias, normalized_alias, fuzzy, unresolved
    match_confidence = Column(Numeric(precision=4, scale=3), nullable=True)
    requires_verification = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    product = sa_relationship("Product", back_populates="product_ingredients", lazy="selectin")
    ingredient = sa_relationship("Ingredient", lazy="selectin")
