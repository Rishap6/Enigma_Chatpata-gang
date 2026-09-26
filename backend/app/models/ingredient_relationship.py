import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Numeric, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class IngredientRelationship(Base):
    __tablename__ = "ingredient_relationships"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    source_ingredient_id = Column(GUID, ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(String(100), nullable=False)  # derived_from, contains, part_of, alias_of, category_of, source_of, related_to, may_contain, produced_from
    target_ingredient_id = Column(GUID, ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    confidence = Column(Numeric(precision=4, scale=2), default=1.0, nullable=False)
    evidence_id = Column(GUID, ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("source_ingredient_id", "relationship_type", "target_ingredient_id", name="uq_ingredient_rel"),
    )

    source_ingredient = sa_relationship("Ingredient", foreign_keys=[source_ingredient_id], back_populates="outgoing_relationships")
    target_ingredient = sa_relationship("Ingredient", foreign_keys=[target_ingredient_id], back_populates="incoming_relationships", lazy="selectin")
    evidence = sa_relationship("Evidence", lazy="selectin")
