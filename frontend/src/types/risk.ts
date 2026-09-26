export type RiskStatus =
  | 'high_attention'
  | 'potential_conflict'
  | 'verification_required'
  | 'no_configured_conflict'
  | 'insufficient_information';

export type RiskType =
  | 'direct_allergen'
  | 'derived_allergen'
  | 'cross_contact'
  | 'dietary_conflict'
  | 'ingredient_exclusion'
  | 'source_uncertainty'
  | 'nutrition_preference'
  | 'custom_rule'
  | 'unknown';

export type EvidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface RiskFindingPathStep {
  step_number: number;
  ingredient_name: string;
  relationship_type?: string | null;
  ingredient_id?: string | null;
}

export interface RiskFindingEvidence {
  evidence_type?: string | null;
  description?: string | null;
  confidence?: number | null;
  evidence_id?: string | null;
}

export interface RiskRelationshipStep {
  step_number: number;
  from_node: string;
  relationship: string;
  to_node: string;
  confidence?: number | null;
  notes?: string | null;
}

export interface RiskEvidenceItem {
  source: string;
  evidence_type: string;
  level: EvidenceLevel;
  confidence?: number | null;
  snippet?: string | null;
  reference?: string | null;
  evidence_id?: string | null;
  description?: string | null;
}

export interface RiskExplainability {
  finding_id?: string | null;
  member_id?: string | null;
  member_name?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  status: RiskStatus | string;
  conflict_type?: RiskType | string;
  risk_type: RiskType | string;
  headline?: string;
  title: string;
  summary: string;
  trigger?: string | null;
  configured_requirement?: string;
  rule: string;
  ingredient_chain?: string[];
  chain: string[];
  relationship_steps?: RiskRelationshipStep[];
  evidence: RiskEvidenceItem[];
  confidence: number;
  confidence_level?: EvidenceLevel;
  confidence_explanation?: string;
  attention_score: number;
  severity: string;
  requires_verification: boolean;
  cross_contact: boolean;
  source_uncertainty: boolean;
  uncertainty_reason?: string | null;
  verification_guidance?: string;
  disclaimer?: string;
  reason?: string | null;
}

export interface RiskFinding {
  id?: string;
  risk_analysis_id?: string;
  member_id: string;
  member_name?: string;
  product_id: string;
  product_name?: string;
  status: RiskStatus;
  risk_type: RiskType;
  severity: 'high' | 'medium' | 'low' | 'info' | string;
  title: string;
  summary: string;
  trigger_text?: string | null;
  matched_rule?: string | null;
  reason?: string | null;
  confidence?: number | null;
  attention_score: number;
  requires_verification: boolean;
  cross_contact: boolean;
  source_uncertainty: boolean;
  ingredient_path: RiskFindingPathStep[];
  evidence: RiskFindingEvidence[];
  explainability?: RiskExplainability;
  created_at?: string;
}

export interface MemberRiskCounts {
  high: number;
  potential: number;
  verification: number;
  no_conflict: number;
}

export interface MemberRiskResponse {
  member_id: string;
  member_name: string;
  summary: MemberRiskCounts;
  product_results: RiskFinding[];
}

export interface RiskAnalysisSummary {
  products_analyzed: number;
  members_analyzed: number;
  members_with_conflicts: number;
  high_priority: number;
  potential_conflicts: number;
  verification_required: number;
  no_configured_conflict: number;
}

export interface FamilyRiskMatrixCell {
  member_id: string;
  member_name: string;
  product_id: string;
  product_name: string;
  status: RiskStatus;
  findings_count: number;
  top_finding_title?: string | null;
  top_risk_type?: RiskType | string | null;
  attention_score: number;
  findings: RiskFinding[];
}

export interface RiskAnalysisResponse {
  id: string;
  family_id: string;
  receipt_id: string;
  analysis_version: string;
  status: string;
  analysis_timestamp?: string;
  summary: RiskAnalysisSummary;
  members: MemberRiskResponse[];
  matrix?: FamilyRiskMatrixCell[];
  created_at?: string;
}

export interface ProductFamilyImpactItem {
  member_id: string;
  member_name: string;
  status: RiskStatus;
  top_finding?: RiskFinding | null;
  findings: RiskFinding[];
}

export interface ProductRiskResponse {
  product_id: string;
  product_name: string;
  receipt_id: string;
  impacted_members: ProductFamilyImpactItem[];
}
