## Estado atual

- Função `public.can_manage_settings(uid)` retorna `true` se o usuário tem role `administrator` OU se existe linha em `user_permissions` com `permission='settings.manage' AND granted=true`.
- Policies em `storage.objects` para o bucket `company-assets` (INSERT/UPDATE/DELETE) usam `bucket_id='company-assets' AND public.can_manage_settings(auth.uid())`, com schema qualificado, role `authenticated`.
- Hoje só existe **um** usuário no projeto: `ericson.vaz@gmail.com`, role `administrator`. Não há colaborador cadastrado para validar o caminho negativo de forma empírica.

Verificação lógica (sem executar nada):
- Admin → `can_manage_settings` = `true` → INSERT no bucket é permitido.
- Colaborador sem `settings.manage` (linha ausente OU `granted=false`) → `can_manage_settings` = `false` → INSERT bloqueado pela RLS com `403 new row violates row-level security policy`.
- Colaborador com `settings.manage = true` → `can_manage_settings` = `true` → INSERT permitido (comportamento desejado, alinhado ao gate da página `/settings`).

## Plano de verificação

1. **Admin (caminho positivo)** — usar a sessão atual (já é admin):
   - Abrir o browser tool em `/settings`.
   - Selecionar um arquivo de imagem de teste no campo "Logo da empresa".
   - Esperar `POST /storage/v1/object/company-assets/...` retornar `200`.
   - Confirmar pré-visualização do logo trocada e toast de sucesso quando salvar.

2. **Colaborador sem `settings.manage` (caminho negativo)** — não dá para testar via UI hoje porque:
   - A página `/settings` é protegida por `AuthGate requirePermission="settings.manage"`, então um colaborador sequer abre o formulário.
   - Não há colaborador cadastrado.
   
   Duas opções para o usuário escolher:
   
   - **Opção A (mais rápida — recomendada):** simular o INSERT como `authenticated` impersonando um UUID fictício direto no banco e medir o resultado da RLS. Faço uma query SET LOCAL com `request.jwt.claims` apontando para um UUID inexistente e tento `INSERT INTO storage.objects (...)`. O esperado é o erro de RLS. Não cria usuário, não polui dados.
   
   - **Opção B (end-to-end):** criar um usuário colaborador de teste (ex.: `colaborador.teste@transbh.local`) com role `collaborator` e sem `settings.manage`, fazer login com ele, tentar acessar `/settings` (deve ser barrado pelo AuthGate) e tentar o upload via chamada manual. Mais completo, mas exige criar conta de teste.

3. Reportar resultado de cada caso (admin OK / colaborador bloqueado) com o status HTTP observado.

## Pergunta para o usuário

Qual opção usar para o caminho do colaborador sem permissão: **A** (simulação SQL, não cria conta) ou **B** (criar usuário colaborador real para teste end-to-end)?

Para o caminho do admin (passo 1), já posso seguir direto assim que o plano for aprovado.

## Fora de escopo

- Mudanças em policies, código ou buckets.
- Refatorar `AuthGate` ou modelo de permissões.
