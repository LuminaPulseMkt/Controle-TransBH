## Objetivo

Criar um sistema de permissões granulares por usuário, com defaults por papel (Administrador / Colaborador) e overrides individuais editáveis na tela de Usuários.

## Permissões definidas

Cada permissão é uma chave booleana atribuída por usuário:

| Chave | Descrição | Default Admin | Default Colaborador |
|---|---|---|---|
| `transports.view` | Ver lista/detalhes de transportes | ✓ | ✓ |
| `transports.edit` | Criar/editar transporte, adicionar fotos, atualizar localização | ✓ | ✓ |
| `transports.delete` | Excluir transporte | ✓ | ✗ |
| `documents.view` | Ver contratos e orçamentos | ✓ | ✓ |
| `documents.edit` | Criar/editar/excluir documentos | ✓ | ✗ |
| `financial.view` | Acesso ao módulo Financeiro | ✓ | ✗ |
| `collections.view` | Acesso a Cobranças | ✓ | ✗ |
| `social.view` | Acesso a Social & Marketing | ✓ | ✗ |
| `users.manage` | Gerenciar usuários e permissões | ✓ | ✗ |
| `settings.manage` | Configurações da empresa | ✓ | ✗ |
| `values.view` | Ver valores monetários (total, frete) em transportes/documentos | ✓ | ✗ |

Administrador sempre tem todas as permissões (bypass — `isAdmin` continua valendo). Os toggles só afetam Colaboradores.

## Mudanças no banco

Migration:
- Tabela `user_permissions` (`user_id uuid`, `permission text`, `granted boolean`, PK composta).
- RLS: SELECT do próprio usuário ou admin; INSERT/UPDATE/DELETE só admin (via `has_role`).
- Função `has_permission(_user_id uuid, _perm text)` SECURITY DEFINER que retorna true se admin, ou se existir registro `granted=true`, ou se for default-true do papel colaborador.

## Mudanças no front-end

**`src/lib/auth-context.tsx`**
- Carregar permissões efetivas do usuário (merge: defaults do papel + overrides em `user_permissions`).
- Expor `permissions: Record<PermKey, boolean>` e helper `can(key)`.

**`src/components/AuthGate.tsx`**
- Adicionar prop `requirePermission?: PermKey`. Se faltar, mostra "Acesso restrito".

**`src/components/AppSidebar.tsx`**
- Trocar `adminOnly` por `permission` em cada item; filtrar por `can(item.permission)`.
- Social & Marketing passa a exigir `social.view` (oculto para colaborador por default).

**Rotas afetadas** — substituir `<AuthGate adminOnly>` por `<AuthGate requirePermission="...">`:
- `financial.tsx`, `financial.clients.$name.tsx` → `financial.view`
- `collections.tsx` → `collections.view`
- `social.tsx` → `social.view`
- `settings.tsx` → `settings.manage`
- `users.tsx` → `users.manage`
- `documents.tsx` → `documents.view` (e usar `can("documents.edit")` no lugar de `isAdmin` para botões criar/editar/excluir)
- `transports.index.tsx` / `transports.$id.tsx` → usar `can("transports.edit")` para edição, `can("transports.delete")` para excluir, `can("values.view")` para esconder colunas/campos de valor
- `index.tsx` (dashboard) → esconder cards/valores financeiros se `!can("values.view")`

**`src/routes/users.tsx`**
- Adicionar painel "Permissões" expansível por linha de usuário (somente colaboradores; admin mostra "todas").
- Lista de switches por permissão, persistindo em `user_permissions` via upsert/delete.
- Botão "Restaurar padrões" remove overrides do usuário.

## Detalhes técnicos

```ts
// src/lib/permissions.ts
export const PERMISSIONS = [
  "transports.view","transports.edit","transports.delete",
  "documents.view","documents.edit",
  "financial.view","collections.view","social.view",
  "users.manage","settings.manage","values.view",
] as const;
export type PermKey = typeof PERMISSIONS[number];

export const COLLABORATOR_DEFAULTS: Record<PermKey, boolean> = {
  "transports.view": true, "transports.edit": true, "transports.delete": false,
  "documents.view": true, "documents.edit": false,
  "financial.view": false, "collections.view": false, "social.view": false,
  "users.manage": false, "settings.manage": false, "values.view": false,
};
```

Merge no auth-context:
```ts
const effective = { ...COLLABORATOR_DEFAULTS };
if (role === "administrator") PERMISSIONS.forEach(k => effective[k] = true);
overrides.forEach(o => effective[o.permission] = o.granted);
```

## Resumo dos arquivos

- Nova migration: `user_permissions` + função `has_permission`
- Novo: `src/lib/permissions.ts`
- Editado: `auth-context.tsx`, `AuthGate.tsx`, `AppSidebar.tsx`, `users.tsx`
- Editado (uso de `can(...)`): `index.tsx`, `transports.index.tsx`, `transports.$id.tsx`, `documents.tsx`, `financial.tsx`, `financial.clients.$name.tsx`, `collections.tsx`, `social.tsx`, `settings.tsx`

Posso aplicar?
