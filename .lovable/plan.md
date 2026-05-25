## Objetivo
Fazer a logo aparecer no cabeçalho do **orçamento** (pré-visualização interna, página pública `/d/{token}` e PDF exportado) usando a logo embutida `src/assets/logo-transbh.png` como **fallback** quando `company_settings.logo_url` estiver vazia.

## Causa raiz
O código já renderiza `company.logo_url` no cabeçalho do orçamento em três pontos, mas no banco `company_settings.logo_url` está `NULL` — então nada aparece. A logo embutida (já usada na sidebar via `BrandLogo`) será o fallback.

## Mudanças

### 1. `src/components/DocumentView.tsx`
- Importar `fallbackLogo from "@/assets/logo-transbh.png"`.
- No cabeçalho, quando `!isContract`, usar `company?.logo_url ?? fallbackLogo` no `<img src>` — assim sempre renderiza a logo no orçamento, nunca cai no bloco "FileText + nome".
- Manter o branch atual (FileText + nome) só para contratos.

### 2. `src/lib/pdf-logo.ts`
- Suportar **import de asset local** além de URL remota: se o `url` recebido começar com `data:` ou for um caminho relativo do bundler (ex.: `/assets/...`), seguir o fluxo de `fetch` normalmente (já funciona para URLs servidas pelo Vite).
- Sem mudança de assinatura.

### 3. `src/routes/documents.tsx` (PDF interno)
- Importar `fallbackLogo from "@/assets/logo-transbh.png"`.
- Na geração do PDF do orçamento (`!isContract`), passar `company?.logo_url ?? fallbackLogo` para `loadLogoDataUrl(...)`.

### 4. `src/routes/d.$token.tsx` (PDF da página pública)
- Mesmo ajuste: `loadLogoDataUrl(company?.logo_url ?? fallbackLogo)` para orçamentos.

## Fora de escopo
- Contratos continuam sem logo no cabeçalho (comportamento atual preservado — mantém o visual sóbrio do contrato com assinaturas no rodapé).
- Nenhuma migration; nenhum upload automático ao bucket.
- Quando você subir uma logo definitiva em **Configurações da empresa**, ela passa a sobrescrever o fallback automaticamente em todos os pontos.
