## Plano

Substituir a logo atual pela nova enviada (caminhão TransBH PNG transparente), com upscale 2x para melhor qualidade, e ajustar o tamanho exibido para **180px** (web) e **~48mm** (PDF) nos cabeçalhos de Orçamento, Contrato e Relatório Financeiro.

## Mudanças

### 1. Asset da nova logo
- Copiar `user-uploads://remover_fundo-removebg-preview-removebg-preview.png` para `/tmp` e gerar versão upscale 2x via Lovable AI Gateway (Nano Banana Pro — `google/gemini-3-pro-image-preview`) para aumentar nitidez/resolução.
- Salvar resultado em:
  - `src/assets/transbh-logo.png` (HD para uso no app via import).
  - `public/transbh-logo.png` (cópia para acesso por URL).

### 2. Banco — `company_settings.logo_url`
- Subir o PNG HD para o Storage do Supabase (bucket `logos` já usado em `settings.tsx`) e atualizar `logo_url` em `company_settings` via insert/update na linha existente (migration ou script `psql`/edge), garantindo que todos os documentos passem a usar a nova logo automaticamente.

### 3. Tamanho — Web
- `src/components/DocumentView.tsx` (linha 47): trocar `style={{ height: "250px" }}` por `style={{ height: "180px" }}`.
- Reduzir `py-6` do header de volta para `py-5` (mais proporcional aos 180px).

### 4. Tamanho — PDF (3 arquivos)
Em `src/routes/documents.tsx`, `src/routes/d.$token.tsx`, `src/routes/financial.tsx`:
- Faixa de header: reduzir `headerH` de **70mm → 56mm**.
- Logo: `targetH` de **60mm → 48mm** (180px @ ~96dpi ≈ 47.6mm).
- Largura máxima: aumentar de 120mm → 140mm para acomodar o aspecto largo da nova logo (caminhão + texto).
- Ajustar `y` inicial do conteúdo proporcionalmente (`headerH + 12 / +19 / +32`, já parametrizado).

### 5. Sem alteração
- `pdf-logo.ts` (helper continua válido).
- Assinatura do contrato (logo pequena 8mm).
- Sidebar, login, feedback, social.

## Detalhes técnicos
- Upscale: usar `lovable_ai.py --edit-image` com prompt tipo *"Upscale 2x, sharpen edges, preserve transparency, keep exact composition and colors"*.
- 180px @ 96dpi ≈ 47.6mm → arredondado para 48mm.
- Largura proporcional preservada via `LoadedLogo.widthFor(48)`.

## Fora de escopo
- Outras telas (sidebar, login, feedback, social) mantêm logo atual nos seus tamanhos.
