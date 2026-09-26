import uuid
from typing import List, Optional
from pydantic import BaseModel, Field


class AlternativeItem(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    alternative_product_id: Optional[uuid.UUID] = None
    alternative_name: str
    alternative_brand: Optional[str] = None
    alternative_category: Optional[str] = None
    reason: str
    target_allergen: Optional[str] = None
    dietary_tags: List[str] = Field(default_factory=list)
    health_benefit: Optional[str] = None
    confidence: float = 1.0
    is_curated: bool = True

    model_config = {"from_attributes": True}


class ProductAlternativesResponse(BaseModel):
    product_id: uuid.UUID
    product_name: str
    flagged_allergens: List[str] = Field(default_factory=list)
    dietary_conflicts: List[str] = Field(default_factory=list)
    total_alternatives: int
    alternatives: List[AlternativeItem] = Field(default_factory=list)
