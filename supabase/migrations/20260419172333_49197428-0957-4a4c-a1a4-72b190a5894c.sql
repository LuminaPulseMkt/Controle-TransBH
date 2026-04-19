DROP POLICY IF EXISTS "Authenticated view documents" ON public.documents;

CREATE POLICY "View own or admin documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR has_role(auth.uid(), 'administrator'::app_role)
);