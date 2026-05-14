## Diagnóstico

A migration anterior (`can_manage_settings` + policies do bucket `company-assets`) foi aplicada com sucesso:

- A função `public.can_manage_settings(uuid)` existe, é `SECURITY DEFINER`, retorna `true` para o usuário logado (admin) — testei via `set_config` da JWT e o resultado foi `true`.
- Existem 3 policies em `storage.objects` para `company-assets` (INSERT/UPDATE/DELETE), todas `permissive`, role `authenticated`, com `check`/`using` = `bucket_id = 'company-assets' AND can_manage_settings(auth.uid())`.
- O grant `EXECUTE` para `authenticated` está presente em ambas as funções.

Mesmo assim, o upload do front (`POST /storage/v1/object/company-assets/...`) volta `403 new row violates row-level security policy`.

A causa mais provável é o **search_path** quando a expressão da policy é avaliada pelo serviço `storage-api`: o expression usa `can_manage_settings(...)` sem qualificar o schema. Em vários cenários do Storage (e a service role `supabase_storage_admin` tem `search_path = storage`), uma referência não-qualificada a uma função em `public` falha silenciosamente — a expressão vira `false` e a RLS rejeita o INSERT.

A policy antiga (`has_role(auth.uid(), 'administrator')`) tinha o mesmo problema em tese, mas só foi exercitada por admins quando o usuário tinha role direto, então o sintoma só apareceu agora com a função nova.

## Correção (apenas banco — uma migration)

1. Recriar as 3 policies do bucket `company-assets` em `storage.objects` qualificando o schema:

   ```
   bucket_id = 'company-assets'
   AND public.can_manage_settings(auth.uid())
   ```

   Operações:
   - `DROP POLICY "Settings managers upload company assets" ON storage.objects;`
   - `DROP POLICY "Settings managers update company assets" ON storage.objects;`
   - `DROP POLICY "Settings managers delete company assets" ON storage.objects;`
   - Recriar INSERT/UPDATE/DELETE `TO authenticated` com a expressão qualificada.

2. Garantia adicional: redefinir `public.can_manage_settings` com `SET search_path = public, pg_temp` e `SECURITY DEFINER` (já está, só reconfirma). Sem mudança de assinatura.

3. Sem alterações nos buckets, no `bucket.public`, em outros buckets (`transport-photos`, `documents`) ou em qualquer arquivo do front-end.

## Validação

Após aplicar a migration:
- Recarregar `/settings` e tentar o upload do logo novamente — deve retornar `200` com a URL pública.
- O `getPublicUrl` continua funcionando porque o bucket segue `public = true`.

## Fora de escopo

- Refatorar permissões da aplicação.
- Buckets `transport-photos` e `documents`.
- Mudanças no `src/routes/settings.tsx` (o `sanitize()` do nome de arquivo já está correto).
