## Objetivo
Permitir registrar e visualizar múltiplos pagamentos parciais por recebível, com histórico completo (valor, data, observação) acessível diretamente na aba Financeiro → Contas a Receber.

## Mudanças

### 1. Banco de dados (migração)
Criar tabela `receivable_payments` para armazenar cada pagamento individual:

- `id uuid` (PK)
- `receivable_id uuid` (FK lógica → receivables.id, ON DELETE CASCADE)
- `amount numeric` (valor pago naquela parcela)
- `paid_at date` (data do pagamento)
- `note text` (opcional — ex: "PIX", "TED", "Dinheiro")
- `created_by uuid`
- `created_at timestamptz`

RLS: mesmas regras de `receivables` (apenas administrators visualizam/inserem/atualizam/deletam, via `has_role`).
Índice em `receivable_id` para listagens rápidas.

Manter o campo `paid_amount` em `receivables` como **agregado** (soma dos pagamentos) para compatibilidade com o que já existe e para os relatórios.

### 2. Lógica de pagamento (`src/routes/financial.tsx` — ReceivablesTab)
- Substituir o diálogo atual de "valor único" por um diálogo que:
  - Mostra a **lista de pagamentos já registrados** (data, valor, nota, ação Excluir).
  - Tem um formulário inline para adicionar nova parcela (valor, data padrão hoje, nota opcional).
  - Mostra Total Pago / Saldo restante em tempo real.
  - Botão "Marcar como totalmente pago" (lança um pagamento com saldo restante e seta status `paid`).
- Ao adicionar/remover pagamento:
  - Recalcular `paid_amount` = soma de `receivable_payments.amount`.
  - Atualizar `status`:
    - `paid_amount = 0` → mantém status anterior (`pending`/`overdue`), `paid_at = null`.
    - `0 < paid_amount < amount` → `partial`.
    - `paid_amount >= amount` → `paid`, `paid_at` = data do último pagamento.
- Ao mudar status manualmente para "Pago" no Select sem parcelas: cria automaticamente um pagamento com o valor total.
- Ao mudar para "Pendente": pergunta confirmação e remove todos os pagamentos.

### 3. Acesso ao histórico
- Botão de ícone (relógio/histórico) em cada linha da tabela de Recebíveis abre o mesmo diálogo em modo "somente leitura + adicionar".
- Na coluna "Valor", manter exibição "Pago X · Resta Y" para `partial`; clicar abre o histórico.
- Na página `financial.clients.$name.tsx`, adicionar coluna/ação equivalente para abrir o histórico de cada cobrança do cliente.

### 4. Exportações e relatórios
- ExportMenu de Recebíveis: manter colunas atuais (Pago / Saldo agregados).
- ReportsTab: usar a soma de `receivable_payments.paid_at` no mês para "Receita do mês" (mais preciso que `paid_amount` + `paid_at` único). Fallback mantém compatibilidade com recebíveis antigos sem registros na nova tabela.

### 5. Migração de dados existentes
Na própria migração SQL, popular `receivable_payments` a partir dos recebíveis existentes:
- `status='paid'` → 1 pagamento de `amount` em `paid_at` (ou `updated_at` se nulo).
- `status='partial'` com `paid_amount` → 1 pagamento de `paid_amount` em `paid_at` (ou `updated_at`).
- Demais status → nenhum pagamento.

## Detalhes técnicos
- Tipo `Payment = { id, receivable_id, amount, paid_at, note, created_at }`.
- Validação no diálogo: `amount > 0` e `amount <= saldo restante`.
- Após cada mutação, refetch dos recebíveis para refletir status/saldo atualizados.
- Tipos do Supabase regenerados após a migração.

## Fora do escopo
- Edição inline de pagamentos já lançados (apenas adicionar/excluir).
- Anexos/comprovantes por pagamento.
- Notificação automática ao cliente a cada pagamento registrado.
