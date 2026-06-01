DROP POLICY IF EXISTS "Settings managers upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Settings managers update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Settings managers delete company assets" ON storage.objects;

CREATE POLICY "Authenticated upload company assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update company assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete company assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);