import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    canonical_name = Column(String(255), unique=True, index=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    ingredient_type = Column(String(100), nullable=False)  # basic_ingredient, derived_ingredient, additive, compound, flour, protein, sweetener, emulsifier, preservative, flavoring, color, other
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    aliases = sa_relationship("IngredientAlias", back_populates="ingredient", cascade="all, delete-orphan", lazy="selectin")
    category_maps = sa_relationship("IngredientCategoryMap", back_populates="ingredient", cascade="all, delete-orphan", lazy="selectin")
    allergen_maps = sa_relationship("IngredientAllergenMap", back_populates="ingredient", cascade="all, delete-orphan", lazy="selectin")
    dietary_maps = sa_relationship("IngredientDietaryMap", back_populates="ingredient", cascade="all, delete-orphan", lazy="selectin")
    outgoing_relationships = sa_relationship(
        "IngredientRelationship",
        foreign_keys="[IngredientRelationship.source_ingredient_id]",
        back_populates="source_ingredient",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    incoming_relationships = sa_relationship(
        "IngredientRelationship",
        foreign_keys="[IngredientRelationship.target_ingredient_id]",
        back_populates="target_ingredient",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    sources = sa_relationship("IngredientSource", back_populates="ingredient", cascade="all, delete-orphan", lazy="selectin")
