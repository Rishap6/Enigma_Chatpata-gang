import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base, GUID


class DietaryRule(Base):
    __tablename__ = "dietary_rules"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    member_id = Column(GUID, ForeignKey("family_members.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_type = Column(String(100), nullable=False)  # e.g., 'dietary'
    rule_value = Column(String(100), nullable=False)  # e.g., 'vegetarian', 'vegan', 'gluten_free'
    label = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    member = relationship("FamilyMember", back_populates="dietary_rules")
