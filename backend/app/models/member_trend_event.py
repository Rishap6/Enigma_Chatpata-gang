import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class MemberTrendEvent(Base):
    __tablename__ = "member_trend_events"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    family_id = Column(GUID, ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(GUID, ForeignKey("family_members.id", ondelete="CASCADE"), nullable=False, index=True)
    receipt_id = Column(GUID, ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_id = Column(GUID, ForeignKey("risk_findings.id", ondelete="SET NULL"), nullable=True, index=True)
    purchase_date = Column(DateTime(timezone=True), nullable=True, index=True)
    
    conflict_type = Column(String(50), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    family = sa_relationship("Family", lazy="selectin")
    member = sa_relationship("FamilyMember", lazy="selectin")
    receipt = sa_relationship("Receipt", lazy="selectin")
    product = sa_relationship("Product", lazy="selectin")
    finding = sa_relationship("RiskFinding", lazy="selectin")
