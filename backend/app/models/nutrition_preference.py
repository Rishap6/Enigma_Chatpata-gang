import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base, GUID


class NutritionPreference(Base):
    __tablename__ = "nutrition_preferences"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    member_id = Column(GUID, ForeignKey("family_members.id", ondelete="CASCADE"), nullable=False, index=True)
    preference_type = Column(String(100), nullable=False)  # e.g., 'reduce_sugar', 'reduce_sodium'
    preference_value = Column(String(255), nullable=False)  # e.g., 'true' or level
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    member = relationship("FamilyMember", back_populates="nutrition_preferences")
