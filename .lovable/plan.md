# Nome do pagador nas Despesas da Planilha

Adicionar o campo "Pago por" (nome do pagador) em cada linha da seção Despesas da aba Planilhas.

## O que muda

- Cada despesa passa a ter três campos: Descrição, Valor e Pago por.
- O nome do pagador aparece no PDF (nova coluna na tabela de despesas) e na exportação CSV.
- Despesas já salvas continuam funcionando: o campo fica vazio quando não existir.

## Detalhes técnicos

- `src/lib/trip-sheet-types.ts`: adicionar `paid_by: string` em `ExpenseRow` e em `emptyExpense()`.
- `src/routes/planilhas.tsx`: novo input "Pago por" na linha de despesa do editor; incluir o campo na exportação CSV.
- `src/lib/trip-sheet-pdf.ts`: tabela de despesas passa a ter as colunas DESCRIÇÃO, PAGO POR e VALOR.
- Sem migração de banco: despesas já são armazenadas em coluna JSONB.
