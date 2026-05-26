
-- Helper to check granular permissions
CREATE OR REPLACE FUNCTION public.has_permission(_uid uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'administrator'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = _uid AND permission = _perm AND granted = true
    )
$$;

-- 1) documents INSERT: enforce created_by = auth.uid()
DROP POLICY IF EXISTS "Authenticated insert budgets" ON public.documents;
CREATE POLICY "Authenticated insert budgets"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (doc_type = 'budget'::document_type OR public.has_role(auth.uid(), 'administrator'::public.app_role))
);

-- 2) transports SELECT: restrict to admins/users with transports.view permission
DROP POLICY IF EXISTS "Authenticated view transports" ON public.transports;
CREATE POLICY "View transports with permission"
ON public.transports FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'transports.view'));

-- 3) vehicle_checklists UPDATE: only creator or admin
DROP POLICY IF EXISTS "Authenticated update checklists" ON public.vehicle_checklists;
CREATE POLICY "Update own checklists or admin"
ON public.vehicle_checklists FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'administrator'::public.app_role)
)
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'administrator'::public.app_role)
);

-- 4) Storage: allow authenticated users to read from 'documents' bucket
--    Combined with table RLS, only users who know object paths (via documents rows) can access.
DROP POLICY IF EXISTS "Authenticated read documents bucket" ON storage.objects;
CREATE POLICY "Authenticated read documents bucket"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');
