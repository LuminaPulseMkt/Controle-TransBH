-- Item 9 of the client briefing: checklists should support photos, saved
-- to the transport's history. vehicle_checklists already has a transport_id
-- column (unused by the UI until now); this just adds photo storage,
-- following the same "everything as jsonb on the row" pattern already used
-- for items/tires/pickup/delivery on this table.

ALTER TABLE public.vehicle_checklists
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;
