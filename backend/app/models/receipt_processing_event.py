import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class ReceiptProcessingEvent(Base):
    __tablename__ = "receipt_processing_events"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    receipt_id = Column(GUID, ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False, index=True)
    stage = Column(String(50), nullable=False)  # upload, preprocess, ocr, parse, normalize, match, complete
    status = Column(String(50), nullable=False)  # started, completed, failed, skipped
    message = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    receipt = sa_relationship("Receipt", back_populates="events")
