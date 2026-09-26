import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class RiskFindingPath(Base):
    """Stores the step-by-step ingredient derivation chain (e.g. Sodium Caseinate -> Casein -> Milk)."""
    __tablename__ = "risk_finding_paths"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    finding_id = Column(GUID, ForeignKey("risk_findings.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number = Column(Integer, nullable=False)
    ingredient_id = Column(GUID, ForeignKey("ingredients.id", ondelete="SET NULL"), nullable=True)
    ingredient_name = Column(String(255), nullable=False)
    relationship_type = Column(String(100), nullable=True)  # derived_from, parent_category, source, alias
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    finding = sa_relationship("RiskFinding", back_populates="paths")
    ingredient = sa_relationship("Ingredient", lazy="selectin")
