import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.product import ProductDetailResponse, ProductSummaryResponse


class ReceiptProcessingEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    receipt_id: uuid.UUID
    stage: str
    status: str
    message: Optional[str] = None
    duration_ms: Optional[int] = None
    created_at: datetime


class ReceiptItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    receipt_id: uuid.UUID
    line_number: int
    raw_text: str
    product_name_raw: Optional[str] = None
    product_name_normalized: Optional[str] = None
    brand_hint: Optional[str] = None
    quantity: Optional[float] = 1.0
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    currency: Optional[str] = "INR"
    product_id: Optional[uuid.UUID] = None
    product: Optional[ProductDetailResponse] = None
    match_method: Optional[str] = None
    match_confidence: Optional[float] = None
    requires_selection: bool = False
    requires_verification: bool = False
    user_corrected: bool = False
    candidate_products: List[ProductSummaryResponse] = []
    created_at: datetime
    updated_at: datetime


class ReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_user_id: uuid.UUID
    family_id: Optional[uuid.UUID] = None
    original_filename: Optional[str] = None
    storage_path: Optional[str] = None
    image_url: Optional[str] = None
    ocr_text: Optional[str] = None
    processing_status: str
    ocr_confidence: Optional[float] = None
    purchase_date: Optional[datetime] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = "INR"
    items_count: int = 0
    matched_count: int = 0
    ambiguous_count: int = 0
    unknown_count: int = 0
    coverage_ratio: float = 0.0
    items: List[ReceiptItemResponse] = []
    events: List[ReceiptProcessingEventResponse] = []
    created_at: datetime
    updated_at: datetime


class ReceiptListResponse(BaseModel):
    items: List[ReceiptResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ReceiptItemUpdateRequest(BaseModel):
    product_name_raw: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None


class ReceiptItemResolveRequest(BaseModel):
    product_id: uuid.UUID


class ReceiptItemBarcodeResolveRequest(BaseModel):
    identifier_type: str = "AUTO"
    identifier_value: str


class ReceiptManualItemCreateRequest(BaseModel):
    product_name: str
    quantity: Optional[float] = 1.0
    price: Optional[float] = None


class ReceiptCoverageSummary(BaseModel):
    total_items: int
    matched: int
    ambiguous: int
    unknown: int
    coverage_ratio: float


class PurchasedProductItem(BaseModel):
    item_id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    quantity: float
    unit_price: Optional[float]
    total_price: Optional[float]
    purchase_date: Optional[datetime]
    source: str = "receipt"
    product_analysis: Dict[str, Any]


class ReceiptAnalysisResponse(BaseModel):
    """Structured grocery purchase intelligence dataset ready for Phase 6 Family Risk Engine."""
    receipt_id: uuid.UUID
    processing_status: str
    purchase_date: Optional[datetime] = None
    currency: Optional[str] = "INR"
    total_spend: Optional[float] = None
    coverage: ReceiptCoverageSummary
    ready_for_family_risk_engine: bool
    matched_products: List[PurchasedProductItem]
    unresolved_items: List[ReceiptItemResponse]
    ocr_confidence: Optional[float] = None
