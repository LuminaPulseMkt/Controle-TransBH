
-- Documents bucket: remove overly broad authenticated read
DROP POLICY IF EXISTS "Authenticated read documents bucket" ON storage.objects;

-- Company assets: restrict write ops to settings managers / admins
DROP POLICY IF EXISTS "Authenticated upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete company assets" ON storage.objects;

CREATE POLICY "Managers upload company assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND (public.can_manage_settings(auth.uid()) OR public.has_role(auth.uid(), 'administrator'::public.app_role))
);

CREATE POLICY "Managers update company assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (public.can_manage_settings(auth.uid()) OR public.has_role(auth.uid(), 'administrator'::public.app_role))
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND (public.can_manage_settings(auth.uid()) OR public.has_role(auth.uid(), 'administrator'::public.app_role))
);

CREATE POLICY "Managers delete company assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (public.can_manage_settings(auth.uid()) OR public.has_role(auth.uid(), 'administrator'::public.app_role))
);
