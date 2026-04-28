ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS google_review_url text;

CREATE TABLE public.transport_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_code text,
  client_name text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
ON public.transport_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (rating BETWEEN 1 AND 5);

CREATE POLICY "Admins view feedback"
ON public.transport_feedback
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Admins delete feedback"
ON public.transport_feedback
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'administrator'::app_role));