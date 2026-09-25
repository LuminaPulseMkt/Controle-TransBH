-- Items 10, 11 and 12 of the client briefing: track the real internal costs
-- of each transport (pickup, boarding, other), separate from the existing
-- partner_quoted_amount field (client's choice: these are different costs
-- that coexist). Custo total = cost_pickup + cost_boarding + cost_other,
-- computed client-side. This data lives only on the internal transports
-- table — never on documents/contracts, so it can't leak to the client
-- (item 11).

ALTER TABLE public.transports
  ADD COLUMN IF NOT EXISTS cost_pickup numeric,
  ADD COLUMN IF NOT EXISTS cost_boarding numeric,
  ADD COLUMN IF NOT EXISTS cost_other numeric,
  ADD COLUMN IF NOT EXISTS cost_notes text;
