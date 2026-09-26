export interface AffectedMemberInfo {
  member_id: string;
  member_name: string;
  relationship?: string;
  conflict_types: string[];
  status_counts: Record<string, number>;
  sample_finding_id?: string;
}

export interface RecurringProductItem {
  product_id: string;
  product_name: string;
  brand_name?: string;
  purchase_count: number;
  total_quantity: number;
  total_spend: number;
  average_price: number;
  price_change?: number;
  first_purchase_date?: string;
  last_purchase_date?: string;
  number_of_receipts: number;
  high_attention_events: number;
  potential_conflict_events: number;
  verification_required_events: number;
  no_configured_conflict_events: number;
  affected_members: AffectedMemberInfo[];
  recurring_conflict_types: string[];
  sample_finding_id?: string;
}

export interface RecurringProductsResponse {
  family_id: string;
  total_products_tracked: number;
  recurring_products: RecurringProductItem[];
}

export interface RecurringIngredientItem {
  ingredient_id?: string;
  ingredient_name: string;
  is_derived: boolean;
  derivation_path?: string;
  number_of_products_containing: number;
  purchase_events_count: number;
  affected_members: string[];
  relevant_conflict_types: string[];
  confidence?: number;
  source_uncertainty: boolean;
  source_uncertainty_count: number;
}

export interface RecurringIngredientsResponse {
  family_id: string;
  total_ingredients_observed: number;
  directly_observed: RecurringIngredientItem[];
  relationship_derived: RecurringIngredientItem[];
}

export interface MemberRequirementTrend {
  requirement_name: string;
  requirement_type: string;
  occurrences: number;
  associated_products: string[];
  sample_finding_id?: string;
}

export interface MemberHistoryImpactItem {
  member_id: string;
  member_name: string;
  relationship?: string;
  total_purchases_analyzed: number;
  products_requiring_attention: number;
  potential_conflicts: number;
  verification_required_products: number;
  recurring_allergens: MemberRequirementTrend[];
  recurring_dietary_conflicts: MemberRequirementTrend[];
  recurring_ingredient_exclusions: MemberRequirementTrend[];
  recurring_source_uncertainty: MemberRequirementTrend[];
  recurring_nutrition_preferences: MemberRequirementTrend[];
}

export interface MemberHistoryResponse {
  family_id: string;
  members: MemberHistoryImpactItem[];
  disclaimer: string;
}

export interface PeriodMetrics {
  total_receipts: number;
  total_purchased_products: number;
  total_spend: number;
  high_attention_count: number;
  potential_conflict_count: number;
  verification_required_count: number;
  matched_products: number;
}

export interface PeriodComparisonResponse {
  family_id: string;
  current_period_name: string;
  previous_period_name: string;
  current_metrics: PeriodMetrics;
  previous_metrics: PeriodMetrics;
  changes: string[];
  summary: string;
}

export interface RecurringPatternItem {
  pattern_type: string;
  title: string;
  description: string;
  supporting_purchase_count: number;
  supporting_product_count: number;
  affected_members: string[];
  supporting_receipt_ids: string[];
  supporting_product_names: string[];
  confidence: number;
  evidence_references: string[];
  sample_finding_id?: string;
  actionable_review: string;
}

export interface RecurringFindingsResponse {
  family_id: string;
  patterns: RecurringPatternItem[];
}

export interface HistoricalCoverageResponse {
  family_id: string;
  total_receipts_uploaded: number;
  receipts_successfully_processed: number;
  total_line_items: number;
  matched_products: number;
  ambiguous_products: number;
  unresolved_products: number;
  products_with_ingredients: number;
  products_missing_ingredients: number;
  risk_analyses_available: number;
  coverage_percentage: number;
  data_quality_grade: string;
  warning_message?: string;
}

export interface MonthlyFamilyReportResponse {
  family_id: string;
  month_name: string;
  generated_at: string;
  receipts_analyzed: number;
  purchased_products: number;
  products_successfully_matched: number;
  products_requiring_review: number;
  high_attention_count: number;
  potential_conflict_count: number;
  verification_required_count: number;
  top_recurring_patterns: string[];
  most_recurring_products: Array<{
    product_name: string;
    purchase_count: number;
    total_spend: number;
    attention_events: number;
  }>;
  disclaimer: string;
}

export interface TimelineEvent {
  receipt_id: string;
  risk_analysis_id?: string;
  purchase_date?: string;
  merchant_name?: string;
  total_products: number;
  matched_products: number;
  unresolved_products: number;
  high_attention_count: number;
  potential_conflict_count: number;
  verification_required_count: number;
  no_configured_conflict_count: number;
  total_amount?: number;
  currency: string;
}

export interface HistoricalSummaryResponse {
  family_id: string;
  period_type: string;
  period_start?: string;
  period_end?: string;
  total_receipts: number;
  total_purchased_products: number;
  total_unique_products: number;
  recurring_products_count: number;
  total_spend: number;
  currency: string;
  high_attention_count: number;
  potential_conflict_count: number;
  verification_required_count: number;
  no_configured_conflict_count: number;
  insufficient_info_count: number;
  coverage_percentage: number;
  unresolved_products_count: number;
  disclaimer: string;
}

export interface FamilyHistoryOverviewResponse {
  summary: HistoricalSummaryResponse;
  coverage: HistoricalCoverageResponse;
  recurring_patterns: RecurringPatternItem[];
  top_recurring_products: RecurringProductItem[];
  timeline: TimelineEvent[];
}
