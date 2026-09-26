import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, GUID


class CustomRule(Base):
    __tablename__ = "custom_rules"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    member_id = Column(GUID, ForeignKey("family_members.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    member = relationship("FamilyMember", back_populates="custom_rules")
