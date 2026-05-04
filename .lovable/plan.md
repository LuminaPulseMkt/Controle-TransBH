## Objetivo
Garantir que contratos nunca exibam a logo no cabeçalho — sempre o texto "TransBH - Transporte de Veículos".

## Estado atual
- `src/components/DocumentView.tsx` (preview web): já oculta a logo em contratos e mostra o texto. ✅
- `src/routes/documents.tsx` (PDF interno): já oculta a logo em contratos e escreve o texto. ✅
- `src/routes/d.$token.tsx` (PDF da página pública `/d/:token`): **ainda renderiza a logo para contratos**. ❌

## Mudança
Em `src/routes/d.$token.tsx`, dentro de `exportPDF()` (linhas ~73–82):
- Calcular `isContract = d.doc_type === "contract"`.
- Carregar a logo apenas quando não for contrato.
- Quando não houver logo (ou for contrato), desenhar:
  - Linha 1: nome da empresa (`company?.name || "TransBH"`) em fonte 20, cor âmbar.
  - Linha 2: "Transporte de Veículos" em fonte 11, cor branca.

## Fora de escopo
- Preview web e PDF interno (já corretos).
- Bloco de assinatura do contratado (já usa texto).
