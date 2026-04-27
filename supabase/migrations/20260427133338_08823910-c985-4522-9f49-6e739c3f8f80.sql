-- 1. Add location tracking columns to transports
ALTER TABLE public.transports
  ADD COLUMN IF NOT EXISTS current_location text,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- 2. Create history table for location updates
CREATE TABLE IF NOT EXISTS public.transport_location_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES public.transports(id) ON DELETE CASCADE,
  location text NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_location_updates_transport
  ON public.transport_location_updates (transport_id, created_at DESC);

ALTER TABLE public.transport_location_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view location updates"
  ON public.transport_location_updates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert location updates"
  ON public.transport_location_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins delete location updates"
  ON public.transport_location_updates
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'administrator'::app_role));