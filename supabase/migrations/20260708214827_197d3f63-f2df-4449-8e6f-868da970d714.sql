
-- 1) Templates: restrict SELECT to admins/settings managers
DROP POLICY IF EXISTS "Authenticated view templates msg" ON public.message_templates;
CREATE POLICY "Settings managers view msg templates"
ON public.message_templates FOR SELECT TO authenticated
USING (public.can_manage_settings(auth.uid()));

DROP POLICY IF EXISTS "Authenticated view doc templates" ON public.document_templates;
CREATE POLICY "Settings managers view doc templates"
ON public.document_templates FOR SELECT TO authenticated
USING (public.can_manage_settings(auth.uid()));

-- 2) transport_location_updates: require created_by = auth.uid()
DROP POLICY IF EXISTS "Authenticated insert location updates" ON public.transport_location_updates;
CREATE POLICY "Users insert own location updates"
ON public.transport_location_updates FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- 3) vehicle_checklists: require created_by = auth.uid()
DROP POLICY IF EXISTS "Authenticated insert checklists" ON public.vehicle_checklists;
CREATE POLICY "Users insert own checklists"
ON public.vehicle_checklists FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- 4) transport_photos: add created_by, require it matches
ALTER TABLE public.transport_photos
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Authenticated insert photos" ON public.transport_photos;
CREATE POLICY "Users insert own photos"
ON public.transport_photos FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- 5) Storage bucket transport-photos: uploads scoped to user folder or managers
DROP POLICY IF EXISTS "Authenticated upload transport photos" ON storage.objects;
CREATE POLICY "Upload transport photos scoped"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'transport-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.can_manage_settings(auth.uid())
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
  )
);
