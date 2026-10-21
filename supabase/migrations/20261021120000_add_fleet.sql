-- Frota: cadastro de carretas e guinchos + planilha de guinchos (por dia).
-- As planilhas de viagem existentes (trip_sheets, IDA/VOLTA) passam a ser as
-- "planilhas de carretas" e podem ser ligadas a uma carreta cadastrada.

CREATE TABLE public.fleet_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('carreta', 'guincho')),
  plate text NOT NULL,
  model text,
  year integer,
  capacity text,            -- carretas: nº de vagas / capacidade
  driver_name text,
  daily_rate numeric,       -- guinchos: valor padrão da diária
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX fleet_vehicles_kind_plate_key
  ON public.fleet_vehicles (kind, upper(regexp_replace(plate, '[^A-Za-z0-9]', '', 'g')));

ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View fleet with permission"
ON public.fleet_vehicles FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'transports.view'));

CREATE POLICY "Insert fleet with permission"
ON public.fleet_vehicles FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'transports.edit'));

CREATE POLICY "Update fleet with permission"
ON public.fleet_vehicles FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'transports.edit'))
WITH CHECK (public.has_permission(auth.uid(), 'transports.edit'));

CREATE POLICY "Delete fleet with permission"
ON public.fleet_vehicles FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'transports.delete'));

CREATE TRIGGER update_fleet_vehicles_updated_at
BEFORE UPDATE ON public.fleet_vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Planilha de viagem (carreta): vínculo opcional com a carreta cadastrada.
ALTER TABLE public.trip_sheets
  ADD COLUMN IF NOT EXISTS fleet_vehicle_id uuid REFERENCES public.fleet_vehicles(id) ON DELETE SET NULL;

-- Planilha de guincho: linhas por DIA (não por viagem).
CREATE TABLE public.tow_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Planilha de Guincho',
  fleet_vehicle_id uuid REFERENCES public.fleet_vehicles(id) ON DELETE SET NULL,
  driver_name text,
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  period_end date,
  phone text,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  expenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tow_sheets_period_idx ON public.tow_sheets(period_start DESC);
CREATE INDEX tow_sheets_created_by_idx ON public.tow_sheets(created_by);

ALTER TABLE public.tow_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tow_sheets_select_own_or_admin"
ON public.tow_sheets FOR SELECT TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'administrator'::public.app_role));

CREATE POLICY "tow_sheets_insert_own"
ON public.tow_sheets FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "tow_sheets_update_own_or_admin"
ON public.tow_sheets FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'administrator'::public.app_role))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'administrator'::public.app_role));

CREATE POLICY "tow_sheets_delete_own_or_admin"
ON public.tow_sheets FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'administrator'::public.app_role));

CREATE TRIGGER update_tow_sheets_updated_at
BEFORE UPDATE ON public.tow_sheets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
