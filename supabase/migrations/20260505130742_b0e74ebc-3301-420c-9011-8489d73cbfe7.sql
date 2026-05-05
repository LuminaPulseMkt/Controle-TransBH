CREATE TABLE public.user_permissions (
  user_id uuid NOT NULL,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or admin views all permissions"
ON public.user_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Admins insert permissions"
ON public.user_permissions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Admins update permissions"
ON public.user_permissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Admins delete permissions"
ON public.user_permissions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'administrator'::app_role));

CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();