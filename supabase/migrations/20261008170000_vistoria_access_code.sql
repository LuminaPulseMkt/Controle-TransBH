-- Vistoria (Fase 2): acesso por acionamento com código + placa.
-- Cada vistoria ganha um código curto (6 caracteres, sem 0/O/1/I/L) que o
-- motorista digita junto com a placa em /vistoria para abrir o formulário,
-- sem precisar do link longo.

CREATE OR REPLACE FUNCTION public.gen_vistoria_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  result text;
  i int;
BEGIN
  LOOP
    bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    result := '';
    FOR i IN 0..5 LOOP
      result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vistorias WHERE access_code = result);
  END LOOP;
  RETURN result;
END;
$$;

ALTER TABLE public.vistorias ADD COLUMN access_code text;

UPDATE public.vistorias SET access_code = public.gen_vistoria_code() WHERE access_code IS NULL;

ALTER TABLE public.vistorias
  ALTER COLUMN access_code SET NOT NULL,
  ALTER COLUMN access_code SET DEFAULT public.gen_vistoria_code();

CREATE UNIQUE INDEX vistorias_access_code_key ON public.vistorias (access_code);

-- Devolve o token somente se código + placa conferem e a vistoria ainda está aberta.
CREATE OR REPLACE FUNCTION public.find_vistoria_token(_code text, _plate text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.token
  FROM public.vistorias v
  JOIN public.transports t ON t.id = v.transport_id
  WHERE v.access_code = upper(btrim(_code))
    AND upper(regexp_replace(t.vehicle_plate, '[^A-Za-z0-9]', '', 'g'))
        = upper(regexp_replace(_plate, '[^A-Za-z0-9]', '', 'g'))
    AND v.status <> 'finalizada'
    AND v.expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_vistoria_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_vistoria_token(text, text) TO anon, authenticated;
