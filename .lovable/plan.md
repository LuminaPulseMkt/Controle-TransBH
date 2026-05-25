## Objetivo
Adicionar opção de **excluir** registros na aba Financeiro — tanto em **Contas a Receber** quanto em **Contas a Pagar**.

## Onde alterar
Arquivo único: `src/routes/financial.tsx`

## Mudanças

### 1. Contas a Receber (`ReceivablesTab`)
- Nova função `deleteReceivable(item)` que:
  - Pede confirmação via `confirm()` (padrão já usado no arquivo) com mensagem explícita: `"Excluir o recebível de {cliente} ({valor})? Esta ação não pode ser desfeita."`.
  - Remove primeiro os pagamentos vinculados (`receivable_payments` por `receivable_id`) para evitar registros órfãos.
  - Deleta o registro em `receivables`.
  - `toast.success` + `void load()`.
- Novo botão `Trash2` (ghost, vermelho) na coluna **Ações** da tabela, ao lado do botão de Histórico e do Select de status.

### 2. Contas a Pagar (`PayablesTab`)
- Nova função `deletePayable(item)` com `confirm()` + delete em `payables` + reload.
- Adicionar coluna **Ações** na tabela (hoje só tem Data/Categoria/Descrição/Valor) com um botão `Trash2` por linha.

## Permissões
As RLS já restringem `DELETE` em `receivables`, `receivable_payments` e `payables` a administradores — colaboradores receberão erro do Supabase, que será exibido via `toast.error`. Nenhuma migration necessária.

## Detalhes
- Reaproveitar o ícone `Trash2` já importado.
- Sem mudanças em rotas, tipos, ou outros componentes.
- Sem AlertDialog novo — manter o padrão `confirm()` já usado em `deletePayment`.
