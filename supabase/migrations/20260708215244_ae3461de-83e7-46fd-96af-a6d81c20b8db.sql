
DROP POLICY IF EXISTS "Settings managers view msg templates" ON public.message_templates;
CREATE POLICY "Authenticated view templates msg"
ON public.message_templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Settings managers view doc templates" ON public.document_templates;
CREATE POLICY "Authenticated view doc templates"
ON public.document_templates FOR SELECT TO authenticated USING (true);
