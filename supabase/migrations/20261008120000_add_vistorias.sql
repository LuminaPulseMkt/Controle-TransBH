-- Vistoria por acionamento (Fase 1).
-- Cada transporte pode ter uma vistoria de COLETA e uma de ENTREGA, acessadas
-- por um link público com token (sem login). O acesso anônimo é feito apenas
-- por funções SECURITY DEFINER escopadas ao token; a tabela em si só é
-- visível para a equipe autenticada.

CREATE TABLE public.vistorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  transport_id uuid NOT NULL REFERENCES public.transports(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('coleta', 'entrega')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'finalizada')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  finished_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vistorias_transport ON public.vistorias(transport_id, created_at DESC);

ALTER TABLE public.vistorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View vistorias with permission"
ON public.vistorias FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'transports.view'));

CREATE POLICY "Insert vistorias with permission"
ON public.vistorias FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'transports.edit'));

CREATE POLICY "Update vistorias with permission"
ON public.vistorias FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'transports.edit'))
WITH CHECK (public.has_permission(auth.uid(), 'transports.edit'));

CREATE POLICY "Delete vistorias with permission"
ON public.vistorias FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'transports.delete'));

CREATE TRIGGER update_vistorias_updated_at
BEFORE UPDATE ON public.vistorias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Leitura pública (por token): dados do veículo/transporte + estado da vistoria
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_vistoria_by_token(_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', v.id,
    'kind', v.kind,
    'status', v.status,
    'data', v.data,
    'expires_at', v.expires_at,
    'expired', (v.expires_at < now() AND v.status <> 'finalizada'),
    'finished_at', v.finished_at,
    'transport', jsonb_build_object(
      'code', t.code,
      'client_name', t.client_name,
      'client_phone', t.client_phone,
      'client_email', t.client_email,
      'client_document', t.client_document,
      'vehicle_plate', t.vehicle_plate,
      'vehicle_brand', t.vehicle_brand,
      'vehicle_model', t.vehicle_model,
      'vehicle_color', t.vehicle_color,
      'vehicle_year', t.vehicle_year,
      'vehicle_chassis', t.vehicle_chassis,
      'origin_city', t.origin_city,
      'origin_state', t.origin_state,
      'destination_city', t.destination_city,
      'destination_state', t.destination_state
    )
  )
  FROM public.vistorias v
  JOIN public.transports t ON t.id = v.transport_id
  WHERE v.token = _token
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Gravação pública (por token): salva rascunho ou finaliza
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_vistoria_by_token(
  _token text,
  _data jsonb,
  _finalize boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.vistorias%ROWTYPE;
BEGIN
  IF _data IS NULL OR jsonb_typeof(_data) <> 'object' THEN
    RAISE EXCEPTION 'invalid_data';
  END IF;
  IF pg_column_size(_data) > 500000 THEN
    RAISE EXCEPTION 'data_too_large';
  END IF;

  SELECT * INTO v FROM public.vistorias WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF v.status = 'finalizada' THEN
    RAISE EXCEPTION 'already_finalized';
  END IF;
  IF v.expires_at < now() THEN
    RAISE EXCEPTION 'expired';
  END IF;

  IF _finalize THEN
    UPDATE public.vistorias
       SET data = _data, status = 'finalizada', finished_at = now()
     WHERE id = v.id;

    INSERT INTO public.transport_events (transport_id, event_type, description, created_by)
    VALUES (
      v.transport_id,
      'vistoria_finalizada',
      'Vistoria de ' || v.kind || ' finalizada pelo link público',
      NULL
    );
    RETURN 'finalizada';
  ELSE
    UPDATE public.vistorias
       SET data = _data, status = 'em_andamento'
     WHERE id = v.id;
    RETURN 'em_andamento';
  END IF;
END;
$$;

-- Usada pela política de storage: o token existe, não expirou e não foi finalizado.
CREATE OR REPLACE FUNCTION public.vistoria_token_is_open(_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vistorias
    WHERE token = _token AND status <> 'finalizada' AND expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.get_vistoria_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_vistoria_by_token(text, jsonb, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vistoria_token_is_open(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vistoria_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_vistoria_by_token(text, jsonb, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vistoria_token_is_open(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Upload de fotos/assinatura sem login: somente em vistorias/<token>/... e
-- somente enquanto o token estiver aberto.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public upload vistoria files" ON storage.objects;
CREATE POLICY "Public upload vistoria files"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'transport-photos'
  AND (storage.foldername(name))[1] = 'vistorias'
  AND public.vistoria_token_is_open((storage.foldername(name))[2])
);
