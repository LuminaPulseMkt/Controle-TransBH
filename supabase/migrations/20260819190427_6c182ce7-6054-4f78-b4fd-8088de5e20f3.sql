-- Política: Acesso público de leitura
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'site-images');

-- Política: Upload por administradores
CREATE POLICY "Admin Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-images' AND
  public.has_role(auth.uid(), 'administrator')
);

-- Política: Update por administradores
CREATE POLICY "Admin Update Access"
ON storage.objects FOR UPDATE
TO authenticated
WITH CHECK (
  bucket_id = 'site-images' AND
  public.has_role(auth.uid(), 'administrator')
);

-- Política: Delete por administradores
CREATE POLICY "Admin Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-images' AND
  public.has_role(auth.uid(), 'administrator')
);
