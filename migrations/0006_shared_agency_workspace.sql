-- Consolidate the existing per-user business rows into the single Marketivity agency workspace.
-- The authenticated user id remains available for RBAC and audit attribution; this
-- migration only changes the owner key used by shared business records.
DO $$
DECLARE
  agency_owner text;
BEGIN
  SELECT id
    INTO agency_owner
    FROM "user"
  WHERE role = 'admin' AND status = 'active'
   ORDER BY "createdAt" ASC, id ASC
   LIMIT 1;

  IF agency_owner IS NULL THEN
    RAISE EXCEPTION 'Cannot consolidate agency data without an admin user';
  END IF;

  -- The existing unique indexes are scoped by user. Once rows share the
  -- agency owner, collisions would violate them (and could never be repaired
  -- safely by a migration). Refuse to proceed rather than change an invoice,
  -- receipt, transaction, or client identifier.
  IF EXISTS (
    SELECT 1 FROM clients GROUP BY client_code HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot consolidate agency data: duplicate client codes exist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM invoices GROUP BY invoice_number HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot consolidate agency data: duplicate invoice numbers exist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM payments GROUP BY transaction_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot consolidate agency data: duplicate transaction identifiers exist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM payments GROUP BY receipt_number HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot consolidate agency data: duplicate receipt numbers exist';
  END IF;

  UPDATE clients SET user_id = agency_owner WHERE user_id <> agency_owner;
  UPDATE services SET user_id = agency_owner WHERE user_id <> agency_owner;
  UPDATE invoices SET user_id = agency_owner WHERE user_id <> agency_owner;
  UPDATE invoice_items SET user_id = agency_owner WHERE user_id <> agency_owner;
  UPDATE payments SET user_id = agency_owner WHERE user_id <> agency_owner;

  CREATE TEMP TABLE agency_serial_max (
    kind text NOT NULL,
    year integer NOT NULL,
    last_number integer NOT NULL,
    PRIMARY KEY (kind, year)
  ) ON COMMIT DROP;

  INSERT INTO agency_serial_max (kind, year, last_number)
  SELECT kind, year, max(last_number)
    FROM serials
   GROUP BY kind, year;

  -- Preserve historical per-user serial rows. The shared owner receives the
  -- maximum used number for each kind/year, so new numbers cannot be reused.
  UPDATE serials AS s
     SET last_number = m.last_number
    FROM agency_serial_max AS m
   WHERE s.user_id = agency_owner
     AND s.kind = m.kind
     AND s.year = m.year
     AND s.last_number < m.last_number;

  INSERT INTO serials (user_id, kind, year, last_number)
  SELECT agency_owner, m.kind, m.year, m.last_number
    FROM agency_serial_max AS m
   WHERE NOT EXISTS (
     SELECT 1
       FROM serials AS s
      WHERE s.user_id = agency_owner
        AND s.kind = m.kind
        AND s.year = m.year
   );
END $$;

CREATE INDEX IF NOT EXISTS clients_shared_user_idx ON clients (user_id);
CREATE INDEX IF NOT EXISTS services_shared_user_idx ON services (user_id);
CREATE INDEX IF NOT EXISTS invoices_shared_user_idx ON invoices (user_id);
CREATE INDEX IF NOT EXISTS payments_shared_user_idx ON payments (user_id);
