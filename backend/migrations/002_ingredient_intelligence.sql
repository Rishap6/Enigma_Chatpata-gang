-- ====================================================================
-- PHASE 2: INGREDIENT INTELLIGENCE FOUNDATION SCHEMA
-- Migration: 002_ingredient_intelligence.sql
-- Target: Supabase / PostgreSQL 14+
-- ====================================================================

-- 1. Evidence Table
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL, -- official, manufacturer, curated_dataset, trusted_database, scientific_reference, manual_review, system_derived
    reference TEXT,
    description TEXT,
    evidence_level VARCHAR(50) NOT NULL CHECK (evidence_level IN ('high', 'medium', 'low', 'unknown')),
    retrieved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ingredients Master Table
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    ingredient_type VARCHAR(100) NOT NULL, -- basic_ingredient, derived_ingredient, additive, compound, flour, protein, sweetener, emulsifier, preservative, flavoring, color, other
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_canonical ON ingredients(canonical_name);
CREATE INDEX IF NOT EXISTS idx_ingredients_type ON ingredients(ingredient_type);

-- 3. Ingredient Aliases Table
CREATE TABLE IF NOT EXISTS ingredient_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    alias VARCHAR(255) NOT NULL,
    alias_normalized VARCHAR(255) NOT NULL,
    alias_type VARCHAR(100), -- common_name, label_name, ins_code, e_number, abbreviation, regional_name, scientific_name
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aliases_normalized ON ingredient_aliases(alias_normalized);
CREATE INDEX IF NOT EXISTS idx_aliases_ingredient_id ON ingredient_aliases(ingredient_id);

-- 4. Ingredient Categories Table
CREATE TABLE IF NOT EXISTS ingredient_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON ingredient_categories(name);

-- 5. Ingredient Category Map Table
CREATE TABLE IF NOT EXISTS ingredient_category_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES ingredient_categories(id) ON DELETE CASCADE,
    confidence NUMERIC DEFAULT 1.0,
    evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,
    CONSTRAINT uq_ingredient_category UNIQUE (ingredient_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_catmap_ingredient ON ingredient_category_map(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_catmap_category ON ingredient_category_map(category_id);

-- 6. Allergens (Knowledge Model) Table
CREATE TABLE IF NOT EXISTS allergens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_allergens_name ON allergens(name);

-- 7. Ingredient Allergen Map Table
CREATE TABLE IF NOT EXISTS ingredient_allergen_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    allergen_id UUID NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL, -- contains, derived_from, associated_with, cross_contact_capable
    confidence NUMERIC DEFAULT 1.0,
    evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,
    CONSTRAINT uq_ingredient_allergen UNIQUE (ingredient_id, allergen_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_allerg_map_ingredient ON ingredient_allergen_map(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_allerg_map_allergen ON ingredient_allergen_map(allergen_id);

-- 8. Dietary Properties Table
CREATE TABLE IF NOT EXISTS dietary_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_dietary_properties_name ON dietary_properties(name);

-- 9. Ingredient Dietary Map Table
CREATE TABLE IF NOT EXISTS ingredient_dietary_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    dietary_property_id UUID NOT NULL REFERENCES dietary_properties(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('compatible', 'incompatible', 'uncertain')),
    confidence NUMERIC DEFAULT 1.0,
    evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,
    CONSTRAINT uq_ingredient_dietary UNIQUE (ingredient_id, dietary_property_id)
);

CREATE INDEX IF NOT EXISTS idx_dietmap_ingredient ON ingredient_dietary_map(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_dietmap_property ON ingredient_dietary_map(dietary_property_id);

-- 10. Ingredient Relationships (Graph-like) Table
CREATE TABLE IF NOT EXISTS ingredient_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL, -- derived_from, contains, part_of, alias_of, category_of, source_of, related_to, may_contain, produced_from
    target_ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    confidence NUMERIC DEFAULT 1.0,
    evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ingredient_rel UNIQUE (source_ingredient_id, relationship_type, target_ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_rel_source ON ingredient_relationships(source_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_rel_target ON ingredient_relationships(target_ingredient_id);

-- 11. Ingredient Sources Table
CREATE TABLE IF NOT EXISTS ingredient_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    source_type VARCHAR(100) NOT NULL, -- plant, animal, microbial, synthetic, mineral, milk, egg, fish, shellfish, mixed, unknown
    source_status VARCHAR(50) NOT NULL CHECK (source_status IN ('known', 'possible', 'unknown')),
    description TEXT,
    confidence NUMERIC DEFAULT 1.0,
    evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sources_ingredient ON ingredient_sources(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_sources_type ON ingredient_sources(source_type);

-- 12. Trigger for ingredients updated_at
DROP TRIGGER IF EXISTS trigger_ingredients_updated_at ON ingredients;
CREATE TRIGGER trigger_ingredients_updated_at
    BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ====================================================================
-- RLS POLICIES FOR INGREDIENT INTELLIGENCE
-- Public read-only knowledge base for authenticated & anon clients
-- ====================================================================

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_category_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_allergen_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_dietary_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read evidence" ON evidence FOR SELECT USING (true);
CREATE POLICY "Anyone can read ingredients" ON ingredients FOR SELECT USING (true);
CREATE POLICY "Anyone can read ingredient aliases" ON ingredient_aliases FOR SELECT USING (true);
CREATE POLICY "Anyone can read ingredient categories" ON ingredient_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can read ingredient category map" ON ingredient_category_map FOR SELECT USING (true);
CREATE POLICY "Anyone can read allergens knowledge" ON allergens FOR SELECT USING (true);
CREATE POLICY "Anyone can read ingredient allergen map" ON ingredient_allergen_map FOR SELECT USING (true);
CREATE POLICY "Anyone can read dietary properties" ON dietary_properties FOR SELECT USING (true);
CREATE POLICY "Anyone can read ingredient dietary map" ON ingredient_dietary_map FOR SELECT USING (true);
CREATE POLICY "Anyone can read ingredient relationships" ON ingredient_relationships FOR SELECT USING (true);
CREATE POLICY "Anyone can read ingredient sources" ON ingredient_sources FOR SELECT USING (true);
