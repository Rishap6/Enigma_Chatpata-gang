-- ============================================================
-- Migration: 006_historical_grocery_intelligence.sql
-- Description: Phase 8 Historical Grocery Intelligence & Family Food Trend Engine
-- Tables: historical_risk_snapshots, product_purchase_history, family_trend_snapshots, member_trend_events
-- ============================================================

-- 1. Historical Risk Snapshots
CREATE TABLE IF NOT EXISTS historical_risk_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    risk_analysis_id UUID REFERENCES risk_analyses(id) ON DELETE SET NULL,
    purchase_date TIMESTAMPTZ,
    total_products INTEGER NOT NULL DEFAULT 0,
    matched_products INTEGER NOT NULL DEFAULT 0,
    unresolved_products INTEGER NOT NULL DEFAULT 0,
    high_attention_count INTEGER NOT NULL DEFAULT 0,
    potential_conflict_count INTEGER NOT NULL DEFAULT 0,
    verification_required_count INTEGER NOT NULL DEFAULT 0,
    insufficient_information_count INTEGER NOT NULL DEFAULT 0,
    no_configured_conflict_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historical_snapshots_family ON historical_risk_snapshots(family_id);
CREATE INDEX IF NOT EXISTS idx_historical_snapshots_receipt ON historical_risk_snapshots(receipt_id);
CREATE INDEX IF NOT EXISTS idx_historical_snapshots_date ON historical_risk_snapshots(purchase_date);

-- 2. Product Purchase History
CREATE TABLE IF NOT EXISTS product_purchase_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    purchase_date TIMESTAMPTZ,
    quantity NUMERIC(8, 2) DEFAULT 1.0,
    unit_price NUMERIC(10, 2),
    total_price NUMERIC(10, 2),
    match_confidence NUMERIC(4, 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prod_purchase_family ON product_purchase_history(family_id);
CREATE INDEX IF NOT EXISTS idx_prod_purchase_product ON product_purchase_history(product_id);
CREATE INDEX IF NOT EXISTS idx_prod_purchase_receipt ON product_purchase_history(receipt_id);
CREATE INDEX IF NOT EXISTS idx_prod_purchase_date ON product_purchase_history(purchase_date);

-- 3. Family Trend Snapshots
CREATE TABLE IF NOT EXISTS family_trend_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    period_type VARCHAR(50) NOT NULL,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_receipts INTEGER NOT NULL DEFAULT 0,
    total_purchased_products INTEGER NOT NULL DEFAULT 0,
    analyzed_products INTEGER NOT NULL DEFAULT 0,
    unresolved_products INTEGER NOT NULL DEFAULT 0,
    total_spend NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    attention_event_count INTEGER NOT NULL DEFAULT 0,
    verification_event_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_family_trends_family ON family_trend_snapshots(family_id);
CREATE INDEX IF NOT EXISTS idx_family_trends_period ON family_trend_snapshots(period_type, period_start, period_end);

-- 4. Member Trend Events
CREATE TABLE IF NOT EXISTS member_trend_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    finding_id UUID REFERENCES risk_findings(id) ON DELETE SET NULL,
    purchase_date TIMESTAMPTZ,
    conflict_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_trend_family ON member_trend_events(family_id);
CREATE INDEX IF NOT EXISTS idx_member_trend_member ON member_trend_events(member_id);
CREATE INDEX IF NOT EXISTS idx_member_trend_product ON member_trend_events(product_id);
CREATE INDEX IF NOT EXISTS idx_member_trend_date ON member_trend_events(purchase_date);
CREATE INDEX IF NOT EXISTS idx_member_trend_conflict ON member_trend_events(conflict_type);
CREATE INDEX IF NOT EXISTS idx_member_trend_status ON member_trend_events(status);
