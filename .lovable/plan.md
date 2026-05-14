## Padronizar logo TransBH (login, home, sidebar e cards)

**Referência única**: altura 80px (h-20) para hero/branding (login + home), versão reduzida proporcional para chrome (sidebar) e tamanho relativo no card de mídia. Fonte: `company_settings.logo_url` com fallback no asset estático `@/assets/logo-transbh.png`.

### Mudanças

**1. Helper compartilhado** — `src/components/BrandLogo.tsx` (novo)
- Componente único: lê `company_settings.logo_url` (cache em memória, evita refetch), faz fallback para o asset local.
- Props: `size?: "sm" | "md" | "lg"` → `h-7` / `h-12` / `h-20`, `className?`.
- `alt="TransBH"`, `object-contain`, `w-auto`.
- Garante mesmo arquivo em todo lugar e centraliza o tamanho.

**2. Login** — `src/routes/login.tsx`
- Trocar `<img src={logo} … h-20 …>` por `<BrandLogo size="lg" />`. Mantém o tamanho atual (h-20) e o `mb-2`.

**3. Home `/`** — `src/routes/index.tsx`
- Inserir, no topo do conteúdo do `<DashboardPage>` (dentro de `AppLayout`), um bloco de marca:
  - `<div className="flex items-center gap-4 mb-6"><BrandLogo size="lg" /><div><h1 className="text-display text-3xl">Painel</h1><p className="text-xs uppercase tracking-widest text-muted-foreground">Gestão de Transporte de Veículos</p></div></div>`
- Remover o `title="Dashboard"` do `AppLayout` apenas nesta página (evita H1 duplicado).

**4. Sidebar** — `src/components/AppSidebar.tsx`
- Trocar `<img src={logo} … h-12 / h-7 …>` por `<BrandLogo size={collapsed ? "sm" : "md"} />`.
- Mesmo arquivo e mesma fonte de dados que login/home — apenas reduzido (`h-12` expandido, `h-7` colapsado) por restrição do header da sidebar.

**5. Card de entrega (social)** — `src/routes/social.tsx`
- Já ajustado na rodada anterior (top/right 3cqw, height 14cqw). Manter como está — o card é renderizado em pixels reais (1080x1350), então `cqw` é o equivalente proporcional ao h-20 do hero.

**6. Cabeçalho de documentos** — `src/components/DocumentView.tsx`
- O logo do header está em `height: 180px` (gigante e fora do padrão). Reduzir para `height: 80px` (alinhado a h-20) e remover `style` inline, usando `className="h-20 w-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"`.
- Não alterar exporters de PDF (`src/lib/exporters.ts`) — o tamanho lá é controlado por jsPDF e não afeta a tela.

### Fora de escopo
- PDF/exportações (jsPDF) — tamanho impresso é outro contexto.
- Feedback público / página `/d/$token` (já usa `DocumentView`, herda a correção).
- Mudanças de cor/forma do logo.

### Validação
- `/login`: logo h-20 centralizado.
- `/` (home): novo bloco de marca no topo, logo h-20 ao lado de "Painel".
- Sidebar: logo h-12 (expandido) / h-7 (colapsado), mesmo arquivo do login.
- `/documents` preview e `/d/{token}`: logo no cabeçalho em h-20 (não mais 180px).
- `/social` card de entrega: inalterado, já proporcional.
