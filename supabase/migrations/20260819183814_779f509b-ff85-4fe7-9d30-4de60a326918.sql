CREATE TABLE public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    whatsapp text NOT NULL,
    email text,
    origin text NOT NULL,
    destination text NOT NULL,
    vehicle_type text NOT NULL,
    vehicle_quantity integer NOT NULL DEFAULT 1,
    message text,
    created_at timestamptz DEFAULT now()
);

GRANT INSERT ON public.leads TO anon;
GRANT SELECT, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead" ON public.leads
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Admins can view leads" ON public.leads
    FOR SELECT TO authenticated USING (true);
