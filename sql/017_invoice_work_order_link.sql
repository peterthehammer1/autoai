-- 017: Link invoices to work orders.
--
-- Before this migration, invoices could only be generated from a completed
-- appointment via POST /api/invoices/generate/:appointmentId. Work orders
-- live in a parallel flow — they have richer line items (parts, fees) that
-- don't round-trip through appointment_services. When a work order advances
-- to 'invoiced', we now auto-create an invoice from the WO's actual line
-- items (not the appointment's services).
--
-- The work_order_id column is optional — appointment-based invoice
-- generation is unchanged.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_work_order ON invoices(work_order_id);

-- Enforce at most one invoice per work order (idempotency).
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_work_order
  ON invoices(work_order_id) WHERE work_order_id IS NOT NULL;
