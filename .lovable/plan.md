## Objetivo
Na aba Financeiro → Contas a Receber, ao marcar um recebível como "Pago Parcial", abrir um diálogo para informar o valor pago parcialmente, salvar esse valor e exibi-lo na listagem.

## Mudanças

### 1. Banco de dados (migração)
Adicionar coluna `paid_amount numeric` (nullable) na tabela `receivables` para armazenar o valor já pago quando o status for `partial` (ou o valor total quando for `paid`).

### 2. UI — `src/routes/financial.tsx` (ReceivablesTab)
- Ao selecionar "Pago Parcial" no Select de status, abrir um Dialog pedindo o valor pago (pré-preenchido com `paid_amount` atual, se houver; máximo = `amount`).
- Botão Salvar atualiza `status='partial'` + `paid_amount` no Supabase.
- Mostrar na coluna "Valor" o saldo: ex. `R$ 500,00 / R$ 1.200,00` quando parcial, com o valor pago em verde e saldo restante destacado.
- Ao mudar para "Pago", setar `paid_amount = amount`. Ao voltar para "Pendente", limpar `paid_amount = null`.
- Incluir "Valor pago" e "Saldo" no export (ExportMenu).

### 3. Relatórios (ReportsTab)
- Considerar `paid_amount` de recebíveis `partial` na "Receita do mês" (somar parciais com `paid_at` no mês — ou usar `updated_at` como aproximação se `paid_at` não for setado para parciais). Decisão: setar `paid_at` também ao registrar pagamento parcial.

## Detalhes técnicos
- Tipo `Receivable` recebe `paid_amount: number | null`.
- Validação: `0 < paid_amount < amount` para `partial`; se igualar `amount`, sugerir mudar para "Pago".
- Sem mudanças em outras telas; tipos do Supabase serão regenerados após a migração.

## Fora do escopo
- Histórico de múltiplos pagamentos parciais (apenas um valor acumulado por enquanto).
