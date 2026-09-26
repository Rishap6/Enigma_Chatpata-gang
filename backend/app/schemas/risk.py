import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class RiskFindingPathStep(BaseModel):
    step_number: int
    ingredient_name: str
    relationship_type: Optional[str] = None
    ingredient_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


class RiskFindingEvidenceSchema(BaseModel):
    evidence_type: Optional[str] = None
    description: Optional[str] = None
    confidence: Optional[float] = None
    evidence_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


class RiskRelationshipStep(BaseModel):
    step_number: int
    from_node: str
    relationship: str
    to_node: str
    confidence: Optional[float] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RiskEvidenceItem(BaseModel):
    source: str
    evidence_type: str
    level: str = "high"  # high | medium | low | unknown
    confidence: Optional[float] = None
    snippet: Optional[str] = None
    reference: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RiskExplainabilitySchema(BaseModel):
    finding_id: Optional[uuid.UUID] = None
    member_id: Optional[uuid.UUID] = None
    member_name: Optional[str] = None
    product_id: Optional[uuid.UUID] = None
    product_name: Optional[str] = None
    status: str
    conflict_type: str
    risk_type: str
    headline: str
    title: str
    summary: str
    trigger: Optional[str] = None
    configured_requirement: str
    rule: str
    ingredient_chain: List[str] = []
    chain: List[str] = []
    relationship_steps: List[RiskRelationshipStep] = []
    evidence: List[Dict[str, Any]] = []
    confidence: float
    confidence_level: str = "high"
    confidence_explanation: str = "Confidence reflects the available product/ingredient evidence and matching quality. It is not a probability of an allergic reaction."
    attention_score: float = 0.0
    severity: str = "info"
    requires_verification: bool = False
    cross_contact: bool = False
    source_uncertainty: bool = False
    uncertainty_reason: Optional[str] = None
    verification_guidance: str = "Always verify the physical packaging and current manufacturer ingredient label before consumption."
    disclaimer: str = (
        "This is an informational decision-support tool based on your family's configured requirements "
        "and available product label data. It does not diagnose medical conditions, predict allergic reactions, "
        "or guarantee that food is 100% safe. Always inspect physical packaging before consumption."
    )
    reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RiskFindingResponse(BaseModel):
    id: Optional[uuid.UUID] = None
    risk_analysis_id: Optional[uuid.UUID] = None
    member_id: uuid.UUID
    member_name: Optional[str] = None
    product_id: uuid.UUID
    product_name: Optional[str] = None
    status: str
    risk_type: str
    severity: str
    title: str
    summary: str
    trigger_text: Optional[str] = None
    matched_rule: Optional[str] = None
    reason: Optional[str] = None
    confidence: Optional[float] = None
    attention_score: float = 0.0
    requires_verification: bool = False
    cross_contact: bool = False
    source_uncertainty: bool = False
    ingredient_path: List[RiskFindingPathStep] = []
    evidence: List[RiskFindingEvidenceSchema] = []
    explainability: Optional[RiskExplainabilitySchema] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MemberRiskCounts(BaseModel):
    high: int = 0
    potential: int = 0
    verification: int = 0
    no_conflict: int = 0


class MemberRiskResponse(BaseModel):
    member_id: uuid.UUID
    member_name: str
    summary: MemberRiskCounts
    product_results: List[RiskFindingResponse] = []


class RiskAnalysisSummary(BaseModel):
    products_analyzed: int = 0
    members_analyzed: int = 0
    members_with_conflicts: int = 0
    high_priority: int = 0
    potential_conflicts: int = 0
    verification_required: int = 0
    no_configured_conflict: int = 0


class FamilyRiskMatrixCell(BaseModel):
    member_id: uuid.UUID
    member_name: str
    product_id: uuid.UUID
    product_name: str
    status: str
    findings_count: int = 0
    top_finding_title: Optional[str] = None
    top_risk_type: Optional[str] = None
    attention_score: float = 0.0
    findings: List[RiskFindingResponse] = []


class RiskAnalysisResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    receipt_id: uuid.UUID
    analysis_version: str
    status: str
    analysis_timestamp: Optional[datetime] = None
    summary: RiskAnalysisSummary
    members: List[MemberRiskResponse] = []
    matrix: Optional[List[FamilyRiskMatrixCell]] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProductFamilyImpactItem(BaseModel):
    member_id: uuid.UUID
    member_name: str
    status: str
    top_finding: Optional[RiskFindingResponse] = None
    findings: List[RiskFindingResponse] = []


class ProductRiskResponse(BaseModel):
    product_id: uuid.UUID
    product_name: str
    receipt_id: uuid.UUID
    impacted_members: List[ProductFamilyImpactItem] = []
