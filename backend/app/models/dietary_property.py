import uuid
from sqlalchemy import Column, String, Text, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class DietaryProperty(Base):
    __tablename__ = "dietary_properties"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)

    ingredient_maps = sa_relationship("IngredientDietaryMap", back_populates="dietary_property", cascade="all, delete-orphan")


class IngredientDietaryMap(Base):
    __tablename__ = "ingredient_dietary_map"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    ingredient_id = Column(GUID, ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    dietary_property_id = Column(GUID, ForeignKey("dietary_properties.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), nullable=False)  # 'compatible', 'incompatible', 'uncertain'
    confidence = Column(Numeric(precision=4, scale=2), default=1.0, nullable=False)
    evidence_id = Column(GUID, ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("ingredient_id", "dietary_property_id", name="uq_ingredient_dietary"),
    )

    ingredient = sa_relationship("Ingredient", back_populates="dietary_maps")
    dietary_property = sa_relationship("DietaryProperty", back_populates="ingredient_maps", lazy="selectin")
    evidence = sa_relationship("Evidence", lazy="selectin")
