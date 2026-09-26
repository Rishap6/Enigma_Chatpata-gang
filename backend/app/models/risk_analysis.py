import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class RiskAnalysis(Base):
    __tablename__ = "risk_analyses"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    family_id = Column(GUID, ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    receipt_id = Column(GUID, ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_version = Column(String(50), nullable=False, default="v1.0.0")
    status = Column(String(50), nullable=False, default="completed")  # completed, in_progress, error
    products_analyzed = Column(Integer, nullable=False, default=0)
    members_analyzed = Column(Integer, nullable=False, default=0)
    high_attention_count = Column(Integer, nullable=False, default=0)
    potential_conflict_count = Column(Integer, nullable=False, default=0)
    verification_count = Column(Integer, nullable=False, default=0)
    no_conflict_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    family = sa_relationship("Family", lazy="selectin")
    receipt = sa_relationship("Receipt", lazy="selectin")
    findings = sa_relationship(
        "RiskFinding",
        back_populates="risk_analysis",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="desc(RiskFinding.attention_score)",
    )
