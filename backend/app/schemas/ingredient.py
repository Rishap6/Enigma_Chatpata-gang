import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class EvidenceResponse(BaseModel):
    id: uuid.UUID
    source_name: str
    source_type: str
    reference: Optional[str] = None
    description: Optional[str] = None
    evidence_level: str
    retrieved_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IngredientAliasResponse(BaseModel):
    id: uuid.UUID
    ingredient_id: uuid.UUID
    alias: str
    alias_normalized: str
    alias_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IngredientCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AllergenKnowledgeResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DietaryPropertyResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IngredientSourceResponse(BaseModel):
    id: uuid.UUID
    ingredient_id: uuid.UUID
    source_type: str
    source_status: str
    description: Optional[str] = None
    confidence: float

    model_config = ConfigDict(from_attributes=True)


class IngredientRelationshipResponse(BaseModel):
    id: uuid.UUID
    source_ingredient_id: uuid.UUID
    source_name: Optional[str] = None
    relationship_type: str
    target_ingredient_id: uuid.UUID
    target_name: Optional[str] = None
    confidence: float
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IngredientDetailResponse(BaseModel):
    id: uuid.UUID
    canonical_name: str
    display_name: str
    description: Optional[str] = None
    ingredient_type: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    aliases: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    allergens: List[Dict[str, Any]] = Field(default_factory=list)
    dietary_properties: List[Dict[str, Any]] = Field(default_factory=list)
    sources: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class IngredientSearchItem(BaseModel):
    id: uuid.UUID
    canonical_name: str
    display_name: str
    matched_alias: Optional[str] = None
    match_method: str = "canonical"
    confidence: float = 1.0


# Normalization schemas
class NormalizationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, description="Raw ingredient text to normalize")


class NormalizationResponse(BaseModel):
    matched: bool
    canonical_name: Optional[str] = None
    display_name: Optional[str] = None
    ingredient_id: Optional[uuid.UUID] = None
    matched_alias: Optional[str] = None
    match_method: Optional[str] = None  # exact_canonical, alias, normalized_alias, fuzzy, unresolved
    confidence: float = 0.0
    requires_verification: bool = False
    candidate: Optional[str] = None


# Relationship traversal schemas
class RelationshipChainItem(BaseModel):
    path: List[str]
    relationship_types: List[str]


class RelationshipTraceResponse(BaseModel):
    ingredient_id: uuid.UUID
    canonical_name: str
    display_name: str
    chains: List[RelationshipChainItem] = Field(default_factory=list)
    cycle_detected: bool = False
    visited_count: int = 0


# Source analysis schemas
class SourceAnalysisResponse(BaseModel):
    status: str  # known, possible, unknown
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    requires_verification: bool = False
    confidence: float = 1.0


# Unified Ingredient Analysis schemas
class UnifiedIngredientAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, description="Raw ingredient text to analyze")


class UnifiedIngredientAnalysisResponse(BaseModel):
    raw_input: str
    matched: bool
    normalized_ingredient: Optional[Dict[str, Any]] = None
    match: Optional[Dict[str, Any]] = None
    categories: List[str] = Field(default_factory=list)
    allergens: List[Dict[str, Any]] = Field(default_factory=list)
    relationships: List[Dict[str, Any]] = Field(default_factory=list)
    relationship_chains: List[RelationshipChainItem] = Field(default_factory=list)
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    dietary_properties: List[Dict[str, Any]] = Field(default_factory=list)
    dietary_summary: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.0
    requires_verification: bool = False
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[str] = None
