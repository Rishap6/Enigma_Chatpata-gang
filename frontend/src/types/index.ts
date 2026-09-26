export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export interface Allergy {
  id: string;
  member_id: string;
  name: string;
  severity: AllergySeverity;
  notes?: string | null;
  created_at: string;
}

export interface AllergyCreate {
  name: string;
  severity: AllergySeverity;
  notes?: string;
}

export interface AllergyUpdate {
  name?: string;
  severity?: AllergySeverity;
  notes?: string;
}

export interface DietaryRule {
  id: string;
  member_id: string;
  rule_type: string;
  rule_value: string;
  label?: string | null;
  created_at: string;
}

export interface DietaryRuleCreate {
  rule_type: string;
  rule_value: string;
  label?: string;
}

export interface IngredientExclusion {
  id: string;
  member_id: string;
  ingredient_name: string;
  reason?: string | null;
  created_at: string;
}

export interface IngredientExclusionCreate {
  ingredient_name: string;
  reason?: string;
}

export interface NutritionPreference {
  id: string;
  member_id: string;
  preference_type: string;
  preference_value: string;
  created_at: string;
}

export interface NutritionPreferenceCreate {
  preference_type: string;
  preference_value: string;
}

export interface CustomRule {
  id: string;
  member_id: string;
  rule_text: string;
  created_at: string;
}

export interface CustomRuleCreate {
  rule_text: string;
}

export interface EmergencyContact {
  id: string;
  member_id: string;
  name: string;
  phone?: string | null;
  whatsapp_number?: string | null;
  relationship?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContactCreate {
  name: string;
  phone?: string;
  whatsapp_number?: string;
  relationship?: string;
  is_primary: boolean;
}

export interface EmergencyContactUpdate {
  name?: string;
  phone?: string;
  whatsapp_number?: string;
  relationship?: string;
  is_primary?: boolean;
}

export interface NotificationPreference {
  id: string;
  member_id: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  emergency_call_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferenceUpdate {
  in_app_enabled?: boolean;
  push_enabled?: boolean;
  whatsapp_enabled?: boolean;
  emergency_call_enabled?: boolean;
}

export interface FamilyMemberSummary {
  id: string;
  family_id: string;
  name: string;
  age?: number | null;
  avatar?: string | null;
  relationship?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  allergy_count: number;
  dietary_rule_count: number;
  ingredient_exclusion_count: number;
  custom_rule_count: number;
  emergency_contact_count: number;
  allergies_summary: string[];
  dietary_summary: string[];
}

export interface FamilyMemberDetail {
  id: string;
  family_id: string;
  name: string;
  age?: number | null;
  avatar?: string | null;
  relationship?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  allergies: Allergy[];
  dietary_rules: DietaryRule[];
  ingredient_exclusions: IngredientExclusion[];
  nutrition_preferences: NutritionPreference[];
  custom_rules: CustomRule[];
  emergency_contacts: EmergencyContact[];
  notification_preferences?: NotificationPreference | null;
}

export interface MemberCreateBasic {
  name: string;
  age?: number | null;
  avatar?: string;
  relationship?: string;
  notes?: string;
}

export interface MemberCreateFull extends MemberCreateBasic {
  allergies: AllergyCreate[];
  dietary_rules: DietaryRuleCreate[];
  ingredient_exclusions: IngredientExclusionCreate[];
  nutrition_preferences: NutritionPreferenceCreate[];
  custom_rules: CustomRuleCreate[];
  emergency_contacts: EmergencyContactCreate[];
  notification_preferences?: {
    in_app_enabled: boolean;
    push_enabled: boolean;
    whatsapp_enabled: boolean;
    emergency_call_enabled: boolean;
  };
}

export interface MemberUpdate {
  name?: string;
  age?: number | null;
  avatar?: string;
  relationship?: string;
  notes?: string;
}

export interface Family {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyDetail extends Family {
  members: FamilyMemberSummary[];
}

export interface FamilyDashboardStats {
  total_members: number;
  total_allergies: number;
  total_dietary_restrictions: number;
  total_custom_rules: number;
  total_ingredient_exclusions: number;
}

export interface FamilyDashboardResponse {
  family: Family;
  stats: FamilyDashboardStats;
  members: FamilyMemberSummary[];
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface FutureEngineRequirements {
  member_id: string;
  name: string;
  allergies: { name: string; severity: string; notes?: string }[];
  dietary_rules: string[];
  ingredient_exclusions: string[];
  nutrition_preferences: string[];
  custom_rules: string[];
  emergency_contacts: {
    name: string;
    relationship?: string;
    phone?: string;
    whatsapp_number?: string;
    is_primary: boolean;
  }[];
}

// ==========================================
// Phase 2: Ingredient Intelligence Types
// ==========================================

export interface IngredientSearchItem {
  id: string;
  canonical_name: string;
  display_name: string;
  matched_alias?: string | null;
  match_method: string;
  confidence: number;
}

export interface NormalizationResponse {
  matched: boolean;
  canonical_name?: string | null;
  display_name?: string | null;
  ingredient_id?: string | null;
  matched_alias?: string | null;
  match_method?: string | null;
  confidence: number;
  requires_verification: boolean;
  candidate?: string | null;
}

export interface RelationshipChainItem {
  path: string[];
  relationship_types: string[];
}

export interface RelationshipTraceResponse {
  ingredient_id: string;
  canonical_name: string;
  display_name: string;
  chains: RelationshipChainItem[];
  cycle_detected: boolean;
  visited_count: number;
}

export interface IngredientSourceItem {
  type: string;
  status: 'known' | 'possible' | 'unknown';
  confidence: number;
  description?: string | null;
}

export interface AllergenMappingItem {
  name: string;
  relationship: string;
  confidence: number;
  via_path?: string[];
  is_derived?: boolean;
}

export interface DietarySummary {
  animal_derived?: string;
  vegetarian_compatible?: string;
  vegan_compatible?: string;
  status?: string;
}

export interface UnifiedIngredientAnalysis {
  raw_input: string;
  matched: boolean;
  normalized_ingredient?: {
    id: string;
    canonical_name: string;
    display_name: string;
    ingredient_type?: string;
  } | null;
  match?: {
    method: string;
    confidence: number;
    matched_alias?: string | null;
  } | null;
  categories: string[];
  allergens: AllergenMappingItem[];
  relationships: {
    from: string;
    relationship: string;
    to: string;
    confidence: number;
  }[];
  relationship_chains: RelationshipChainItem[];
  sources: IngredientSourceItem[];
  dietary_properties: {
    name: string;
    status: string;
    confidence: number;
  }[];
  dietary_summary: DietarySummary;
  confidence: number;
  requires_verification: boolean;
  evidence: {
    source_name: string;
    source_type: string;
    evidence_level: string;
  }[];
  candidate?: string | null;
  notes?: string | null;
}

export interface IngredientDetail {
  id: string;
  canonical_name: string;
  display_name: string;
  description?: string | null;
  ingredient_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  aliases: string[];
  categories: string[];
  allergens: AllergenMappingItem[];
  dietary_properties: { name: string; status: string; confidence: number }[];
  sources: IngredientSourceItem[];
}

// ==========================================
// Phase 3: Product Intelligence Types
// ==========================================

export interface Brand {
  id: string;
  name: string;
  normalized_name: string;
  description?: string | null;
  website?: string | null;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string | null;
  parent_category_id?: string | null;
  slug?: string | null;
  created_at?: string | null;
}


export interface ProductIdentifier {
  id: string;
  product_id: string;
  identifier_type: string; // GTIN, EAN13, EAN8, UPC, internal
  identifier_value: string; // string preserving leading zeroes
  country?: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface ProductDataSource {
  id: string;
  product_id: string;
  source_name: string;
  source_type: string;
  reference?: string | null;
  retrieved_at?: string | null;
  confidence: number;
  created_at: string;
}

export interface ProductAllergenStatement {
  id: string;
  product_id: string;
  statement_type: string; // contains, may_contain, manufactured_in_facility, cross_contact, unknown
  statement_text: string;
  confidence: number;
  created_at: string;
}

export interface ProductIngredient {
  id: string;
  product_id: string;
  ingredient_id?: string | null;
  raw_name: string; // exact label text preserved
  normalized_name?: string | null;
  sequence: number;
  match_method?: string | null;
  match_confidence?: number | null;
  requires_verification: boolean;
  created_at: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  normalized_name: string;
  brand_id?: string | null;
  brand_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  barcode?: string | null;
  gtin?: string | null;
  pack_size?: string | null;
  unit?: string | null;
  country?: string | null;
  image_url?: string | null;
  confidence: number;
  is_active: boolean;
  ingredient_count: number;
  requires_verification: boolean;
}

export interface ProductListResponse {
  items: ProductSummary[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  normalized_name: string;
  description?: string | null;
  brand_id?: string | null;
  brand?: Brand | null;
  category_id?: string | null;
  category?: ProductCategory | null;
  barcode?: string | null;
  gtin?: string | null;
  pack_size?: string | null;
  unit?: string | null;
  serving_size?: string | null;
  country?: string | null;
  image_url?: string | null;
  ingredients_raw?: string | null;
  allergen_statement_raw?: string | null;
  cross_contact_statement_raw?: string | null;
  source_name?: string | null;
  source_type?: string | null;
  source_reference?: string | null;
  confidence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  identifiers: ProductIdentifier[];
  ingredients: ProductIngredient[];
  allergen_statements: ProductAllergenStatement[];
  data_sources: ProductDataSource[];
}

export type Product = ProductDetail;

export interface ProductMatchRequest {
  name: string;
  brand?: string;
  barcode?: string;
}

export interface ProductMatchCandidate {
  product: ProductSummary;
  confidence: number;
  match_method: string;
}

export interface ProductMatchResponse {
  matched: boolean;
  product?: ProductDetail | null;
  confidence: number;
  match_method?: string | null;
  requires_selection: boolean;
  candidates: ProductMatchCandidate[];
}

export interface AnalyzedProductIngredient {
  raw_name: string;
  normalized_name?: string | null;
  ingredient_id?: string | null;
  sequence: number;
  match_method?: string | null;
  confidence: number;
  categories: string[];
  allergens: AllergenMappingItem[];
  relationships: {
    from: string;
    relationship: string;
    to: string;
    confidence: number;
  }[];
  relationship_chains: RelationshipChainItem[];
  sources: IngredientSourceItem[];
  dietary_properties: {
    name: string;
    status: string;
    confidence: number;
  }[];
  dietary_summary: DietarySummary;
  requires_verification: boolean;
}

export interface ProductQualitySummary {
  identification_confidence: string; // High, Medium, Low
  ingredient_coverage_pct: number;
  total_ingredients: number;
  recognized_ingredients: number;
  unresolved_ingredients: number;
  has_allergen_statement: boolean;
  has_cross_contact_statement: boolean;
  primary_source: string;
  overall_status: 'high_confidence' | 'verification_required' | 'medium_confidence' | 'low_confidence';
}

export interface ProductAnalysis {
  product: {
    id: string;
    name: string;
    normalized_name: string;
    brand?: string | null;
    category?: string | null;
    barcode?: string | null;
    gtin?: string | null;
    image_url?: string | null;
    pack_size?: string | null;
    country?: string | null;
  };
  identification: {
    confidence: number;
    source_name?: string | null;
    source_type?: string | null;
    source_reference?: string | null;
  };
  ingredients: AnalyzedProductIngredient[];
  allergen_statements: ProductAllergenStatement[];
  unresolved_ingredients: string[];
  aggregated_allergens: string[];
  aggregated_categories: string[];
  dietary_summary: {
    animal_derived?: string;
    vegetarian_compatible?: string;
    status?: string;
  };
  product_confidence: number;
  requires_verification: boolean;
  quality_summary: ProductQualitySummary;
  notes?: string | null;
}

// ============================================================
// PHASE 5: GROCERY RECEIPT INTELLIGENCE TYPES
// ============================================================

export type ReceiptProcessingStatus =
  | 'uploaded'
  | 'processing'
  | 'processed'
  | 'partial'
  | 'failed';

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  line_number: number;
  raw_text: string;
  product_name_raw?: string | null;
  product_name_normalized?: string | null;
  brand_hint?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  currency?: string | null;
  product_id?: string | null;
  product?: Product | null;
  candidate_products: Product[];
  match_method?: string | null;
  match_confidence?: number | null;
  requires_selection: boolean;
  requires_verification: boolean;
  user_corrected: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReceiptProcessingEvent {
  id: string;
  receipt_id: string;
  stage: string;
  status: string;
  message?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

export interface ReceiptCoverageSummary {
  total_items: number;
  matched: number;
  ambiguous: number;
  unknown: number;
  coverage_ratio: number;
}

export interface Receipt {
  id: string;
  owner_user_id: string;
  family_id?: string | null;
  original_filename?: string | null;
  storage_path?: string | null;
  image_url?: string | null;
  ocr_text?: string | null;
  processing_status: ReceiptProcessingStatus;
  ocr_confidence?: number | null;
  purchase_date?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total_amount?: number | null;
  items: ReceiptItem[];
  events: ReceiptProcessingEvent[];
  coverage?: ReceiptCoverageSummary | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptListResponse {
  items: Receipt[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface PurchasedProductItem {
  item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price?: number | null;
  total_price?: number | null;
  purchase_date?: string | null;
  source: string;
  product_analysis: ProductAnalysis | null;
}

export interface ReceiptAnalysisResponse {
  receipt_id: string;
  processing_status: ReceiptProcessingStatus;
  purchase_date?: string | null;
  currency: string;
  total_spend?: number | null;
  coverage: ReceiptCoverageSummary;
  ready_for_family_risk_engine: boolean;
  matched_products: PurchasedProductItem[];
  unresolved_items: ReceiptItem[];
  ocr_confidence?: number | null;
}

export interface ReceiptItemUpdateRequest {
  product_name_raw?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
}

export interface ReceiptManualItemCreateRequest {
  product_name: string;
  quantity?: number;
  price?: number;
}

// Phase 6 & 7 Family Risk Types
export * from './risk';

// Phase 8 Historical Grocery Intelligence Types
export * from './history';

// Product Alternatives & Allergy Substitutions
export interface ProductAlternativeItem {
  id: string;
  product_id: string;
  alternative_product_id?: string | null;
  alternative_name: string;
  alternative_brand?: string | null;
  alternative_category?: string | null;
  reason: string;
  target_allergen?: string | null;
  dietary_tags: string[];
  health_benefit?: string | null;
  confidence: number;
  is_curated: boolean;
}

export interface ProductAlternativesResponse {
  product_id: string;
  product_name: string;
  flagged_allergens: string[];
  dietary_conflicts: string[];
  total_alternatives: number;
  alternatives: ProductAlternativeItem[];
}

