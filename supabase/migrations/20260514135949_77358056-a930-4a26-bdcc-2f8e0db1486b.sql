DROP POLICY IF EXISTS "Settings managers upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Settings managers update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Settings managers delete company assets" ON storage.objects;

CREATE POLICY "Settings managers upload company assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND public.can_manage_settings(auth.uid()));

CREATE POLICY "Settings managers update company assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets' AND public.can_manage_settings(auth.uid()))
  WITH CHECK (bucket_id = 'company-assets' AND public.can_manage_settings(auth.uid()));

CREATE POLICY "Settings managers delete company assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets' AND public.can_manage_settings(auth.uid()));