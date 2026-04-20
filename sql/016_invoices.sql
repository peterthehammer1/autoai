-- 016: Invoicing — invoices, line items, customer address + tax fields.
-- Ported from DynastyAuto. Money is stored in integer cents everywhere to
-- avoid float precision issues. Invoice numbers are "INV-YYMM-XXXX" where
-- the sequence is tracked in settings (key: next_invoice_number).

-- Customer fields required for invoice snapshots (address bloc on the PDF,
-- tax-exempt flag to zero out HST for eligible customers).
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(200),
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(200),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS province VARCHAR(50),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_tax_exempt BOOLEAN NOT NULL DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(20) NOT NULL UNIQUE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,

    -- Snapshot of customer/vehicle info at invoice creation time. If the
    -- customer later changes their address or sells the vehicle, historical
    -- invoices still show what was billed.
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    customer_address TEXT,
    vehicle_description TEXT,
    vehicle_vin TEXT,
    vehicle_km INTEGER,

    is_tax_exempt BOOLEAN NOT NULL DEFAULT FALSE,
    tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.13,   -- 13% HST (Ontario default)
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    tax_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'void')),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,

    notes TEXT,               -- customer-visible
    internal_notes TEXT,      -- staff-only
    created_by UUID,          -- dashboard user id (no FK yet — users table may or may not exist)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    line_type VARCHAR(20) NOT NULL
        CHECK (line_type IN ('labor', 'part', 'fee', 'discount')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    part_number VARCHAR(100),
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    line_total_cents INTEGER NOT NULL DEFAULT 0,
    cost_cents INTEGER,             -- optional internal cost basis for margin reports
    is_taxable BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_appointment ON invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

-- Seed sequence + tax defaults. ON CONFLICT guards against re-running.
INSERT INTO settings (key, value) VALUES
    ('next_invoice_number', '1'),
    ('shop_supplies_pct', '0'),
    ('default_tax_rate', '0.13')
ON CONFLICT (key) DO NOTHING;
