-- ============================================================
-- Migration: 004_receipt_intelligence.sql
-- Description: Phase 5 Grocery Receipt Intelligence & Product Extraction
-- Tables: receipts, receipt_items, receipt_processing_events
-- ============================================================

-- 1. Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID REFERENCES families(id) ON DELETE SET NULL,
    original_filename TEXT,
    storage_path TEXT,
    image_url TEXT,
    ocr_text TEXT,
    processing_status TEXT NOT NULL DEFAULT 'uploaded',
    ocr_confidence NUMERIC,
    purchase_date TIMESTAMPTZ,
    subtotal NUMERIC,
    tax NUMERIC,
    total_amount NUMERIC,
    currency TEXT DEFAULT 'INR',
    image_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_owner ON receipts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_family ON receipts(family_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(processing_status);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);

-- 2. Receipt Items Table
CREATE TABLE IF NOT EXISTS receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    raw_text TEXT NOT NULL,
    product_name_raw TEXT,
    product_name_normalized TEXT,
    brand_hint TEXT,
    quantity NUMERIC DEFAULT 1.0,
    unit_price NUMERIC,
    total_price NUMERIC,
    currency TEXT DEFAULT 'INR',
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    match_method TEXT,
    match_confidence NUMERIC,
    requires_selection BOOLEAN NOT NULL DEFAULT false,
    requires_verification BOOLEAN NOT NULL DEFAULT false,
    user_corrected BOOLEAN NOT NULL DEFAULT false,
    candidate_product_ids TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_product ON receipt_items(product_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_selection ON receipt_items(requires_selection);

-- 3. Receipt Processing Events Table
CREATE TABLE IF NOT EXISTS receipt_processing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_events_receipt ON receipt_processing_events(receipt_id);
