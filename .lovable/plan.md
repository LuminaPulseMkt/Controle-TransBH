## Objetivo
Permitir que administradores excluam orçamentos, contratos e transportes diretamente da interface, com diálogo de confirmação consistente.

## Estado atual
- **Transportes** (`src/routes/transports.index.tsx`): já existe a função `removeTransport` e botão "Remover", mas usa o `confirm()` nativo do browser.
- **Documentos** (orçamento/contrato em `src/routes/documents.tsx`): **não existe** botão nem função para excluir. Apenas templates podem ser excluídos.
- RLS já permite `DELETE` para administradores nas tabelas `documents` e `transports`.

## Mudanças propostas

### 1. `src/routes/documents.tsx` — adicionar exclusão de documento
- Importar `AlertDialog` (e subcomponentes) de `@/components/ui/alert-dialog`.
- Adicionar estado `deletingDoc: Document | null`.
- Criar função `deleteDocument(d)`:
  - `supabase.from("documents").delete().eq("id", d.id)`
  - Toast de sucesso/erro e `void load()`.
  - Bloquear exclusão se `d.accepted_at` (orçamento já aceito gerou contrato) — mostrar toast explicativo, ou permitir somente se admin confirmar (vou bloquear por padrão para evitar quebrar o vínculo `accepted_contract_id`).
- No `DocRow`:
  - Adicionar prop `onDelete?: () => void` e `canDelete?: boolean`.
  - Botão `Trash2` em vermelho (`variant="outline"` com `text-destructive`) ao lado do botão Editar, visível só para admin.
- Renderizar um `AlertDialog` único no nível da página, controlado por `deletingDoc`, com:
  - Título: "Excluir orçamento/contrato?"
  - Descrição: nome do cliente, título, valor.
  - Ações: Cancelar / Excluir (destructive).

### 2. `src/routes/transports.index.tsx` — substituir `confirm()` por AlertDialog
- Importar `AlertDialog` e adicionar estado `deletingTransport: Transport | null`.
- Reescrever `removeTransport` para abrir o diálogo; criar `confirmRemoveTransport` que executa o `delete`.
- Mesmo botão `Trash2` existente passa a abrir o diálogo.
- Antes de deletar o transporte, deletar registros dependentes para evitar erro de integridade lógica:
  - `transport_photos` (eq `transport_id`)
  - `transport_location_updates` (eq `transport_id`)
  - Limpar `transport_id` em `documents`, `receivables`, `payables` via `update({ transport_id: null })` (não há FK formal, mas evita órfãos confusos).
- Mostrar diálogo com código do transporte, cliente e placa.

### 3. Permissões
- Botões de exclusão visíveis apenas quando `isAdmin` (já há `useAuth`/`isAdmin` em ambas as rotas — confirmar uso). RLS já garante no servidor.

## Detalhes técnicos
- Não há mudanças de schema nem migrações.
- Nenhuma server function necessária — uso direto do client Supabase com RLS de admin.
- Componente `AlertDialog` já existe em `src/components/ui/alert-dialog.tsx`.
- Ícone `Trash2` já importado em `documents.tsx`; em `transports.index.tsx` verificar/adicionar import.

## Fora de escopo
- Soft delete / lixeira / restauração.
- Auditoria de exclusões.
- Exclusão em massa.
