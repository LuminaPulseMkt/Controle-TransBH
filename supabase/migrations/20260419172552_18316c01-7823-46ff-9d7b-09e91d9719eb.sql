-- 1. Lock down user_roles SELECT to self or admin
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;

CREATE POLICY "View own role or admin views all"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'administrator'::app_role)
);

-- 2. Tighten documents storage bucket: only admins can read
DROP POLICY IF EXISTS "Authenticated read documents" ON storage.objects;

CREATE POLICY "Admins read documents bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND has_role(auth.uid(), 'administrator'::app_role)
);

-- 3. Remove broad listing on public buckets (transport-photos, company-assets)
-- Files stay accessible by direct public URL (bucket is public), but listing is blocked.
DROP POLICY IF EXISTS "Authenticated read transport photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read transport photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read company assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read company assets" ON storage.objects;