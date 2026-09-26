import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class RiskFinding(Base):
    __tablename__ = "risk_findings"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    risk_analysis_id = Column(GUID, ForeignKey("risk_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(GUID, ForeignKey("family_members.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Status: high_attention, potential_conflict, verification_required, no_configured_conflict, insufficient_information
    status = Column(String(50), nullable=False, index=True)
    
    # Risk Type: direct_allergen, derived_allergen, cross_contact, dietary_conflict, ingredient_exclusion, source_uncertainty, nutrition_preference, custom_rule, unknown
    risk_type = Column(String(50), nullable=False, index=True)
    
    # Severity: high, medium, low, info (prioritization signal only, NOT medical danger)
    severity = Column(String(50), nullable=False, default="info")
    
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    trigger_text = Column(String(255), nullable=True)
    matched_rule = Column(String(255), nullable=True)
    reason = Column(Text, nullable=True)
    
    confidence = Column(Numeric(precision=4, scale=3), nullable=True)
    attention_score = Column(Numeric(precision=6, scale=2), default=0.0, nullable=False)
    
    requires_verification = Column(Boolean, default=False, nullable=False)
    cross_contact = Column(Boolean, default=False, nullable=False)
    source_uncertainty = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    risk_analysis = sa_relationship("RiskAnalysis", back_populates="findings")
    member = sa_relationship("FamilyMember", lazy="selectin")
    product = sa_relationship("Product", lazy="selectin")
    paths = sa_relationship(
        "RiskFindingPath",
        back_populates="finding",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="RiskFindingPath.step_number",
    )
    evidence = sa_relationship(
        "RiskFindingEvidence",
        back_populates="finding",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
