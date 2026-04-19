-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('administrator', 'collaborator');
CREATE TYPE public.transport_status AS ENUM ('pending', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE public.vehicle_type AS ENUM ('car', 'motorcycle', 'truck', 'machinery');
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'overdue', 'negotiated');
CREATE TYPE public.document_type AS ENUM ('budget', 'contract');
CREATE TYPE public.contract_template AS ENUM ('standard', 'fragile', 'express');

-- ============ TIMESTAMP TRIGGER FN ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- ============ HANDLE NEW USER (first user = admin) ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    assigned_role := 'administrator';
  ELSE
    assigned_role := 'collaborator';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

-- User roles RLS
CREATE POLICY "Authenticated can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

-- ============ TRANSPORTS ============
CREATE TABLE public.transports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE DEFAULT ('TR-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random()*10000))::text, 4, '0')),
  vehicle_plate TEXT NOT NULL,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_year INT,
  vehicle_color TEXT,
  vehicle_chassis TEXT,
  vehicle_type public.vehicle_type NOT NULL DEFAULT 'car',
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_state TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_document TEXT,
  client_phone TEXT,
  driver_name TEXT,
  estimated_delivery DATE,
  status public.transport_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  photo_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_transports_updated BEFORE UPDATE ON public.transports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated view transports" ON public.transports
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert transports" ON public.transports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update transports" ON public.transports
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins delete transports" ON public.transports
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

-- ============ TRANSPORT PHOTOS ============
CREATE TABLE public.transport_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id UUID NOT NULL REFERENCES public.transports(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view photos" ON public.transport_photos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert photos" ON public.transport_photos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete photos" ON public.transport_photos
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============ RECEIVABLES ============
CREATE TABLE public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id UUID REFERENCES public.transports(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at DATE,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_receivables_updated BEFORE UPDATE ON public.receivables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins view receivables" ON public.receivables
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert receivables" ON public.receivables
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update receivables" ON public.receivables
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete receivables" ON public.receivables
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

-- ============ PAYABLES ============
CREATE TABLE public.payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transport_id UUID REFERENCES public.transports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_payables_updated BEFORE UPDATE ON public.payables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins view payables" ON public.payables
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert payables" ON public.payables
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins update payables" ON public.payables
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete payables" ON public.payables
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

-- ============ COLLECTION NOTES ============
CREATE TABLE public.collection_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.collection_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view notes" ON public.collection_notes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert notes" ON public.collection_notes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete notes" ON public.collection_notes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

-- ============ DOCUMENTS (Budgets & Contracts) ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type public.document_type NOT NULL,
  template public.contract_template,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_document TEXT,
  client_phone TEXT,
  client_email TEXT,
  transport_id UUID REFERENCES public.transports(id) ON DELETE SET NULL,
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_amount NUMERIC(12,2),
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Budgets viewable by all authenticated; contracts admin-only create
CREATE POLICY "Authenticated view documents" ON public.documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert budgets" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (
    doc_type = 'budget' OR public.has_role(auth.uid(), 'administrator')
  );
CREATE POLICY "Admins update documents" ON public.documents
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins delete documents" ON public.documents
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

-- ============ COMPANY SETTINGS ============
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'TransBH',
  cnpj TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  logo_url TEXT,
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_company_updated BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.company_settings (name) VALUES ('TransBH');

CREATE POLICY "Authenticated view company" ON public.company_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update company" ON public.company_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert company" ON public.company_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- ============ MESSAGE TEMPLATES ============
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.message_templates (key, label, body) VALUES
  ('collection_whatsapp', 'Cobrança WhatsApp', 'Olá {client_name}, identificamos que o valor de R$ {amount} referente ao transporte {transport_code} está vencido há {days_overdue} dias. Pedimos a gentileza de regularizar. Obrigado — TransBH.'),
  ('collection_email', 'Cobrança E-mail', 'Prezado(a) {client_name},\n\nConsta em nosso sistema um valor em aberto de R$ {amount}, vencido há {days_overdue} dias, referente ao transporte {transport_code}.\n\nAguardamos sua regularização.\n\nAtenciosamente,\nTransBH'),
  ('contract_standard', 'Contrato Padrão', 'CONTRATO DE TRANSPORTE DE VEÍCULO\n\nEntre {company_name} e {client_name}, fica acordado o transporte do veículo {vehicle_plate} de {origin} até {destination} pelo valor de R$ {amount}.');

CREATE POLICY "Authenticated view templates" ON public.message_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update templates" ON public.message_templates
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));
CREATE POLICY "Admins insert templates" ON public.message_templates
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- ============ AUTO MARK OVERDUE FUNCTION ============
CREATE OR REPLACE FUNCTION public.mark_overdue_receivables()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.receivables
  SET status = 'overdue'
  WHERE status = 'pending' AND due_date < CURRENT_DATE;
$$;

-- ============ INDEXES ============
CREATE INDEX idx_transports_status ON public.transports(status);
CREATE INDEX idx_transports_created ON public.transports(created_at DESC);
CREATE INDEX idx_receivables_status ON public.receivables(status);
CREATE INDEX idx_receivables_due ON public.receivables(due_date);
CREATE INDEX idx_payables_date ON public.payables(expense_date DESC);
CREATE INDEX idx_documents_type ON public.documents(doc_type);

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('transport-photos', 'transport-photos', true),
  ('company-assets', 'company-assets', true),
  ('documents', 'documents', false);

CREATE POLICY "Public read transport photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'transport-photos');
CREATE POLICY "Authenticated upload transport photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'transport-photos');
CREATE POLICY "Authenticated delete transport photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'transport-photos');

CREATE POLICY "Public read company assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');
CREATE POLICY "Admins upload company assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'administrator')
  );
CREATE POLICY "Admins update company assets" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'administrator')
  );

CREATE POLICY "Authenticated read documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Authenticated upload documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');