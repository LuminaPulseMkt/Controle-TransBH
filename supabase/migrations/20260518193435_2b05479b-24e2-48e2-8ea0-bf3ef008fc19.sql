CREATE TABLE public.vehicle_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid REFERENCES public.transports(id) ON DELETE SET NULL,
  client_name text,
  plate text,
  model text,
  dut text,
  color text,
  km text,
  location text,
  checklist_date date DEFAULT CURRENT_DATE,
  checklist_time text,
  items jsonb NOT NULL DEFAULT '{}'::jsonb,
  tires jsonb NOT NULL DEFAULT '[]'::jsonb,
  fuel_level text,
  observations text,
  pickup jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view checklists" ON public.vehicle_checklists
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert checklists" ON public.vehicle_checklists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update checklists" ON public.vehicle_checklists
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins delete checklists" ON public.vehicle_checklists
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE TRIGGER update_vehicle_checklists_updated_at
  BEFORE UPDATE ON public.vehicle_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_vehicle_checklists_transport ON public.vehicle_checklists(transport_id);
CREATE INDEX idx_vehicle_checklists_created_at ON public.vehicle_checklists(created_at DESC);