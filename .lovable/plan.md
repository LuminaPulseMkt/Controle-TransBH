## Objetivo

Mostrar a logo apenas no **orçamento** e no **sidebar** (web). No **contrato**, substituir a logo pelo texto "TRANSBH - Transporte de Veículos" (em vez da imagem) — tanto na pré-visualização quanto no PDF gerado.

## Escopo

### 1. `src/components/DocumentView.tsx` (pré-visualização web/HTML)

No cabeçalho azul-escuro:
- Se `doc.doc_type === "contract"` → renderizar bloco textual: título grande "TransBH" + subtítulo "Transporte de Veículos" (o fallback que já existe para quando não há logo).
- Se `doc.doc_type === "budget"` → manter a `<img>` da logo como está hoje.

No bloco de assinatura "Contratada" (só aparece em contrato): trocar a `<img>` pelo nome textual da empresa (`company?.name || "TransBH"`).

### 2. `src/routes/documents.tsx` (geração de PDF via jsPDF)

Função de exportação de PDF (linhas ~263 a ~329):
- Cabeçalho: só chamar `doc.addImage(logo...)` quando `d.doc_type === "budget"`. Para contrato, escrever no cabeçalho o texto "TRANSBH" (grande, branco) e logo abaixo "Transporte de Veículos" (menor), posicionados onde hoje vai a logo.
- Assinatura da contratada (bloco do contrato, ~linha 326-329): remover `addImage` e escrever apenas o texto "TransBH" sobre a linha de assinatura.

### 3. Sidebar

Sem alteração — o sidebar já usa o ícone `Package2` + texto "TransBH" (não usa `logo_url`). O comportamento atual já atende ao pedido.

## O que NÃO muda

- Tela de Configurações, Social, login, e qualquer outro lugar que use `logo_url`.
- O valor de `logo_url` no banco continua existindo (usado no orçamento).

## Resultado

| Local | Antes | Depois |
|---|---|---|
| Sidebar | Ícone + "TransBH" | Igual |
| Orçamento (web + PDF) | Logo PNG | Logo PNG |
| Contrato (web + PDF) | Logo PNG | Texto "TRANSBH — Transporte de Veículos" |