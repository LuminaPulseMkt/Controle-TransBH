## Resumo

A varredura de segurança encontrou 16 alertas. Boa parte são duplicatas e itens informativos. Proponho corrigir os relevantes via migration e sinalizar 2 itens que dependem de ação no painel Supabase ou são intencionais.

## O que será corrigido (migration)

### 1. Storage `transport-photos` — DELETE liberado a qualquer logado
Hoje qualquer usuário autenticado pode apagar foto de qualquer transporte. Vou trocar a policy para permitir DELETE só para administradores.

### 2. Storage `documents` (privado) — sem DELETE para admins
Adicionar policy DELETE/UPDATE restritas a `public.has_role(auth.uid(),'administrator')`, para que admins possam remover/substituir arquivos via Storage API.

### 3. Funções `SECURITY DEFINER` expostas a `anon`
Revogar `EXECUTE` de `anon` (e `public`) nas funções que não precisam ser chamadas por anônimos via PostgREST:
- `public.handle_new_user()` (trigger interno)
- `public.update_updated_at_column()` (trigger interno)
- `public.mark_overdue_receivables()` (job interno)
- `public.has_role(uuid, app_role)` — manter EXECUTE para `authenticated` (usada nas RLS)
- `public.can_manage_settings(uuid)` — idem
- `public.is_authenticated()` — idem

As funções `get_document_by_token` e `get_contract_token_for_budget` precisam continuar acessíveis a `anon` (são o mecanismo de visualização pública por token de orçamento/contrato) — serão mantidas e o alerta correspondente marcado como ignorado com justificativa na security memory.

## O que NÃO será alterado (com justificativa)

- **`company-assets` sem SELECT policy** — bucket é público de propósito (logo, marca). Sem dados sensíveis.
- **`documents` (orçamentos) — INSERT por colaborador com `doc_type='budget'`** — comportamento desejado pelo fluxo atual de orçamentos.
- **Token público de documento (`get_document_by_token`)** — endpoint público proposital para o cliente abrir orçamento/contrato pelo link.

## O que depende de ação no painel Supabase

- **Leaked Password Protection desabilitado** — precisa ser ativado em *Authentication → Policies → Password protection* no dashboard. Não dá para habilitar via SQL. Vou indicar o link na resposta final.

## Detalhes técnicos da migration

```sql
-- 1. transport-photos: DELETE só admin
drop policy if exists "Authenticated delete photos" on storage.objects;
create policy "Admins delete transport photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'transport-photos'
         and public.has_role(auth.uid(), 'administrator'::public.app_role));

-- 2. documents bucket: admin pode UPDATE/DELETE
create policy "Admins update documents bucket"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents'
         and public.has_role(auth.uid(), 'administrator'::public.app_role));
create policy "Admins delete documents bucket"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents'
         and public.has_role(auth.uid(), 'administrator'::public.app_role));

-- 3. Revogar EXECUTE de anon/public nas funções internas
revoke execute on function public.handle_new_user() from anon, public;
revoke execute on function public.update_updated_at_column() from anon, public;
revoke execute on function public.mark_overdue_receivables() from anon, public;
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.can_manage_settings(uuid) from anon, public;
revoke execute on function public.is_authenticated() from anon, public;
```

Após aplicar, atualizo a `@security-memory` registrando os itens ignorados (bucket público de logo, token público de documento, INSERT de orçamento por colaborador) e marco os findings correspondentes como `mark_as_fixed` ou `ignore`.

## Fora de escopo

- Mudanças em código de aplicação (frontend/serverFn).
- Refatoração do modelo de roles/permissões.
- Habilitar Leaked Password Protection (depende do painel Supabase).
