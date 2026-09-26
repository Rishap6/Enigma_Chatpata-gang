import uuid
from sqlalchemy import Column, String, Text, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class IngredientCategory(Base):
    __tablename__ = "ingredient_categories"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)

    ingredient_maps = sa_relationship("IngredientCategoryMap", back_populates="category", cascade="all, delete-orphan")


class IngredientCategoryMap(Base):
    __tablename__ = "ingredient_category_map"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    ingredient_id = Column(GUID, ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(GUID, ForeignKey("ingredient_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    confidence = Column(Numeric(precision=4, scale=2), default=1.0, nullable=False)
    evidence_id = Column(GUID, ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("ingredient_id", "category_id", name="uq_ingredient_category"),
    )

    ingredient = sa_relationship("Ingredient", back_populates="category_maps")
    category = sa_relationship("IngredientCategory", back_populates="ingredient_maps", lazy="selectin")
    evidence = sa_relationship("Evidence", lazy="selectin")
