import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class IngredientAlias(Base):
    __tablename__ = "ingredient_aliases"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    ingredient_id = Column(GUID, ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    alias = Column(String(255), nullable=False)
    alias_normalized = Column(String(255), index=True, nullable=False)
    alias_type = Column(String(100), nullable=True)  # common_name, label_name, ins_code, e_number, abbreviation, regional_name, scientific_name
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    ingredient = sa_relationship("Ingredient", back_populates="aliases")
