import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class FamilyTrendSnapshot(Base):
    __tablename__ = "family_trend_snapshots"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    family_id = Column(GUID, ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    period_type = Column(String(50), nullable=False, index=True)  # "month", "7d", "30d", "90d", "custom", "all"
    period_start = Column(DateTime(timezone=True), nullable=True, index=True)
    period_end = Column(DateTime(timezone=True), nullable=True, index=True)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    total_receipts = Column(Integer, nullable=False, default=0)
    total_purchased_products = Column(Integer, nullable=False, default=0)
    analyzed_products = Column(Integer, nullable=False, default=0)
    unresolved_products = Column(Integer, nullable=False, default=0)
    total_spend = Column(Numeric(precision=12, scale=2), default=0.0, nullable=False)
    attention_event_count = Column(Integer, nullable=False, default=0)
    verification_event_count = Column(Integer, nullable=False, default=0)

    # Relationships
    family = sa_relationship("Family", lazy="selectin")
