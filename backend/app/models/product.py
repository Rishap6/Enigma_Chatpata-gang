import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Numeric
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class Product(Base):
    __tablename__ = "products"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    brand_id = Column(GUID, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    normalized_name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category_id = Column(GUID, ForeignKey("product_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    barcode = Column(String(100), nullable=True, index=True)
    gtin = Column(String(100), nullable=True, index=True)
    pack_size = Column(String(50), nullable=True)
    unit = Column(String(50), nullable=True)
    serving_size = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    image_url = Column(Text, nullable=True)
    ingredients_raw = Column(Text, nullable=True)
    allergen_statement_raw = Column(Text, nullable=True)
    cross_contact_statement_raw = Column(Text, nullable=True)
    source_name = Column(String(255), nullable=True)
    source_type = Column(String(100), nullable=True)
    source_reference = Column(Text, nullable=True)
    confidence = Column(Numeric(precision=4, scale=3), default=1.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    brand = sa_relationship("Brand", back_populates="products", lazy="selectin")
    category = sa_relationship("ProductCategory", back_populates="products", lazy="selectin")
    identifiers = sa_relationship("ProductIdentifier", back_populates="product", cascade="all, delete-orphan", lazy="selectin")
    product_ingredients = sa_relationship("ProductIngredient", back_populates="product", cascade="all, delete-orphan", lazy="selectin", order_by="ProductIngredient.sequence")
    allergen_statements = sa_relationship("ProductAllergenStatement", back_populates="product", cascade="all, delete-orphan", lazy="selectin")
    data_sources = sa_relationship("ProductDataSource", back_populates="product", cascade="all, delete-orphan", lazy="selectin")
