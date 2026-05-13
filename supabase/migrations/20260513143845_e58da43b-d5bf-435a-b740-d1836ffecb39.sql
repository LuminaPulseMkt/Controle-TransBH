-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('administrator', 'collaborator');
CREATE TYPE public.transport_status AS ENUM ('pending', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE public.vehicle_type AS ENUM ('car', 'motorcycle', 'truck', 'machinery');
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'overdue', 'negotiated', 'partial');
CREATE TYPE public.document_type AS ENUM ('budget', 'contract');
CREATE TYPE public.contract_template AS ENUM ('standard', 'fragile', 'express');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT, email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$ SELECT auth.uid() IS NOT NULL $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT; assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN assigned_role := 'administrator'; ELSE assigned_role := 'collaborator'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "View own role or admin views all" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

CREATE TABLE public.transports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE DEFAULT ('TR-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random()*10000))::text, 4, '0')),
  vehicle_plate TEXT NOT NULL, vehicle_brand TEXT, vehicle_model TEXT, vehicle_year INT, vehicle_color TEXT, vehicle_chassis TEXT,
  vehicle_type public.vehicle_type NOT NULL DEFAULT 'car',
  origin_city TEXT NOT NULL, origin_state TEXT NOT NULL, destination_city TEXT NOT NULL, destination_state TEXT NOT NULL,
  client_name TEXT NOT NULL, client_document TEXT, client_phone TEXT,
  driver_name TEXT, estimated_delivery DATE,
  status public.transport_status NOT NULL DEFAULT 'pending',
  notes TEXT, photo_url TEXT,
  current_location text, location_updated_at timestamptz,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_transports_updated BEFORE UPDATE ON public.transports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Authenticated view transports" ON public.transports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert transports" ON public.transports FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update transports" ON public.transports FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins delete transports" ON public.transports FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

CREATE TABLE public.transport_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id UUID NOT NULL REFERENCES public.transports(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL, caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view photos" ON public.transport_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert photos" ON public.transport_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete photos" ON public.transport_photos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TABLE public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id UUID REFERENCES public.transports(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL, client_phone TEXT, client_email TEXT, description TEXT,
  amount NUMERIC(12,2) NOT NULL, due_date DATE NOT NULL, paid_at DATE,
  paid_amount numeric,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_receivables_updated BEFORE UPDATE ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins view receivables" ON public.receivables FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert receivables" ON public.receivables FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update receivables" ON public.receivables FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete receivables" ON public.receivables FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

CREATE TABLE public.payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, description TEXT, amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transport_id UUID REFERENCES public.transports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_payables_updated BEFORE UPDATE ON public.payables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins view payables" ON public.payables FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert payables" ON public.payables FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update payables" ON public.payables FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete payables" ON public.payables FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

CREATE TABLE public.collection_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  note TEXT NOT NULL, created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.collection_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view notes" ON public.collection_notes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert notes" ON public.collection_notes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete notes" ON public.collection_notes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type public.document_type NOT NULL,
  template public.contract_template,
  title TEXT NOT NULL, client_name TEXT NOT NULL,
  client_document TEXT, client_phone TEXT, client_email TEXT,
  transport_id UUID REFERENCES public.transports(id) ON DELETE SET NULL,
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_amount NUMERIC(12,2),
  pdf_url TEXT,
  public_token text NOT NULL DEFAULT gen_random_uuid()::text,
  accepted_at timestamptz, accepted_ip text,
  accepted_contract_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  accepted_transport_id uuid REFERENCES public.transports(id) ON DELETE SET NULL,
  accepted_receivable_id uuid REFERENCES public.receivables(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX documents_public_token_key ON public.documents (public_token);
CREATE INDEX idx_documents_accepted_contract_id ON public.documents(accepted_contract_id);
CREATE POLICY "View own or admin documents" ON public.documents FOR SELECT TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Authenticated insert budgets" ON public.documents FOR INSERT TO authenticated WITH CHECK (doc_type = 'budget' OR public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update documents" ON public.documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete documents" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'TransBH',
  cnpj TEXT, address TEXT, phone TEXT, whatsapp TEXT, email TEXT, logo_url TEXT,
  instagram_url text, facebook_url text, whatsapp_url text, google_business_url text, google_review_url text,
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_company_updated BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.company_settings (name) VALUES ('TransBH');
CREATE POLICY "Authenticated view company" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update company" ON public.company_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert company" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));

CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, label TEXT NOT NULL, body TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.message_templates (key, label, body) VALUES
  ('collection_whatsapp', 'Cobrança WhatsApp', 'Olá {client_name}, identificamos que o valor de R$ {amount} referente ao transporte {transport_code} está vencido há {days_overdue} dias. Pedimos a gentileza de regularizar. Obrigado — TransBH.'),
  ('collection_email', 'Cobrança E-mail', E'Prezado(a) {client_name},\n\nConsta em nosso sistema um valor em aberto de R$ {amount}, vencido há {days_overdue} dias, referente ao transporte {transport_code}.\n\nAguardamos sua regularização.\n\nAtenciosamente,\nTransBH'),
  ('contract_standard', 'Contrato Padrão', E'CONTRATO DE TRANSPORTE DE VEÍCULO\n\nEntre {company_name} e {client_name}, fica acordado o transporte do veículo {vehicle_plate} de {origin} até {destination} pelo valor de R$ {amount}.'),
  ('wa_budget_created', 'WhatsApp — Orçamento enviado', 'Olá {client_name}! Segue o link do seu orçamento {company_name}: {link}'),
  ('wa_budget_accepted', 'WhatsApp — Aceite recebido', E'Olá {client_name}! Recebemos seu aceite do orçamento "{title}".\nContrato: {link}\nValor: {amount} — vencimento {due_date}.\nObrigado por confiar na {company_name}!'),
  ('wa_charge_reminder', 'WhatsApp — Cobrança', E'Olá {client_name}! Lembrete da cobrança {company_name}:\nValor: {amount} — vencimento {due_date}.\nEm caso de dúvida, fale conosco.'),
  ('email_budget_created', 'E-mail — Orçamento enviado', E'Seu orçamento {company_name}\n---\nOlá {client_name},\n\nSegue o link do seu orçamento: {link}\n\nQualquer dúvida estamos à disposição.\nEquipe {company_name}'),
  ('email_budget_accepted', 'E-mail — Aceite confirmado', E'Aceite confirmado — {title}\n---\nOlá {client_name},\n\nRecebemos seu aceite do orçamento "{title}".\nContrato: {link}\nValor: {amount} — vencimento {due_date}.\n\nObrigado por confiar na {company_name}!'),
  ('email_charge_reminder', 'E-mail — Cobrança', E'Lembrete de cobrança — {company_name}\n---\nOlá {client_name},\n\nEste é um lembrete da cobrança no valor de {amount} com vencimento em {due_date}.\n\nEm caso de dúvida, fale conosco.\nEquipe {company_name}');
CREATE POLICY "Authenticated view templates msg" ON public.message_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update templates msg" ON public.message_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert templates msg" ON public.message_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));

CREATE OR REPLACE FUNCTION public.mark_overdue_receivables()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.receivables SET status = 'overdue' WHERE status = 'pending' AND due_date < CURRENT_DATE;
$$;

CREATE INDEX idx_transports_status ON public.transports(status);
CREATE INDEX idx_transports_created ON public.transports(created_at DESC);
CREATE INDEX idx_receivables_status ON public.receivables(status);
CREATE INDEX idx_receivables_due ON public.receivables(due_date);
CREATE INDEX idx_payables_date ON public.payables(expense_date DESC);
CREATE INDEX idx_documents_type ON public.documents(doc_type);

INSERT INTO storage.buckets (id, name, public) VALUES
  ('transport-photos', 'transport-photos', true),
  ('company-assets', 'company-assets', true),
  ('documents', 'documents', false);

CREATE POLICY "Authenticated upload transport photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'transport-photos');
CREATE POLICY "Authenticated delete transport photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'transport-photos');
CREATE POLICY "Admins upload company assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update company assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins read documents bucket" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'administrator'));

CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.document_type NOT NULL,
  template_key public.contract_template NOT NULL DEFAULT 'standard',
  name TEXT NOT NULL, description TEXT, title TEXT NOT NULL,
  service_value NUMERIC NOT NULL DEFAULT 0,
  insurance NUMERIC NOT NULL DEFAULT 0,
  extra NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view doc templates" ON public.document_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert doc templates" ON public.document_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update doc templates" ON public.document_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete doc templates" ON public.document_templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.transport_location_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES public.transports(id) ON DELETE CASCADE,
  location text NOT NULL, note text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_transport_location_updates_transport ON public.transport_location_updates (transport_id, created_at DESC);
ALTER TABLE public.transport_location_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view location updates" ON public.transport_location_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert location updates" ON public.transport_location_updates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins delete location updates" ON public.transport_location_updates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

CREATE OR REPLACE FUNCTION public.get_document_by_token(_token text)
RETURNS TABLE (id uuid, doc_type document_type, title text, client_name text, client_document text, client_phone text, client_email text, total_amount numeric, body jsonb, created_at timestamptz, accepted_at timestamptz, accepted_contract_id uuid, public_token text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.doc_type, d.title, d.client_name, d.client_document, d.client_phone, d.client_email, d.total_amount, d.body, d.created_at, d.accepted_at, d.accepted_contract_id, d.public_token
  FROM public.documents d WHERE d.public_token = _token AND _token IS NOT NULL AND length(_token) >= 10 LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_document_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_document_by_token(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_overdue_receivables() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_contract_token_for_budget(_budget_token text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.public_token FROM public.documents b JOIN public.documents c ON c.id = b.accepted_contract_id
  WHERE b.public_token = _budget_token AND _budget_token IS NOT NULL AND length(_budget_token) >= 10 AND b.accepted_contract_id IS NOT NULL LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_contract_token_for_budget(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contract_token_for_budget(text) TO anon, authenticated;

CREATE TABLE public.user_permissions (
  user_id uuid NOT NULL, permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or admin views all permissions" ON public.user_permissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert permissions" ON public.user_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update permissions" ON public.user_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete permissions" ON public.user_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, phone text, whatsapp text, document text,
  base_city text, routes text,
  default_amount numeric NOT NULL DEFAULT 0,
  pricing_notes text, notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view partners" ON public.partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert partners" ON public.partners FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update partners" ON public.partners FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete partners" ON public.partners FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.transports
  ADD COLUMN partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN partner_quoted_amount numeric,
  ADD COLUMN partner_notified_at timestamptz;

INSERT INTO public.message_templates (key, label, body) VALUES
('wa_partner_assignment', 'WhatsApp - Atribuição a parceiro',
E'Olá {partner_name}! Tenho um transporte para você:\n\nCódigo: {transport_code}\nCliente: {client_name}\nVeículo: {vehicle}\nRota: {origin} → {destination}\nValor combinado: {partner_amount}\n\nObs: {notes}\n\nAcompanhe: {tracking_link}'),
('contract_clauses_default', 'Contrato — Cláusulas padrão',
E'1. OBJETO\nA CONTRATADA compromete-se a transportar o veículo descrito neste contrato da origem até o destino indicados, com zelo e segurança.\n\n2. PAGAMENTO\n2.1. Valor total: {amount}.\n2.2. Forma de pagamento: 50% na coleta e 50% na entrega.\n\n3. SEGURO E RESPONSABILIDADE\nO veículo viaja coberto por seguro contra colisão, tombamento, incêndio e roubo.\n\n4. PRAZO DE ENTREGA\nPrazo estimado: até {due_date}.\n\n5. VISTORIA\nVistoria fotográfica detalhada será feita na coleta e na entrega.\n\n6. FORO\nFica eleito o foro da comarca da sede da CONTRATADA.');

CREATE TABLE public.receivable_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id uuid NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  note text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_receivable_payments_receivable_id ON public.receivable_payments(receivable_id);
CREATE INDEX idx_receivable_payments_paid_at ON public.receivable_payments(paid_at);
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view receivable payments" ON public.receivable_payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert receivable payments" ON public.receivable_payments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update receivable payments" ON public.receivable_payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete receivable payments" ON public.receivable_payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

CREATE TABLE public.transport_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_code text, client_name text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit feedback" ON public.transport_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins view feedback" ON public.transport_feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete feedback" ON public.transport_feedback FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));