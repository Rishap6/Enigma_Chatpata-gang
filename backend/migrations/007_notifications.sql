-- Phase 9: In-app household notifications (alerts)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    recipient_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    source_type TEXT NOT NULL,
    source_id TEXT,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
    finding_id UUID REFERENCES risk_findings(id) ON DELETE SET NULL,
    dedupe_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    CONSTRAINT uq_notifications_family_dedupe UNIQUE (family_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notifications_family_id ON notifications(family_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_member_id ON notifications(recipient_member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_finding_id ON notifications(finding_id);
CREATE INDEX IF NOT EXISTS idx_notifications_receipt_id ON notifications(receipt_id);
CREATE INDEX IF NOT EXISTS idx_notifications_product_id ON notifications(product_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage notifications of their families"
ON notifications
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM families
        WHERE families.id = notifications.family_id
        AND families.owner_user_id = auth.uid()
    )
);
