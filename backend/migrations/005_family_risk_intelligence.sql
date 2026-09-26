-- ============================================================
-- Migration: 005_family_risk_intelligence.sql
-- Description: Phase 6 Family Risk Engine & Explainable Traceability
-- Tables: risk_analyses, risk_findings, risk_finding_paths, risk_finding_evidence
-- ============================================================

-- 1. Risk Analyses Table
CREATE TABLE IF NOT EXISTS risk_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    analysis_version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    products_analyzed INTEGER NOT NULL DEFAULT 0,
    members_analyzed INTEGER NOT NULL DEFAULT 0,
    high_attention_count INTEGER NOT NULL DEFAULT 0,
    potential_conflict_count INTEGER NOT NULL DEFAULT 0,
    verification_count INTEGER NOT NULL DEFAULT 0,
    no_conflict_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_analyses_family ON risk_analyses(family_id);
CREATE INDEX IF NOT EXISTS idx_risk_analyses_receipt ON risk_analyses(receipt_id);
CREATE INDEX IF NOT EXISTS idx_risk_analyses_created ON risk_analyses(created_at DESC);

-- 2. Risk Findings Table
CREATE TABLE IF NOT EXISTS risk_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_analysis_id UUID NOT NULL REFERENCES risk_analyses(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'high_attention', 'potential_conflict', 'verification_required', 'no_configured_conflict', 'insufficient_information'
    risk_type TEXT NOT NULL, -- 'direct_allergen', 'derived_allergen', 'cross_contact', 'dietary_conflict', 'ingredient_exclusion', 'source_uncertainty', 'nutrition_preference', 'custom_rule', 'unknown'
    severity TEXT NOT NULL DEFAULT 'info', -- 'high', 'medium', 'low', 'info'
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    trigger_text TEXT,
    matched_rule TEXT,
    reason TEXT,
    confidence NUMERIC,
    attention_score NUMERIC DEFAULT 0.0,
    requires_verification BOOLEAN DEFAULT false,
    cross_contact BOOLEAN DEFAULT false,
    source_uncertainty BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_findings_analysis ON risk_findings(risk_analysis_id);
CREATE INDEX IF NOT EXISTS idx_risk_findings_member ON risk_findings(member_id);
CREATE INDEX IF NOT EXISTS idx_risk_findings_product ON risk_findings(product_id);
CREATE INDEX IF NOT EXISTS idx_risk_findings_status ON risk_findings(status);
CREATE INDEX IF NOT EXISTS idx_risk_findings_type ON risk_findings(risk_type);

-- 3. Risk Finding Paths Table (e.g. Sodium Caseinate -> Casein -> Milk)
CREATE TABLE IF NOT EXISTS risk_finding_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID NOT NULL REFERENCES risk_findings(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
    ingredient_name TEXT NOT NULL,
    relationship_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_paths_finding ON risk_finding_paths(finding_id);

-- 4. Risk Finding Evidence Table
CREATE TABLE IF NOT EXISTS risk_finding_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID NOT NULL REFERENCES risk_findings(id) ON DELETE CASCADE,
    evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,
    evidence_type TEXT,
    description TEXT,
    confidence NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_evidence_finding ON risk_finding_evidence(finding_id);
