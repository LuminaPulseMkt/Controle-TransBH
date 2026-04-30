## Plano

Aumentar a logo nos cabeçalhos de **Orçamento, Contrato e Relatório Financeiro** (web + PDF) para **250px de altura**, exibindo **somente a logo** (sem nome textual nem subtítulo ao lado), mantendo fallback de texto quando não houver `logo_url`.

## Mudanças

### 1. Web — `src/components/DocumentView.tsx`
No cabeçalho `<div className="bg-[#0d1b2a] ...">`:
- Trocar `className="h-14 md:h-16 w-auto object-contain drop-shadow-..."` da `<img>` por `className="w-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"` + `style={{ height: "250px" }}`.
- O bloco já remove o texto quando há logo (lógica atual com `company?.logo_url ?`), então nada mais muda ali.
- Aumentar levemente o `py` do header (de `py-5` para `py-6`) para acomodar a logo maior sem corte.

### 2. PDF de Orçamento/Contrato (área autenticada) — `src/routes/documents.tsx`
Na função `exportPDF`:
- Aumentar a altura da faixa `#0d1b2a` do header de 30mm para **~70mm** (equivalente a 250px @ ~96dpi → ~66mm; arredondamos 70mm).
- Trocar a chamada `doc.addImage(logoDataUrl, "PNG", 14, 6, ...)` para usar **altura 60mm** centralizada verticalmente na faixa: `const h = 60; const w = logo.widthFor(h); doc.addImage(logo.dataUrl, "PNG", 14, (70-h)/2, w, h);`.
- Remover qualquer texto auxiliar ("TransBH"/subtítulo) ao lado da logo no header.
- Fallback (sem logo): manter `doc.text("TransBH", 14, 20)` mas dentro da nova faixa (ajustar y para ~40).
- Empurrar o `startY` do conteúdo para depois da nova faixa (`y = 80` em vez de `40`).

### 3. PDF público — `src/routes/d.$token.tsx`
Mesma alteração da seção 2 na função `exportPDF`:
- Faixa de 70mm, logo 60mm de altura, sem texto ao lado, conteúdo começando após a faixa.

### 4. PDF do Relatório Financeiro — `src/routes/financial.tsx`
Na função `exportPDF`:
- Adicionar faixa `#0d1b2a` de 70mm (hoje só tem texto).
- Renderizar a logo com altura 60mm à esquerda (mesmo cálculo via `loadLogoDataUrl` + `widthFor`).
- **Remover** o texto "TransBH — Relatório Financeiro" do cabeçalho colorido (somente a logo, conforme pedido).
- Manter um título "Relatório Financeiro" em preto **abaixo** da faixa (em ~y=80), pois é necessário identificar o documento.
- Fallback sem logo: desenhar a faixa e escrever "TransBH" branco centralizado.

### 5. Sem alterações
- `DocumentPreviewDialog.tsx` (já passa `company` com `logo_url`).
- `src/lib/pdf-logo.ts` (helper já pronto, será reutilizado).
- Assinatura do contrato (logo pequena de 8mm permanece como está — não foi pedido alterar).
- Sidebar, login, feedback, social.

## Detalhes técnicos

- 250px @ 96dpi ≈ 66mm; usamos **60mm** no PDF para deixar margem visual dentro da faixa de 70mm.
- Largura da logo no PDF é proporcional via `LoadedLogo.widthFor(60)`.
- Em telas estreitas (mobile), 250px de altura vai dominar o header — é o tamanho explicitamente pedido.
- Tipo do documento + data (lado direito do header web) permanece, pois identifica o documento.

## Fora de escopo

- Card de entrega em `/social`, sidebar, login, feedback, assinatura de contrato.
