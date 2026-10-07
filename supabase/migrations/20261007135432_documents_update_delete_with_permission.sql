-- Fix: editing or deleting a budget/contract silently did nothing for any
-- non-admin user, even though the UI shows Edit/Delete to everyone with the
-- "documents.edit" permission. UPDATE/DELETE on public.documents were
-- admin-only, so RLS filtered the row out and PostgREST returned success
-- with 0 rows affected.
--
-- Same approach already used for public.transports: allow admins OR users
-- granted the matching permission (has_permission already returns true for
-- administrators).

DROP POLICY IF EXISTS "Admins update documents" ON public.documents;
CREATE POLICY "Update documents with permission"
ON public.documents FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'documents.edit'))
WITH CHECK (public.has_permission(auth.uid(), 'documents.edit'));

DROP POLICY IF EXISTS "Admins delete documents" ON public.documents;
CREATE POLICY "Delete documents with permission"
ON public.documents FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'documents.edit'));
