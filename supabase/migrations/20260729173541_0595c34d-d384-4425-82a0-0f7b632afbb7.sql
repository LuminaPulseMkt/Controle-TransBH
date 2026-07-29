
CREATE TABLE public.trip_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Planilha de Viagem',
  sheet_date DATE NOT NULL DEFAULT CURRENT_DATE,
  phone TEXT,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX trip_sheets_sheet_date_idx ON public.trip_sheets(sheet_date DESC);
CREATE INDEX trip_sheets_created_by_idx ON public.trip_sheets(created_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_sheets TO authenticated;
GRANT ALL ON public.trip_sheets TO service_role;

ALTER TABLE public.trip_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_sheets_select_own_or_admin"
  ON public.trip_sheets FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'administrator'::public.app_role));

CREATE POLICY "trip_sheets_insert_own"
  ON public.trip_sheets FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "trip_sheets_update_own_or_admin"
  ON public.trip_sheets FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'administrator'::public.app_role))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'administrator'::public.app_role));

CREATE POLICY "trip_sheets_delete_own_or_admin"
  ON public.trip_sheets FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'administrator'::public.app_role));

CREATE TRIGGER update_trip_sheets_updated_at
  BEFORE UPDATE ON public.trip_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
