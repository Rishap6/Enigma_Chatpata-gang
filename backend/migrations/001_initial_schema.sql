-- ====================================================================
-- PHASE 1: FAMILY GROCERY ALLERGY & FOOD SAFETY INTELLIGENCE SCHEMA
-- Migration: 001_initial_schema.sql
-- Target: Supabase / PostgreSQL 14+
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table (for standalone auth or mapping to Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Families Table
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_families_owner ON families(owner_user_id);

-- 4. Family Members Table
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    age INTEGER CHECK (age >= 0 AND age <= 150),
    avatar TEXT,
    relationship VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);

-- 5. Allergies Table
CREATE TABLE IF NOT EXISTS allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allergies_member_id ON allergies(member_id);

-- 6. Dietary Rules Table
CREATE TABLE IF NOT EXISTS dietary_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    rule_type VARCHAR(100) NOT NULL,
    rule_value VARCHAR(100) NOT NULL,
    label VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dietary_rules_member_id ON dietary_rules(member_id);

-- 7. Ingredient Exclusions Table
CREATE TABLE IF NOT EXISTS ingredient_exclusions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingredient_exclusions_member_id ON ingredient_exclusions(member_id);

-- 8. Nutrition Preferences Table
CREATE TABLE IF NOT EXISTS nutrition_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    preference_type VARCHAR(100) NOT NULL,
    preference_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_preferences_member_id ON nutrition_preferences(member_id);

-- 9. Custom Rules Table
CREATE TABLE IF NOT EXISTS custom_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    rule_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_rules_member_id ON custom_rules(member_id);

-- 10. Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    whatsapp_number VARCHAR(50),
    relationship VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_member_id ON emergency_contacts(member_id);

-- 11. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL UNIQUE REFERENCES family_members(id) ON DELETE CASCADE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_call_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_member_id ON notification_preferences(member_id);

-- 12. Automated Updated_At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_families_updated_at ON families;
CREATE TRIGGER trigger_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_family_members_updated_at ON family_members;
CREATE TRIGGER trigger_family_members_updated_at
    BEFORE UPDATE ON family_members
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_emergency_contacts_updated_at ON emergency_contacts;
CREATE TRIGGER trigger_emergency_contacts_updated_at
    BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- Ensures user A cannot view or manipulate family B data
-- ====================================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Families Policy
CREATE POLICY "Users can manage their own families"
ON families
FOR ALL
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

-- Family Members Policy
CREATE POLICY "Users can manage members of their families"
ON family_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM families
        WHERE families.id = family_members.family_id
        AND families.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM families
        WHERE families.id = family_members.family_id
        AND families.owner_user_id = auth.uid()
    )
);

-- Allergies Policy
CREATE POLICY "Users can manage allergies of their family members"
ON allergies
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = allergies.member_id
        AND families.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = allergies.member_id
        AND families.owner_user_id = auth.uid()
    )
);

-- Dietary Rules Policy
CREATE POLICY "Users can manage dietary rules of their family members"
ON dietary_rules
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = dietary_rules.member_id
        AND families.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = dietary_rules.member_id
        AND families.owner_user_id = auth.uid()
    )
);

-- Ingredient Exclusions Policy
CREATE POLICY "Users can manage ingredient exclusions of their family members"
ON ingredient_exclusions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = ingredient_exclusions.member_id
        AND families.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = ingredient_exclusions.member_id
        AND families.owner_user_id = auth.uid()
    )
);

-- Nutrition Preferences Policy
CREATE POLICY "Users can manage nutrition preferences of their family members"
ON nutrition_preferences
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = nutrition_preferences.member_id
        AND families.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = nutrition_preferences.member_id
        AND families.owner_user_id = auth.uid()
    )
);

-- Custom Rules Policy
CREATE POLICY "Users can manage custom rules of their family members"
ON custom_rules
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = custom_rules.member_id
        AND families.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = custom_rules.member_id
        AND families.owner_user_id = auth.uid()
    )
);

-- Emergency Contacts Policy
CREATE POLICY "Users can manage emergency contacts of their family members"
ON emergency_contacts
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = emergency_contacts.member_id
        AND families.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = emergency_contacts.member_id
        AND families.owner_user_id = auth.uid()
    )
);

-- Notification Preferences Policy
CREATE POLICY "Users can manage notification preferences of their family members"
ON notification_preferences
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = notification_preferences.member_id
        AND families.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM family_members
        JOIN families ON families.id = family_members.family_id
        WHERE family_members.id = notification_preferences.member_id
        AND families.owner_user_id = auth.uid()
    )
);
