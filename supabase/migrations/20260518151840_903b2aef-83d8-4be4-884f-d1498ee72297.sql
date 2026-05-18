ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS generated_receivable_id uuid,
  ADD COLUMN IF NOT EXISTS generated_transport_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];