import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# -------------------------------------------------------------
# Common / Filter Schemas
# -------------------------------------------------------------

class DateRangeFilter(BaseModel):
    period: str = Field(
        default="all",
        description="Preset period: '7d', '30d', '90d', 'current_month', 'previous_month', 'custom', or 'all'",
    )
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# -------------------------------------------------------------
# 1. Summary Schema
# -------------------------------------------------------------

class HistoricalSummaryResponse(BaseModel):
    family_id: uuid.UUID
    period_type: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    total_receipts: int
    total_purchased_products: int
    total_unique_products: int
    recurring_products_count: int
    total_spend: float
    currency: str = "INR"
    high_attention_count: int
    potential_conflict_count: int
    verification_required_count: int
    no_configured_conflict_count: int
    insufficient_info_count: int
    coverage_percentage: float
    unresolved_products_count: int
    disclaimer: str = (
        "This is an informational decision-support tool, not medical advice. "
        "A receipt record indicates grocery products purchased, not food ingested or consumed. "
        "Always inspect physical packaging before consumption."
    )


# -------------------------------------------------------------
# 2. Recurring Product Schema
# -------------------------------------------------------------

class AffectedMemberInfo(BaseModel):
    member_id: uuid.UUID
    member_name: str
    relationship: Optional[str] = None
    conflict_types: List[str] = Field(default_factory=list)
    status_counts: Dict[str, int] = Field(default_factory=dict)
    sample_finding_id: Optional[str] = None


class RecurringProductItem(BaseModel):
    product_id: uuid.UUID
    product_name: str
    brand_name: Optional[str] = None
    purchase_count: int
    total_quantity: float
    total_spend: float
    average_price: float
    price_change: Optional[float] = None
    first_purchase_date: Optional[datetime] = None
    last_purchase_date: Optional[datetime] = None
    number_of_receipts: int
    high_attention_events: int = 0
    potential_conflict_events: int = 0
    verification_required_events: int = 0
    no_configured_conflict_events: int = 0
    affected_members: List[AffectedMemberInfo] = Field(default_factory=list)
    recurring_conflict_types: List[str] = Field(default_factory=list)
    sample_finding_id: Optional[str] = None


class RecurringProductsResponse(BaseModel):
    family_id: uuid.UUID
    total_products_tracked: int
    recurring_products: List[RecurringProductItem]


# -------------------------------------------------------------
# 3. Recurring Ingredient Schema
# -------------------------------------------------------------

class RecurringIngredientItem(BaseModel):
    ingredient_id: Optional[uuid.UUID] = None
    ingredient_name: str
    is_derived: bool = False
    derivation_path: Optional[str] = None
    number_of_products_containing: int
    purchase_events_count: int
    affected_members: List[str] = Field(default_factory=list)
    relevant_conflict_types: List[str] = Field(default_factory=list)
    confidence: Optional[float] = None
    source_uncertainty: bool = False
    source_uncertainty_count: int = 0


class RecurringIngredientsResponse(BaseModel):
    family_id: uuid.UUID
    total_ingredients_observed: int
    directly_observed: List[RecurringIngredientItem]
    relationship_derived: List[RecurringIngredientItem]


# -------------------------------------------------------------
# 4. Member Trend Analysis Schema
# -------------------------------------------------------------

class MemberRequirementTrend(BaseModel):
    requirement_name: str
    requirement_type: str  # allergen, dietary, exclusion, nutrition_preference, custom_rule
    occurrences: int
    associated_products: List[str] = Field(default_factory=list)
    sample_finding_id: Optional[str] = None


class MemberHistoryImpactItem(BaseModel):
    member_id: uuid.UUID
    member_name: str
    relationship: Optional[str] = None
    total_purchases_analyzed: int
    products_requiring_attention: int
    potential_conflicts: int
    verification_required_products: int
    recurring_allergens: List[MemberRequirementTrend] = Field(default_factory=list)
    recurring_dietary_conflicts: List[MemberRequirementTrend] = Field(default_factory=list)
    recurring_ingredient_exclusions: List[MemberRequirementTrend] = Field(default_factory=list)
    recurring_source_uncertainty: List[MemberRequirementTrend] = Field(default_factory=list)
    recurring_nutrition_preferences: List[MemberRequirementTrend] = Field(default_factory=list)


class MemberHistoryResponse(BaseModel):
    family_id: uuid.UUID
    members: List[MemberHistoryImpactItem]
    disclaimer: str = (
        "Member purchase trend findings reflect purchased grocery records matching configured profile criteria. "
        "They do not represent personal consumption, allergen ingestion, or clinical exposure."
    )


# -------------------------------------------------------------
# 5. Period Comparison Schema
# -------------------------------------------------------------

class PeriodMetrics(BaseModel):
    total_receipts: int
    total_purchased_products: int
    total_spend: float
    high_attention_count: int
    potential_conflict_count: int
    verification_required_count: int
    matched_products: int


class PeriodComparisonResponse(BaseModel):
    family_id: uuid.UUID
    current_period_name: str
    previous_period_name: str
    current_metrics: PeriodMetrics
    previous_metrics: PeriodMetrics
    changes: List[str] = Field(default_factory=list)
    summary: str


# -------------------------------------------------------------
# 6. Recurring Attention Patterns Schema
# -------------------------------------------------------------

class RecurringPatternItem(BaseModel):
    pattern_type: str  # "recurring_product_conflict", "recurring_derived_allergen", "recurring_source_uncertainty"
    title: str
    description: str
    supporting_purchase_count: int
    supporting_product_count: int
    affected_members: List[str] = Field(default_factory=list)
    supporting_receipt_ids: List[str] = Field(default_factory=list)
    supporting_product_names: List[str] = Field(default_factory=list)
    confidence: float = 0.95
    evidence_references: List[str] = Field(default_factory=list)
    sample_finding_id: Optional[str] = None
    actionable_review: str


class RecurringFindingsResponse(BaseModel):
    family_id: uuid.UUID
    patterns: List[RecurringPatternItem]


# -------------------------------------------------------------
# 7. Coverage & Data Quality Schema
# -------------------------------------------------------------

class HistoricalCoverageResponse(BaseModel):
    family_id: uuid.UUID
    total_receipts_uploaded: int
    receipts_successfully_processed: int
    total_line_items: int
    matched_products: int
    ambiguous_products: int
    unresolved_products: int
    products_with_ingredients: int
    products_missing_ingredients: int
    risk_analyses_available: int
    coverage_percentage: float
    data_quality_grade: str  # "High Coverage", "Moderate Coverage", "Action Needed"
    warning_message: Optional[str] = None


# -------------------------------------------------------------
# 8. Monthly Family Report Schema
# -------------------------------------------------------------

class MonthlyFamilyReportResponse(BaseModel):
    family_id: uuid.UUID
    month_name: str  # e.g. "September 2026"
    generated_at: datetime
    receipts_analyzed: int
    purchased_products: int
    products_successfully_matched: int
    products_requiring_review: int
    high_attention_count: int
    potential_conflict_count: int
    verification_required_count: int
    top_recurring_patterns: List[str] = Field(default_factory=list)
    most_recurring_products: List[Dict[str, Any]] = Field(default_factory=list)
    disclaimer: str = (
        "This monthly grocery report is based strictly on scanned grocery receipts and catalog matching. "
        "Receipt items indicate household grocery acquisitions, not individual dietary intake or allergen exposure."
    )


# -------------------------------------------------------------
# 9. Timeline & Combined History Schema
# -------------------------------------------------------------

class TimelineEvent(BaseModel):
    receipt_id: uuid.UUID
    risk_analysis_id: Optional[uuid.UUID] = None
    purchase_date: Optional[datetime] = None
    merchant_name: Optional[str] = None
    total_products: int
    matched_products: int
    unresolved_products: int
    high_attention_count: int
    potential_conflict_count: int
    verification_required_count: int
    no_configured_conflict_count: int
    total_amount: Optional[float] = None
    currency: str = "INR"


class FamilyHistoryOverviewResponse(BaseModel):
    summary: HistoricalSummaryResponse
    coverage: HistoricalCoverageResponse
    recurring_patterns: List[RecurringPatternItem]
    top_recurring_products: List[RecurringProductItem]
    timeline: List[TimelineEvent]
