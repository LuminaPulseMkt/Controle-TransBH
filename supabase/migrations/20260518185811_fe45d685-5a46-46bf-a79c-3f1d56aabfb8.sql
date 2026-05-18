
DROP POLICY IF EXISTS "Authenticated view company" ON public.company_settings;
DROP POLICY IF EXISTS "Admins or settings managers view company" ON public.company_settings;
CREATE POLICY "Admins or settings managers view company"
ON public.company_settings FOR SELECT TO authenticated
USING (public.can_manage_settings(auth.uid()));

DROP POLICY IF EXISTS "Authenticated view partners" ON public.partners;
DROP POLICY IF EXISTS "Admins view partners" ON public.partners;
CREATE POLICY "Admins view partners"
ON public.partners FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administrator'::public.app_role));

DROP POLICY IF EXISTS "Authenticated delete photos" ON public.transport_photos;
DROP POLICY IF EXISTS "Admins delete photos" ON public.transport_photos;
CREATE POLICY "Admins delete photos"
ON public.transport_photos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'administrator'::public.app_role));

DROP POLICY IF EXISTS "Authenticated delete transport photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete transport photos" ON storage.objects;
CREATE POLICY "Admins delete transport photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'transport-photos'
  AND public.has_role(auth.uid(), 'administrator'::public.app_role)
);
