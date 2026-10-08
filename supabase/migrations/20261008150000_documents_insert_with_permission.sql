-- Fix: saving a new contract failed with
--   "new row violates row-level security policy for table documents"
-- for any non-admin user, even when granted the "documents.edit" permission
-- (the UI shows "Novo contrato" to them). INSERT only allowed contracts for
-- administrators. Align it with UPDATE/DELETE: admins or users with
-- documents.edit (has_permission already returns true for administrators).
-- created_by must still be the caller, so nobody can create documents
-- on behalf of someone else.

DROP POLICY IF EXISTS "Authenticated insert budgets" ON public.documents;
CREATE POLICY "Insert documents with permission"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    doc_type = 'budget'::document_type
    OR public.has_permission(auth.uid(), 'documents.edit')
  )
);
