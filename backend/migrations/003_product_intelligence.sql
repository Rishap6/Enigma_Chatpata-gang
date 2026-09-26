-- ============================================================
-- Migration: 003_product_intelligence.sql
-- Description: Phase 3 Product Intelligence Foundation
-- Tables: brands, product_categories, products,
--         product_identifiers, product_ingredients,
--         product_allergen_statements, product_data_sources
-- ============================================================

-- 1. Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    normalized_name TEXT NOT NULL UNIQUE,
    description TEXT,
    website TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_normalized_name ON brands(normalized_name);

-- 2. Product Categories Table (supports hierarchy)
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_category_id);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    barcode TEXT,
    gtin TEXT,
    pack_size TEXT,
    unit TEXT,
    serving_size TEXT,
    country TEXT,
    image_url TEXT,
    ingredients_raw TEXT,
    allergen_statement_raw TEXT,
    cross_contact_statement_raw TEXT,
    source_name TEXT,
    source_type TEXT,
    source_reference TEXT,
    confidence NUMERIC NOT NULL DEFAULT 1.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_normalized_name ON products(normalized_name);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_gtin ON products(gtin);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- 4. Product Identifiers Table
CREATE TABLE IF NOT EXISTS product_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    identifier_type TEXT NOT NULL,
    identifier_value TEXT NOT NULL,
    country TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_identifier_type_val UNIQUE (identifier_type, identifier_value)
);

CREATE INDEX IF NOT EXISTS idx_product_identifiers_val ON product_identifiers(identifier_value);
CREATE INDEX IF NOT EXISTS idx_product_identifiers_type_val ON product_identifiers(identifier_type, identifier_value);
CREATE INDEX IF NOT EXISTS idx_product_identifiers_product ON product_identifiers(product_id);

-- 5. Product Ingredients Table
CREATE TABLE IF NOT EXISTS product_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
    raw_name TEXT NOT NULL,
    normalized_name TEXT,
    sequence INTEGER NOT NULL,
    match_method TEXT,
    match_confidence NUMERIC,
    requires_verification BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient ON product_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_seq ON product_ingredients(product_id, sequence);

-- 6. Product Allergen Statements Table
CREATE TABLE IF NOT EXISTS product_allergen_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    statement_type TEXT NOT NULL,
    statement_text TEXT NOT NULL,
    confidence NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_allergen_statements_product ON product_allergen_statements(product_id);

-- 7. Product Data Sources Table
CREATE TABLE IF NOT EXISTS product_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    reference TEXT,
    retrieved_at TIMESTAMPTZ,
    confidence NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_data_sources_product ON product_data_sources(product_id);

-- Enable Row Level Security (RLS)
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_allergen_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_data_sources ENABLE ROW LEVEL SECURITY;

-- Read policies: Global shared knowledge readable by authenticated and anon roles
CREATE POLICY "Public read access for brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Public read access for product_categories" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Public read access for products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read access for product_identifiers" ON product_identifiers FOR SELECT USING (true);
CREATE POLICY "Public read access for product_ingredients" ON product_ingredients FOR SELECT USING (true);
CREATE POLICY "Public read access for product_allergen_statements" ON product_allergen_statements FOR SELECT USING (true);
CREATE POLICY "Public read access for product_data_sources" ON product_data_sources FOR SELECT USING (true);
