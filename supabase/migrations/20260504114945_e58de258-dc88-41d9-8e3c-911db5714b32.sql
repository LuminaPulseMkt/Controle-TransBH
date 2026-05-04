-- 1) Replace the over-permissive public document policy with a token-scoped RPC
DROP POLICY IF EXISTS "Public view documents by token" ON public.documents;

CREATE OR REPLACE FUNCTION public.get_document_by_token(_token text)
RETURNS TABLE (
  id uuid,
  doc_type document_type,
  title text,
  client_name text,
  client_document text,
  client_phone text,
  client_email text,
  total_amount numeric,
  body jsonb,
  created_at timestamptz,
  accepted_at timestamptz,
  accepted_contract_id uuid,
  public_token text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.doc_type, d.title, d.client_name, d.client_document,
         d.client_phone, d.client_email, d.total_amount, d.body,
         d.created_at, d.accepted_at, d.accepted_contract_id, d.public_token
  FROM public.documents d
  WHERE d.public_token = _token
    AND _token IS NOT NULL
    AND length(_token) >= 10
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_document_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_document_by_token(text) TO anon, authenticated;

-- 2) Restrict storage bucket "documents" uploads to administrators
DROP POLICY IF EXISTS "Authenticated upload documents" ON storage.objects;

CREATE POLICY "Admins upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'administrator'::app_role)
);

-- 3) Lock down internal SECURITY DEFINER functions (triggers/cron only — no caller EXECUTE needed)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_overdue_receivables() FROM PUBLIC, anon, authenticated;