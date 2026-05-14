## Causa do erro

As policies do bucket `company-assets` (em `storage.objects`) exigem o role `administrator`:

```
bucket_id = 'company-assets' AND has_role(auth.uid(), 'administrator')
```

A página `/settings` é liberada para qualquer usuário com a permissão `settings.manage` concedida — inclusive colaboradores não-admin. Esses usuários conseguem abrir o formulário e disparar o upload, mas o INSERT em `storage.objects` é bloqueado pela RLS porque não têm o role `administrator`. Por isso o Supabase responde `new row violates row-level security policy`.

Em resumo: a permissão da UI (`settings.manage`) e a permissão do storage (`administrator`) estão desalinhadas.

## Correção (apenas banco — uma migration)

1. Criar função auxiliar:

   ```sql
   create or replace function public.can_manage_settings(_uid uuid)
   returns boolean
   language sql
   stable
   security definer
   set search_path = public
   as $$
     select
       public.has_role(_uid, 'administrator'::public.app_role)
       or exists (
         select 1 from public.user_permissions
         where user_id = _uid
           and permission = 'settings.manage'
           and granted = true
       )
   $$;
   ```

2. Substituir policies de `storage.objects` para o bucket `company-assets`:
   - `DROP POLICY "Admins upload company assets"` (INSERT)
   - `DROP POLICY "Admins update company assets"` (UPDATE)
   - (se houver) `DROP POLICY` equivalente para DELETE
   - Recriar INSERT / UPDATE / DELETE com:
     ```
     bucket_id = 'company-assets'
     AND public.can_manage_settings(auth.uid())
     ```
   - SELECT permanece público (bucket público).

## Sem mudanças no código

O `sanitize()` em `src/routes/settings.tsx` já está correto e não tem relação com essa falha. Nenhum arquivo do front-end será alterado.

## Fora de escopo

- Buckets `transport-photos` e `documents`.
- Refatoração do modelo de permissões da aplicação.
