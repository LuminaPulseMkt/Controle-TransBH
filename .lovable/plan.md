## Objetivo

1. Mudar a proporção do card de "Entrega Concluída" em `/social` para **1080x1350** (formato Instagram retrato 4:5).
2. Substituir o texto "TransBH" usado nos **cabeçalhos de Orçamento, Contrato e Relatório (Transporte/Financeiro)** pela **logo da empresa sem fundo**, em tamanho legível e destacável. Quando não houver logo configurada em `company_settings.logo_url`, manter o texto como fallback.

## Mudanças

### 1. Card de entrega 1080x1350 — `src/routes/social.tsx`

- O card hoje é `aspect-square` (1:1). Trocar para a proporção `1080/1350` (= 4/5 retrato):
  - `className="w-full aspect-square ..."` → `className="w-full ..."` com `aspectRatio: "1080 / 1350"` no `style`.
- A geração de imagem (`toPng`) será exportada na resolução real do nó. Para garantir saída exata em **1080×1350**, calcular `pixelRatio` dinamicamente em `downloadCard`:
  - `const w = cardRef.current.clientWidth; const pixelRatio = 1080 / w;`
  - Passar `{ pixelRatio, canvasWidth: 1080, canvasHeight: 1350, cacheBust: true }` em `toPng`.
- A colagem 2x2 já é responsiva (grid 1fr 1fr), continua funcionando — fica retangular agora.
- Como o `containerType: "size"` faz tudo escalar com `cqw` (largura), o logo, o carimbo e o rodapé manterão proporções; só vão ficar com mais "respiro" vertical. Reduzir levemente o logo se necessário (manter 28cqw está ok).
- Ajustar a borda do preview (rounded-lg) — sem mudança funcional.

### 2. Cabeçalhos com logo — Orçamento e Contrato

#### 2a. Tela web — `src/components/DocumentView.tsx`
- Aceitar `logo_url` em `CompanyInfo` (`logo_url?: string | null`).
- No header (linha 39–59), substituir o bloco do ícone `<FileText/>` + nome textual por:
  - Se `company.logo_url`: `<img src={logo_url} className="h-14 md:h-16 w-auto object-contain drop-shadow" />` (sem fundo, altura legível ≈ 56–64px).
  - Senão: manter o nome textual atual como fallback.
- Buscar `logo_url` onde `DocumentView` é usado:
  - `src/routes/d.$token.tsx`: ampliar o `select("name,phone,whatsapp,email,address,cnpj")` para incluir `logo_url`.
  - `src/components/DocumentPreviewDialog.tsx` (verificar e estender o select da company se aplicável).
- Na assinatura do contrato (linhas 115–120), trocar o texto "TransBH"/`company.name` da Contratada por uma logo menor (`h-8 w-auto`) acima da linha "Contratada", quando houver `logo_url`.

#### 2b. PDF — `src/routes/documents.tsx` (função `exportPDF`, ~250)
- Buscar a logo (uma vez no carregamento da página, junto com `company`):
  - Adicionar `logoDataUrl` no estado, carregar `company_settings.logo_url`, e converter para dataURL via `fetch + blob + FileReader` (necessário para `jsPDF.addImage`).
- No header do PDF:
  - Manter retângulo `#0d1b2a` (30mm de altura).
  - Se `logoDataUrl`: `doc.addImage(logoDataUrl, "PNG", 14, 6, 0, 18)` (altura 18mm, largura auto via jsPDF — usar `addImage` com `getImageProperties` para preservar proporção).
  - Senão: manter `doc.text("TransBH", 14, 20)` como fallback.
- Mesma alteração na assinatura do contrato (linha 312 — "TransBH" sob a linha) — substituir por logo pequena (h ≈ 12mm) ou manter texto como fallback.

#### 2c. PDF público — `src/routes/d.$token.tsx` (função `exportPDF`, ~74)
- Mesma lógica da 2b: carregar `logo_url` (já está em `company_settings`, basta incluir no select), converter para dataURL e usar `addImage` no cabeçalho. Fallback: `company?.name || "TransBH"`.

### 3. Cabeçalho do Relatório Financeiro (entendido como "transporte/relatório")

#### `src/routes/financial.tsx` (`exportPDF`, ~414)
- O header hoje é só `doc.text("TransBH — Relatório Financeiro", 14, 20)`.
- Adicionar carregamento de `logo_url` no `useEffect` da página (`company_settings`).
- Antes do texto, desenhar logo: `doc.addImage(logoDataUrl, "PNG", 14, 8, 0, 16)` e mover o título para a direita: `doc.text("Relatório Financeiro", 50, 20)`.
- Sem logo: manter o texto atual como fallback.

### 4. Helper compartilhado (opcional, recomendado)

Criar `src/lib/pdf-logo.ts` com:
```ts
export async function loadLogoDataUrl(url: string | null): Promise<{ dataUrl: string; w: number; h: number } | null>
```
- Faz `fetch(url)` → `blob()` → `FileReader.readAsDataURL` → mede dimensões via `Image()` para calcular largura proporcional dada uma altura alvo.
- Reusado por `documents.tsx`, `d.$token.tsx`, `financial.tsx`.

## Detalhes técnicos

- **Dimensão fixa 1080×1350**: `html-to-image` aceita `canvasWidth`/`canvasHeight` + `pixelRatio`. Calcular `pixelRatio = 1080 / cardRef.clientWidth` garante o output em pixels exatos, independente do tamanho renderizado em tela.
- **Logo sem fundo**: assumir que o `logo_url` em `company_settings` já é PNG/SVG transparente (é o mesmo asset usado em `/social` e `/feedback`). Renderizar com `object-contain` no web e `addImage(..., "PNG", ...)` no PDF — PNGs com alfa são preservados pelo jsPDF.
- **Tamanho legível**:
  - Web (header de documento): `h-14 md:h-16` (≈ 56–64px).
  - PDF cabeçalho colorido: altura 16–18mm com largura auto.
  - Assinatura de contrato: ~12mm.
- **Fallback obrigatório**: se `logo_url` for `null` ou o fetch falhar, usar o texto atual ("TransBH" / `company.name`) — nunca quebrar o documento.

## Fora de escopo

- Não alterar a logo exibida na sidebar (`AppSidebar.tsx`) nem na tela de login/feedback.
- Não alterar a mensagem de WhatsApp ("— TransBH" no final), pois é texto plano enviado.
- Não criar nova tabela ou upload — usa-se a `company_settings.logo_url` já existente.