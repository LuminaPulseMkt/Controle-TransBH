CREATE OR REPLACE FUNCTION public.has_permission(_uid uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_uid, 'administrator'::public.app_role)
    OR COALESCE(
      (SELECT granted FROM public.user_permissions
        WHERE user_id = _uid AND permission = _perm),
      _perm IN ('transports.view', 'transports.edit', 'documents.view', 'partners.view')
    )
$$;

DROP POLICY IF EXISTS "Authenticated update transports" ON public.transports;
CREATE POLICY "Update transports with permission"
ON public.transports FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'transports.edit'))
WITH CHECK (public.has_permission(auth.uid(), 'transports.edit'));

DROP POLICY IF EXISTS "Authenticated insert transports" ON public.transports;
CREATE POLICY "Insert transports with permission"
ON public.transports FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'transports.edit'));