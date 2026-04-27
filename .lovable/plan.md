# Editar status na aba Financeiro

Adicionar um seletor inline na tabela de **Contas a Receber** permitindo alterar o status de cada cobrança entre **Pendente**, **Pago Parcial** e **Pago** com salvamento imediato no banco.

## O que muda

### 1. Banco de dados (migration)
Adicionar o valor `partial` ao enum `payment_status`:
```sql
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'partial';
```
Os valores existentes (`paid`, `pending`, `overdue`, `negotiated`) continuam funcionando — nada é removido.

### 2. Labels e estilos visuais
- `src/lib/format.ts` — adicionar `partial: "Pago Parcial"` em `paymentStatusLabel`.
- `src/components/StatusBadge.tsx` — adicionar estilo amarelo/warning para `partial`:
  ```ts
  partial: "bg-warning/15 text-warning border-warning/40"
  ```

### 3. Edição inline na tabela (`src/routes/financial.tsx`)
Substituir a coluna "Status" + botão "Marcar pago" por um **Select inline** com as opções:
- Pendente
- Pago Parcial
- Pago

Comportamento:
- Ao escolher **Pago** → atualiza `status='paid'` e define `paid_at` para hoje.
- Ao escolher **Pago Parcial** → atualiza `status='partial'`, mantém `paid_at` em branco.
- Ao escolher **Pendente** → volta `status='pending'` e limpa `paid_at`.
- Mostra toast de sucesso/erro e recarrega a lista.
- Se o status atual for `overdue` ou `negotiated`, o select ainda exibe o valor original mas permite mover para uma das três opções principais.

O filtro do topo ("Todos / Pago / Pendente / ...") passa a incluir automaticamente "Pago Parcial" pois lê de `paymentStatusLabel`.

## Arquivos alterados
- `supabase` migration (novo valor de enum)
- `src/lib/format.ts`
- `src/components/StatusBadge.tsx`
- `src/routes/financial.tsx` (substituir botão por Select inline na coluna de status)

## Observação
Não vou alterar a aba **Contas a Pagar** (despesas) — ela não tem status de pagamento no schema atual; só a aba **Contas a Receber** ganha o controle.
