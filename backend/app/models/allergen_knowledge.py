import uuid
from sqlalchemy import Column, String, Text, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class AllergenKnowledge(Base):
    __tablename__ = "allergens"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)

    ingredient_maps = sa_relationship("IngredientAllergenMap", back_populates="allergen", cascade="all, delete-orphan")


class IngredientAllergenMap(Base):
    __tablename__ = "ingredient_allergen_map"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    ingredient_id = Column(GUID, ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    allergen_id = Column(GUID, ForeignKey("allergens.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(String(100), nullable=False)  # contains, derived_from, associated_with, cross_contact_capable
    confidence = Column(Numeric(precision=4, scale=2), default=1.0, nullable=False)
    evidence_id = Column(GUID, ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("ingredient_id", "allergen_id", "relationship_type", name="uq_ingredient_allergen"),
    )

    ingredient = sa_relationship("Ingredient", back_populates="allergen_maps")
    allergen = sa_relationship("AllergenKnowledge", back_populates="ingredient_maps", lazy="selectin")
    evidence = sa_relationship("Evidence", lazy="selectin")
