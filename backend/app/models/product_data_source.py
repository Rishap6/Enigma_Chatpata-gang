import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class ProductDataSource(Base):
    __tablename__ = "product_data_sources"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    source_name = Column(String(255), nullable=False)
    source_type = Column(String(100), nullable=False)  # manufacturer, curated_dataset, external_database, manual_entry, user_submitted, system_import
    reference = Column(Text, nullable=True)
    retrieved_at = Column(DateTime(timezone=True), nullable=True)
    confidence = Column(Numeric(precision=4, scale=3), default=1.0, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship
    product = sa_relationship("Product", back_populates="data_sources", lazy="selectin")
