-- Fix: transport-status-notify.functions.ts used the service-role
-- supabaseAdmin client to read message_templates (RLS-restricted to
-- settings managers) and company_settings. This platform's runtime does
-- not reliably expose SUPABASE_SERVICE_ROLE_KEY to this app's server
-- functions (same root cause just fixed for the lead-notification email),
-- so any collaborator without settings.manage triggering a status change
-- would silently fail to notify the client via WhatsApp.
--
-- Same fix pattern as get_lead_notify_email / get_public_company_info:
-- expose only what's needed through a SECURITY DEFINER RPC, callable with
-- the plain anon/publishable key.

CREATE OR REPLACE FUNCTION public.get_message_template(_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT body FROM public.message_templates WHERE key = _key LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_message_template(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_message_template(text) TO anon, authenticated;
