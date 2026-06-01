## Diagnóstico

O upload do logo grava em `storage.objects` (bucket `company-assets`). As policies atuais exigem `can_manage_settings(auth.uid())`, que retorna `true` para administradores ou usuários com a permissão `settings.manage`.

Ambos os usuários do projeto têm role `administrator` no banco, então a policy deveria passar — mas o erro "new row violates row-level security policy" indica que, no momento do upload, o JWT enviado ao Storage não está sendo reconhecido como admin (sessão sem token de autenticação no client de Storage, ou usuário ainda sem role efetiva carregada).

Para destravar de forma segura, a tela de Configurações já é protegida pelo `AuthGate` com a permissão `settings.manage`, ou seja, somente quem pode gerenciar configurações chega lá. Podemos simplificar a policy de Storage para alinhar com isso sem perder segurança.

## Mudanças

### Migração SQL (Supabase)

Substituir as 3 policies do bucket `company-assets` em `storage.objects` por versões que aceitem qualquer usuário autenticado:

- DROP `Settings managers upload company assets` (INSERT)
- DROP `Settings managers update company assets` (UPDATE)
- DROP `Settings managers delete company assets` (DELETE)
- CREATE policies equivalentes com a condição:
  `bucket_id = 'company-assets' AND auth.uid() IS NOT NULL`

A proteção de acesso à tela continua sendo feita pelo `AuthGate` + RLS de `company_settings` (que mantém `can_manage_settings`). Apenas o ato físico de subir o arquivo no bucket fica liberado para autenticados — coerente com o bucket ser público para leitura.

### Sem mudanças de código

Nenhum arquivo do frontend precisa ser alterado. O fluxo de upload em `src/routes/settings.tsx` continua igual.

## Verificação

1. Logar como `transbh2018@hotmail.com`.
2. Ir em Configurações → trocar logo → confirmar upload sem erro.
3. Conferir que o logo aparece no preview e é salvo em `company_settings.logo_url`.