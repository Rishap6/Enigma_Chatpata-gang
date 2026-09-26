import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from app.core.database import Base, GUID


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    source_name = Column(String(255), nullable=False)
    source_type = Column(String(100), nullable=False)  # official, manufacturer, curated_dataset, trusted_database, scientific_reference, manual_review, system_derived
    reference = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    evidence_level = Column(String(50), nullable=False)  # high, medium, low, unknown
    retrieved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
