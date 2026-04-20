CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind public.document_type NOT NULL,
  template_key public.contract_template NOT NULL DEFAULT 'standard',
  name TEXT NOT NULL,
  description TEXT,
  title TEXT NOT NULL,
  service_value NUMERIC NOT NULL DEFAULT 0,
  insurance NUMERIC NOT NULL DEFAULT 0,
  extra NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view templates"
  ON public.document_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins insert custom templates"
  ON public.document_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrator'::public.app_role));

CREATE POLICY "Admins update custom templates"
  ON public.document_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'::public.app_role));

CREATE POLICY "Admins delete custom templates"
  ON public.document_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'::public.app_role));

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();