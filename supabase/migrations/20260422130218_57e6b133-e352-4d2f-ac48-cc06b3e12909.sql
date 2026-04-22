-- 1. Adiciona coluna public_token
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS public_token text;

-- 2. Backfill dos registros existentes
UPDATE public.documents
SET public_token = gen_random_uuid()::text
WHERE public_token IS NULL;

-- 3. Garante NOT NULL e default
ALTER TABLE public.documents
ALTER COLUMN public_token SET NOT NULL,
ALTER COLUMN public_token SET DEFAULT gen_random_uuid()::text;

-- 4. Índice único
CREATE UNIQUE INDEX IF NOT EXISTS documents_public_token_key
ON public.documents (public_token);

-- 5. Policy de SELECT público (anon + authenticated) por token
DROP POLICY IF EXISTS "Public view documents by token" ON public.documents;
CREATE POLICY "Public view documents by token"
ON public.documents
FOR SELECT
TO anon, authenticated
USING (public_token IS NOT NULL);
