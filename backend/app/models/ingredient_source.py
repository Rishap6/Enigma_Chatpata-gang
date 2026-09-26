import uuid
from sqlalchemy import Column, String, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class IngredientSource(Base):
    __tablename__ = "ingredient_sources"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    ingredient_id = Column(GUID, ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type = Column(String(100), nullable=False)  # plant, animal, microbial, synthetic, mineral, milk, egg, fish, shellfish, mixed, unknown
    source_status = Column(String(50), nullable=False)  # known, possible, unknown
    description = Column(Text, nullable=True)
    confidence = Column(Numeric(precision=4, scale=2), default=1.0, nullable=False)
    evidence_id = Column(GUID, ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True)

    ingredient = sa_relationship("Ingredient", back_populates="sources")
    evidence = sa_relationship("Evidence", lazy="selectin")
