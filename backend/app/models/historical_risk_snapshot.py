import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class HistoricalRiskSnapshot(Base):
    __tablename__ = "historical_risk_snapshots"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    family_id = Column(GUID, ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    receipt_id = Column(GUID, ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_analysis_id = Column(GUID, ForeignKey("risk_analyses.id", ondelete="SET NULL"), nullable=True, index=True)
    purchase_date = Column(DateTime(timezone=True), nullable=True, index=True)
    
    total_products = Column(Integer, nullable=False, default=0)
    matched_products = Column(Integer, nullable=False, default=0)
    unresolved_products = Column(Integer, nullable=False, default=0)
    
    high_attention_count = Column(Integer, nullable=False, default=0)
    potential_conflict_count = Column(Integer, nullable=False, default=0)
    verification_required_count = Column(Integer, nullable=False, default=0)
    insufficient_information_count = Column(Integer, nullable=False, default=0)
    no_configured_conflict_count = Column(Integer, nullable=False, default=0)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    family = sa_relationship("Family", lazy="selectin")
    receipt = sa_relationship("Receipt", lazy="selectin")
    risk_analysis = sa_relationship("RiskAnalysis", lazy="selectin")
