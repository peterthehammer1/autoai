-- 015: shop_closures — days the shop is closed (holidays, vacation, maintenance).
-- check_availability and book_appointment skip any date that has a row here.

CREATE TABLE IF NOT EXISTS shop_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    closure_date DATE NOT NULL UNIQUE,
    reason VARCHAR(200) NOT NULL,
    spoken_reason VARCHAR(200),
    -- Optional: shows on portal / dashboard (e.g. "Closed for Christmas").
    -- spoken_reason is used by Amber — may differ from the dashboard label
    -- (e.g. reason="Family vacation", spoken_reason="we're closed that day").
    created_by VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_closures_date ON shop_closures(closure_date);
