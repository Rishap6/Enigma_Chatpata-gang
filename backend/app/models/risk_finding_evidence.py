import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class RiskFindingEvidence(Base):
    """Stores structured evidence linking back to Phase 2/3 intelligence."""
    __tablename__ = "risk_finding_evidence"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    finding_id = Column(GUID, ForeignKey("risk_findings.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(GUID, ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True)
    evidence_type = Column(String(100), nullable=True)  # scientific, manufacturer, ontology, regulatory, product_label
    description = Column(Text, nullable=True)
    confidence = Column(Numeric(precision=4, scale=3), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    finding = sa_relationship("RiskFinding", back_populates="evidence")
    source_evidence = sa_relationship("Evidence", lazy="selectin")
