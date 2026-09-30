CREATE OR REPLACE FUNCTION public.get_lead_notify_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email FROM public.company_settings WHERE email IS NOT NULL LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_lead_notify_email() FROM public;
GRANT EXECUTE ON FUNCTION public.get_lead_notify_email() TO anon, authenticated, service_role;