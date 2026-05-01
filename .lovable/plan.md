## Plano

Substituir a logo atual pela nova imagem anexada (`remover_fundo-removebg-preview-removebg-preview-2.png` — caminhão TransBH com fundo transparente), aplicando upscale 2x via IA para melhorar nitidez e resolução, mantendo o tamanho de exibição já configurado (180px web / 48mm PDF).

## Mudanças

### 1. Processar a nova logo
- Copiar `user-uploads://remover_fundo-removebg-preview-removebg-preview-2.png` para `/tmp/logo-original.png`.
- Gerar versão HD via Lovable AI Gateway (modelo `google/gemini-3-pro-image-preview` — Nano Banana Pro) com prompt do tipo:
  > *"Upscale 2x, sharpen edges and text, enhance details, preserve full transparency (alpha channel), keep exact composition, colors and proportions"*.
- Salvar resultado em:
  - `src/assets/transbh-logo.png` (HD para uso no app via import).
  - `public/transbh-logo.png` (cópia servida por URL).

### 2. Subir para o Storage do Supabase
- Upload do PNG HD para o bucket público `company-assets` (já usado).
- Atualizar `company_settings.logo_url` via migration para apontar para a nova URL pública (cache-busting com timestamp no nome).

### 3. Sem alteração de tamanho
- `DocumentView.tsx`: mantém `height: 180px` no header web.
- `documents.tsx`, `d.$token.tsx`, `financial.tsx`: mantêm `headerH=56mm`, `targetH=48mm`, largura máx. 140mm no PDF.
- `pdf-logo.ts`: helper continua válido (preserva proporção automaticamente).

## Detalhes técnicos
- Upscale preservando canal alpha (transparência) — Nano Banana Pro suporta PNG transparente.
- Nome do arquivo no Storage com timestamp (ex.: `transbh-logo-{ts}.png`) para invalidar cache do navegador/CDN.
- Migration única atualizando a linha existente em `company_settings`.

## Fora de escopo
- Nenhuma mudança em sidebar, login, feedback, social ou na assinatura do contrato (continuam com a logo nos seus tamanhos atuais).
- Nenhuma alteração de layout/typografia.
