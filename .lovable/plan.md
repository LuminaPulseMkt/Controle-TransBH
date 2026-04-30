## Plano

Substituir a logo atual pela nova enviada (`remover_fundo-removebg-preview-2.png`) e melhorar a qualidade visual em todos os pontos onde a logo aparece (headers web, PDFs, sidebar, etc).

## Estratégia para qualidade

A imagem enviada tem fundo já removido (PNG transparente), mas a resolução é modesta (~456px de largura). Para evitar pixelização, especialmente no header web a 250px de altura e no PDF a 60mm:

1. **Upscale 2x via AI** usando o Lovable AI Gateway com `google/gemini-3-pro-image-preview` (Nano banana pro) com prompt: *"Upscale this logo to 2x resolution, sharpen edges, preserve transparency, maintain exact colors and design, no background"*. Isso gera uma versão ~900px nítida.
2. Salvar resultado em `src/assets/transbh-logo-v2.png` (substituindo conceitualmente o `transbh-logo.jpeg` antigo, que fica como fallback).
3. Também copiar para `public/transbh-logo.png` para uso direto via URL nos PDFs/Open Graph se necessário.

## Mudanças

### 1. Adicionar nova logo aos assets
- `code--copy user-uploads://remover_fundo-removebg-preview-2.png` → `src/assets/transbh-logo-v2.png` (versão original como backup).
- Rodar script Node que chama o AI Gateway (`LOVABLE_API_KEY` já configurado) para fazer upscale, salvando em `src/assets/transbh-logo-hd.png`.
- Copiar o resultado HD também para `public/transbh-logo.png`.

### 2. Atualizar referências locais à logo
Buscar onde `transbh-logo.jpeg` é importado:
- `rg "transbh-logo"` → atualizar imports para `@/assets/transbh-logo-hd.png`.
- Provavelmente em sidebar / login / fallback.

### 3. Atualizar `company_settings.logo_url` no banco
A logo principal exibida em headers vem de `company_settings.logo_url` (Supabase). Para que apareça em produção sem o usuário precisar fazer upload manual:
- Fazer upload do arquivo HD para o bucket de logos do Supabase via script (usando `supabase` client server-side ou `psql` para inserir/atualizar a URL).
- OU instruir o usuário a re-upar pela tela de Configurações (mais simples mas exige ação dele).

**Recomendação**: fazer upload programático para o storage e atualizar `company_settings.logo_url` automaticamente, para que tudo funcione sem ação extra do usuário.

### 4. Melhorias de renderização (sem código novo)
A logo já é exibida com `object-contain` em todos os pontos, então a substituição da fonte pela versão HD é suficiente — não precisa mexer nos componentes que já foram ajustados (header 250px / PDF 60mm).

## QA

Após substituir:
- Abrir `/documents` → preview de Orçamento e Contrato → confirmar logo nítida no header.
- Abrir `/financial` → exportar PDF → inspecionar PDF gerado para garantir que a logo aparece nítida e centralizada na faixa de 70mm.
- Página pública `/d/$token` → idem.

## Fora de escopo

- Redesenho da logo.
- Mudança de tamanho/posição (já definido em iteração anterior: 250px web, 60mm PDF).

Aprovar para eu implementar?
