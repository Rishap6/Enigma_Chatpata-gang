import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# ==========================================
# Brand & Category Schemas
# ==========================================

class BrandResponse(BaseModel):
    id: uuid.UUID
    name: str
    normalized_name: str
    description: Optional[str] = None
    website: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    parent_category_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Identifier & Provenance Schemas
# ==========================================

class ProductIdentifierResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    identifier_type: str  # GTIN, EAN13, EAN8, UPC, internal
    identifier_value: str  # string preserving leading zeroes
    country: Optional[str] = None
    is_primary: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductDataSourceResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    source_name: str
    source_type: str
    reference: Optional[str] = None
    retrieved_at: Optional[datetime] = None
    confidence: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductAllergenStatementResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    statement_type: str  # contains, may_contain, manufactured_in_facility, cross_contact, unknown
    statement_text: str
    confidence: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Product Ingredient Schemas
# ==========================================

class ProductIngredientResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    ingredient_id: Optional[uuid.UUID] = None
    raw_name: str  # exact label text preserved
    normalized_name: Optional[str] = None
    sequence: int
    match_method: Optional[str] = None
    match_confidence: Optional[float] = None
    requires_verification: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Product Summary & Detail Schemas
# ==========================================

class ProductSummaryResponse(BaseModel):
    id: uuid.UUID
    name: str
    normalized_name: str
    brand_id: Optional[uuid.UUID] = None
    brand_name: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    category_name: Optional[str] = None
    barcode: Optional[str] = None
    gtin: Optional[str] = None
    pack_size: Optional[str] = None
    unit: Optional[str] = None
    country: Optional[str] = None
    image_url: Optional[str] = None
    confidence: float
    is_active: bool
    ingredient_count: int = 0
    requires_verification: bool = False

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    items: List[ProductSummaryResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ProductDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    normalized_name: str
    description: Optional[str] = None
    brand_id: Optional[uuid.UUID] = None
    brand: Optional[BrandResponse] = None
    category_id: Optional[uuid.UUID] = None
    category: Optional[ProductCategoryResponse] = None
    barcode: Optional[str] = None
    gtin: Optional[str] = None
    pack_size: Optional[str] = None
    unit: Optional[str] = None
    serving_size: Optional[str] = None
    country: Optional[str] = None
    image_url: Optional[str] = None
    ingredients_raw: Optional[str] = None
    allergen_statement_raw: Optional[str] = None
    cross_contact_statement_raw: Optional[str] = None
    source_name: Optional[str] = None
    source_type: Optional[str] = None
    source_reference: Optional[str] = None
    confidence: float
    is_active: bool
    created_at: datetime
    updated_at: datetime
    identifiers: List[ProductIdentifierResponse] = Field(default_factory=list)
    ingredients: List[ProductIngredientResponse] = Field(default_factory=list)
    allergen_statements: List[ProductAllergenStatementResponse] = Field(default_factory=list)
    data_sources: List[ProductDataSourceResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Product Matching Schemas
# ==========================================

class ProductMatchRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=300, description="Raw product name or OCR extracted text")
    brand: Optional[str] = Field(None, max_length=100, description="Optional brand hint")
    barcode: Optional[str] = Field(None, max_length=100, description="Optional barcode / GTIN")


class ProductMatchCandidate(BaseModel):
    product: ProductSummaryResponse
    confidence: float
    match_method: str  # barcode_exact, gtin_exact, exact_normalized, brand_name_fuzzy, fuzzy_name


class ProductMatchResponse(BaseModel):
    matched: bool
    product: Optional[ProductDetailResponse] = None
    confidence: float = 0.0
    match_method: Optional[str] = None
    requires_selection: bool = False
    candidates: List[ProductMatchCandidate] = Field(default_factory=list)


# ==========================================
# Product Analysis (Phase 6 Risk Engine Contract)
# ==========================================

class AnalyzedProductIngredient(BaseModel):
    raw_name: str
    normalized_name: Optional[str] = None
    ingredient_id: Optional[uuid.UUID] = None
    sequence: int
    match_method: Optional[str] = None
    confidence: float
    categories: List[str] = Field(default_factory=list)
    allergens: List[Dict[str, Any]] = Field(default_factory=list)
    relationships: List[Dict[str, Any]] = Field(default_factory=list)
    relationship_chains: List[Any] = Field(default_factory=list)
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    dietary_properties: List[Dict[str, Any]] = Field(default_factory=list)
    dietary_summary: Dict[str, Any] = Field(default_factory=dict)
    requires_verification: bool = False


class ProductQualitySummary(BaseModel):
    identification_confidence: str  # High, Medium, Low
    ingredient_coverage_pct: float  # e.g. 100.0 or 75.0
    total_ingredients: int
    recognized_ingredients: int
    unresolved_ingredients: int
    has_allergen_statement: bool
    has_cross_contact_statement: bool
    primary_source: str
    overall_status: str  # high_confidence, verification_required, low_confidence


class ProductAnalysisResponse(BaseModel):
    product: Dict[str, Any]
    identification: Dict[str, Any]
    ingredients: List[AnalyzedProductIngredient] = Field(default_factory=list)
    allergen_statements: List[ProductAllergenStatementResponse] = Field(default_factory=list)
    unresolved_ingredients: List[str] = Field(default_factory=list)
    aggregated_allergens: List[str] = Field(default_factory=list)
    aggregated_categories: List[str] = Field(default_factory=list)
    dietary_summary: Dict[str, Any] = Field(default_factory=dict)
    product_confidence: float
    requires_verification: bool
    quality_summary: ProductQualitySummary
    notes: Optional[str] = None
