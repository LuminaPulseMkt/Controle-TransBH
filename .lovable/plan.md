## Objetivo
Em **orçamento e contrato**, na seção "Veículos":
- Remover a exibição do campo **Valor** (R$) por veículo.
- Manter o campo **Valor do veículo** (informativo, **não soma** no total).

## Mudanças

### 1. `src/components/DocumentView.tsx`
- No card de cada veículo, remover o badge `brl(v.value)` no canto direito (tanto orçamento quanto contrato).
- A linha `Valor do veículo` passa a ser exibida em **ambos** os tipos (remover o gate `isContract`), quando `v.market_value > 0`.
- Na seção "Valores", remover a listagem por veículo com `brl(v.value)`. Continuam Adicionais / Coleta / Entrega / Total.

### 2. `src/routes/documents.tsx` (formulário + PDF)
- No formulário de veículos, mostrar o input **"Valor do veículo (R$)"** também para orçamento (remover gate `docType === "contract"`).
- O input "Valor (R$)" permanece (continua sendo a base do total internamente), apenas deixa de aparecer nos documentos exibidos/PDF.
- No PDF (orçamento e contrato): na listagem de veículos, não imprimir a linha "Valor: R$ X". Imprimir "Valor do veículo: R$ X" quando houver. Na seção "Valores" do PDF, omitir as linhas por veículo (mantém Adicionais / Coleta / Entrega / Total).

### 3. `src/routes/d.$token.tsx` (página pública / PDF público)
Mesmas alterações de PDF do item 2 aplicadas à geração pública.

## Fora de escopo
- Cálculo do `total` segue usando `v.value` internamente; apenas a exibição é removida.
- Nenhuma mudança de schema — `market_value` já existe no payload.
