-- Fix: the public quote form failed with "Ocorreu um erro ao enviar sua
-- solicitação" whenever the visitor's browser had a logged-in session of the
-- system (staff testing the site, for example). A logged-in browser sends the
-- request as the `authenticated` role, but INSERT on public.leads was only
-- granted/allowed for `anon`, so Postgres rejected it with an RLS error.
--
-- Idempotent: also re-creates the anon grant/policy in case either was lost.

GRANT INSERT ON public.leads TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a lead" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
