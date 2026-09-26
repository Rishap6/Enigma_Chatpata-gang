import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship as sa_relationship
from app.core.database import Base, GUID


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    family_id = Column(GUID, ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    avatar = Column(Text, nullable=True)
    relationship = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    family = sa_relationship("Family", back_populates="members")
    allergies = sa_relationship("Allergy", back_populates="member", cascade="all, delete-orphan", lazy="selectin")
    dietary_rules = sa_relationship("DietaryRule", back_populates="member", cascade="all, delete-orphan", lazy="selectin")
    ingredient_exclusions = sa_relationship(
        "IngredientExclusion", back_populates="member", cascade="all, delete-orphan", lazy="selectin"
    )
    nutrition_preferences = sa_relationship(
        "NutritionPreference", back_populates="member", cascade="all, delete-orphan", lazy="selectin"
    )
    custom_rules = sa_relationship("CustomRule", back_populates="member", cascade="all, delete-orphan", lazy="selectin")
    emergency_contacts = sa_relationship(
        "EmergencyContact", back_populates="member", cascade="all, delete-orphan", lazy="selectin"
    )
    notification_preferences = sa_relationship(
        "NotificationPreference",
        back_populates="member",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
