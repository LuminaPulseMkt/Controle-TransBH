-- Fix search_path on is_authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- Replace broad public SELECT policies on storage with no-list policies.
-- Public buckets remain accessible via direct object URLs (the public CDN
-- endpoint does not go through these policies), but listing is blocked.
DROP POLICY IF EXISTS "Public read transport photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read company assets" ON storage.objects;

CREATE POLICY "Authenticated read transport photos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'transport-photos');

CREATE POLICY "Authenticated read company assets" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'company-assets');