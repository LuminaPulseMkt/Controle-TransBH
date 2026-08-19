-- Tabela para configurações dinâmicas do site (imagens, etc)
CREATE TABLE public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Permissões
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;

-- RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer um pode ler as configurações
CREATE POLICY "Allow public read access"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Política: Apenas admins podem modificar
CREATE POLICY "Allow admins to manage settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'))
WITH CHECK (public.has_role(auth.uid(), 'administrator'));
