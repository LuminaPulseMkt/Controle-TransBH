## Objetivo

Garantir que os PDFs gerados (tanto na tela de Documentos quanto no link público `/d/:token`) tenham:

1. A lista correta de veículos com o campo **"Valor do veículo"** (`market_value`) quando informado.
2. **Nenhum** campo "Valor" (`value`) por veículo nos contratos.
3. **Todas as cláusulas do contrato** (texto completo de `body.notes`) renderizadas, com quebra de página automática para não cortar conteúdo.

## Alterações

### 1. `src/routes/documents.tsx` (PDF principal)

- Na seção do contrato (linhas ~483-495) substituir o parágrafo único hardcoded ("As partes acima identificadas...") pela renderização real de `d.body?.notes` (que contém as cláusulas completas vindas do template).
- Adicionar utilitário interno de paginação: quando o cursor `y` ultrapassar a área útil (acima do rodapé), chamar `doc.addPage()` e reposicionar `y` no topo, repetindo até imprimir todas as linhas das cláusulas.
- Manter o bloco de assinaturas (Cliente / Empresa) ao final, também respeitando a quebra de página.
- Confirmar que a listagem de veículos continua sem o campo "Valor" e exibe "Valor do veículo" apenas quando `market_value > 0` (já está correto — sem alterações nesse trecho).

### 2. `src/routes/d.$token.tsx` (PDF público do link compartilhado)

- Substituir o trecho que imprime apenas `d.body?.vehicle` (legacy, linha ~114) por uma iteração sobre `d.body?.vehicles` (array), igual à de `documents.tsx`:
  - Para cada veículo: descrição, placa, tipo, cor.
  - Linha adicional "Valor do veículo: R$ ..." quando `market_value > 0`.
  - **Sem** linha de "Valor" por veículo.
  - Fallback para o formato legado (`body.vehicle`, `body.vehicle_plate`, `body.vehicle_color`) quando o array não existir.
- Substituir o bloco final de `notes` (linhas ~130-136) por uma versão paginada que percorre as linhas geradas por `splitTextToSize` e chama `pdf.addPage()` ao atingir o limite vertical, evitando que cláusulas longas sejam cortadas ou sobrescrevam o rodapé.
- Garantir que o rodapé da empresa seja desenhado **na última página** (não em todas), preservando o comportamento atual.

### 3. Sem alterações em `DocumentView.tsx`

A renderização HTML (preview e tela `/d/:token`) já está correta após as iterações anteriores: mostra "Valor do veículo" e omite "Valor" em contratos. As cláusulas aparecem na seção "Observações" via `body.notes`.

## Detalhes técnicos

- Constante de margem inferior: `const bottomLimit = pageH - 30` (deixa espaço para o rodapé de ~22pt + folga).
- Helper local em cada PDF:

```ts
const ensureSpace = (lines: number) => {
  if (y + lines * 5 > bottomLimit) {
    doc.addPage();
    y = 20;
  }
};
```

- Para cláusulas: `const split = doc.splitTextToSize(notes, 180)`; iterar em chunks (ex.: 5 linhas), chamar `ensureSpace(chunk.length)` e depois `doc.text(chunk, 14, y); y += chunk.length * 5`.
- Em `documents.tsx` o rodapé é desenhado uma única vez após `doc.save`; manter assim, mas se múltiplas páginas existirem, repetir o rodapé por página com `doc.setPage(i)` em loop final (opcional — manter só na última página para simplicidade, já é o padrão atual).

## Fora de escopo

- Nenhuma mudança em regras de negócio, totais ou cálculos.
- Nenhuma mudança em RLS / segurança (já tratada na migração anterior).
