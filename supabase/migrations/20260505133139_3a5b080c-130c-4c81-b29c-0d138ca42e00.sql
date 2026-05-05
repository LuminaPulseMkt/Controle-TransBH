
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  whatsapp text,
  document text,
  base_city text,
  routes text,
  default_amount numeric NOT NULL DEFAULT 0,
  pricing_notes text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view partners"
  ON public.partners FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins insert partners"
  ON public.partners FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Admins update partners"
  ON public.partners FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Admins delete partners"
  ON public.partners FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.transports
  ADD COLUMN partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN partner_quoted_amount numeric,
  ADD COLUMN partner_notified_at timestamptz;

INSERT INTO public.message_templates (key, label, body) VALUES
('wa_partner_assignment', 'WhatsApp - Atribuição a parceiro',
'Olá {partner_name}! Tenho um transporte para você:

Código: {transport_code}
Cliente: {client_name}
Veículo: {vehicle}
Rota: {origin} → {destination}
Valor combinado: {partner_amount}

Obs: {notes}

Acompanhe: {tracking_link}')
ON CONFLICT (key) DO NOTHING;
