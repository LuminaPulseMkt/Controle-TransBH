-- Item 7: "Responsável pelo fechamento" — who (which employee/salesperson)
-- closed the deal, explicitly selectable and stored per transport.
ALTER TABLE public.transports
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Default closed_by to whoever created the budget/contract when a transport
-- is auto-generated from an accepted budget (accept_budget_by_token).
CREATE OR REPLACE FUNCTION public.accept_budget_by_token(
  _token text,
  _estimated_delivery date DEFAULT NULL,
  _client_signature_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  budget documents%rowtype;
  contract_id uuid;
  contract_token text;
  contract_due date := current_date + 7;
  receivable_id uuid;
  first_transport_id uuid;
  transport_ids uuid[] := '{}';
  body jsonb;
  vehicle jsonb;
  vehicles jsonb;
  origin_raw text;
  destination_raw text;
  origin_city text;
  origin_state text;
  destination_city text;
  destination_state text;
  total_amount numeric;
  plate text;
  vehicle_type_text text;
  first_vehicle jsonb := '{}'::jsonb;
  clauses text;
  budget_notes text;
  budget_client_address text;
  company_name text := 'TransBH';
  amount_brl text;
  due_br text;
begin
  if _token is null or length(_token) < 10 then
    return jsonb_build_object('ok', false, 'error', 'Documento não encontrado.');
  end if;

  select * into budget
  from public.documents
  where public_token = _token
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Documento não encontrado.');
  end if;

  if budget.doc_type <> 'budget'::document_type then
    return jsonb_build_object('ok', false, 'error', 'Apenas orçamentos podem ser aceitos.');
  end if;

  if budget.accepted_at is not null and budget.accepted_contract_id is not null then
    select public_token into contract_token from public.documents where id = budget.accepted_contract_id;
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'contract_token', contract_token,
      'accepted_at', budget.accepted_at,
      'receivable', case when budget.accepted_receivable_id is not null then (
        select jsonb_build_object('amount', amount, 'due_date', due_date) from public.receivables where id = budget.accepted_receivable_id
      ) else null end,
      'vehicle', case when budget.accepted_transport_id is not null then (
        select jsonb_build_object('plate', vehicle_plate, 'brand', vehicle_brand, 'model', vehicle_model) from public.transports where id = budget.accepted_transport_id
      ) else null end,
      'client_name', budget.client_name
    );
  end if;

  body := coalesce(budget.body, '{}'::jsonb);
  total_amount := coalesce(budget.total_amount, 0);
  origin_raw := coalesce(body->>'origin', 'A definir');
  destination_raw := coalesce(body->>'destination', 'A definir');
  budget_notes := nullif(body->>'notes', '');
  budget_client_address := nullif(body->>'client_address', '');

  origin_city := trim(regexp_replace(origin_raw, '\s*[\/\-,]\s*[A-Za-z]{2}\s*$', ''));
  origin_state := upper(coalesce(nullif(substring(origin_raw from '[\/\-,]\s*([A-Za-z]{2})\s*$'), ''), '--'));
  destination_city := trim(regexp_replace(destination_raw, '\s*[\/\-,]\s*[A-Za-z]{2}\s*$', ''));
  destination_state := upper(coalesce(nullif(substring(destination_raw from '[\/\-,]\s*([A-Za-z]{2})\s*$'), ''), '--'));

  if origin_city = '' then origin_city := 'A definir'; end if;
  if destination_city = '' then destination_city := 'A definir'; end if;

  select name into company_name from public.company_settings limit 1;
  company_name := coalesce(company_name, 'TransBH');
  amount_brl := 'R$ ' || replace(replace(replace(to_char(total_amount, 'FM999G999G999G990D00'), ',', '#'), '.', ','), '#', '.');
  due_br := to_char(contract_due, 'DD/MM/YYYY');

  select mt.body into clauses
  from public.message_templates mt
  where mt.key = 'contract_clauses_default'
  limit 1;

  if clauses is not null then
    clauses := replace(clauses, '{client_name}', coalesce(budget.client_name, ''));
    clauses := replace(clauses, '{title}', coalesce(budget.title, ''));
    clauses := replace(clauses, '{amount}', amount_brl);
    clauses := replace(clauses, '{due_date}', due_br);
    clauses := replace(clauses, '{company_name}', company_name);
  else
    clauses := coalesce(budget_notes, '');
  end if;

  insert into public.documents (
    doc_type, template, title, client_name, client_document, client_phone,
    client_email, body, total_amount, created_by,
    client_signature_url, signed_at
  ) values (
    'contract'::document_type,
    coalesce(budget.template, 'standard'::contract_template),
    'Contrato — ' || budget.title,
    budget.client_name,
    budget.client_document,
    budget.client_phone,
    budget.client_email,
    jsonb_set(body, '{notes}', to_jsonb(clauses), true),
    budget.total_amount,
    budget.created_by,
    _client_signature_url,
    case when _client_signature_url is not null then now() else null end
  ) returning id, public_token into contract_id, contract_token;

  vehicles := case
    when jsonb_typeof(body->'vehicles') = 'array' and jsonb_array_length(body->'vehicles') > 0 then body->'vehicles'
    else jsonb_build_array(jsonb_build_object(
      'description', body->>'vehicle',
      'plate', body->>'vehicle_plate',
      'chassis', body->>'vehicle_chassis',
      'color', body->>'vehicle_color',
      'type', 'sedan',
      'value', coalesce((body->>'service_value')::numeric, total_amount)
    ))
  end;

  for vehicle in select value from jsonb_array_elements(vehicles)
  loop
    if first_vehicle = '{}'::jsonb then
      first_vehicle := vehicle;
    end if;

    plate := upper(replace(coalesce(nullif(vehicle->>'plate', ''), 'A DEFINIR'), ' ', ''));
    vehicle_type_text := coalesce(nullif(vehicle->>'type', ''), 'sedan');
    if vehicle_type_text not in ('motorcycle', 'sedan', 'hatch', 'caminhonete', 'suv') then
      vehicle_type_text := 'sedan';
    end if;

    insert into public.transports (
      client_name, client_document, client_phone, client_email, client_address,
      origin_city, origin_state,
      destination_city, destination_state, vehicle_plate, vehicle_type,
      vehicle_brand, vehicle_model, vehicle_year, vehicle_color, vehicle_chassis, notes,
      estimated_delivery, status, created_by, closed_by
    ) values (
      budget.client_name,
      budget.client_document,
      budget.client_phone,
      budget.client_email,
      budget_client_address,
      origin_city,
      origin_state,
      destination_city,
      destination_state,
      plate,
      vehicle_type_text::vehicle_type,
      nullif(vehicle->>'brand', ''),
      coalesce(nullif(vehicle->>'model', ''), nullif(vehicle->>'description', '')),
      nullif(vehicle->>'year', '')::integer,
      nullif(vehicle->>'color', ''),
      nullif(vehicle->>'chassis', ''),
      concat_ws(
        E'\n\n',
        case when nullif(vehicle->>'description', '') is not null then 'Veículo: ' || (vehicle->>'description') else null end,
        budget_notes
      ),
      _estimated_delivery,
      'aguardando_coleta'::transport_status,
      budget.created_by,
      budget.created_by
    ) returning id into first_transport_id;

    transport_ids := array_append(transport_ids, first_transport_id);
  end loop;

  first_transport_id := transport_ids[1];

  insert into public.receivables (
    client_name, client_phone, client_email, amount, due_date, status, description, transport_id
  ) values (
    budget.client_name,
    budget.client_phone,
    budget.client_email,
    total_amount,
    contract_due,
    'pending'::payment_status,
    'Aceite do orçamento "' || budget.title || '"',
    first_transport_id
  ) returning id into receivable_id;

  update public.documents
  set accepted_at = now(),
      accepted_contract_id = contract_id,
      accepted_transport_id = first_transport_id,
      accepted_receivable_id = receivable_id
  where id = budget.id;

  update public.documents
  set generated_at = now(),
      generated_receivable_id = receivable_id,
      generated_transport_ids = transport_ids
  where id = contract_id;

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'contract_token', contract_token,
    'accepted_at', now(),
    'receivable', jsonb_build_object('amount', total_amount, 'due_date', contract_due),
    'vehicle', jsonb_build_object(
      'plate', upper(replace(coalesce(nullif(first_vehicle->>'plate', ''), 'A DEFINIR'), ' ', '')),
      'brand', nullif(first_vehicle->>'brand', ''),
      'model', coalesce(nullif(first_vehicle->>'model', ''), nullif(first_vehicle->>'description', ''))
    ),
    'client_name', budget.client_name
  );
exception
  when others then
    raise log 'accept_budget_by_token failed for token %: %', _token, sqlerrm;
    return jsonb_build_object('ok', false, 'error', 'Não foi possível processar a solicitação. Tente novamente.');
end;
$function$;

REVOKE ALL ON FUNCTION public.accept_budget_by_token(text, date, text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_budget_by_token(text, date, text) TO anon, authenticated;

-- Item 22: transport history / event log.
CREATE TABLE public.transport_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES public.transports(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view transport events"
ON public.transport_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own transport events"
ON public.transport_events FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE INDEX idx_transport_events_transport ON public.transport_events(transport_id, created_at);

-- Auto-log creation and status changes regardless of which code path wrote
-- them (RPC, manual form, etc.) — more reliable than instrumenting every
-- call site.
CREATE OR REPLACE FUNCTION public.log_transport_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transport_events (transport_id, event_type, description, created_by)
    VALUES (NEW.id, 'created', 'Transporte criado', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.transport_events (transport_id, event_type, description, created_by)
    VALUES (NEW.id, 'status_changed', 'Status alterado para ' || NEW.status::text, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transport_events
AFTER INSERT OR UPDATE ON public.transports
FOR EACH ROW EXECUTE FUNCTION public.log_transport_event();
