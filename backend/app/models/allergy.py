import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, GUID


class Allergy(Base):
    __tablename__ = "allergies"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    member_id = Column(GUID, ForeignKey("family_members.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    severity = Column(String(50), nullable=False)  # 'mild', 'moderate', 'severe'
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    member = relationship("FamilyMember", back_populates="allergies")
