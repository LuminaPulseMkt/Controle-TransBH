## Objetivo

Tornar o fundo do app branco (tema claro) em todas as áreas, mantendo o **menu lateral (sidebar)** com o azul escuro atual.

## Abordagem

O app hoje força tema dark global (classe `dark` no `<body>` em `src/routes/__root.tsx`) e os tokens em `src/styles.css` estão todos em tons escuros. A sidebar usa um conjunto separado de tokens (`--sidebar*`) que já são azul escuro — então basta:

1. Remover o `dark` do `<body>` e clarear os tokens base.
2. Manter os tokens `--sidebar*` exatamente como estão (azul escuro).

## Mudanças

### 1. `src/routes/__root.tsx`
- Trocar `<body className="dark">` por `<body>` para não forçar dark mode.

### 2. `src/styles.css`
- Reescrever os tokens em `:root` para versão clara:
  - `--background`: branco puro
  - `--foreground`: cinza muito escuro (texto)
  - `--card` / `--popover`: branco (com leve diferença) e foreground escuro
  - `--muted`: cinza bem claro; `--muted-foreground`: cinza médio
  - `--secondary` / `--accent`: cinza claro / âmbar (mantém marca)
  - `--primary`: manter âmbar atual (`oklch(0.78 0.16 70)`) — é a cor da marca
  - `--border` / `--input`: cinza claro
  - `--ring`: âmbar (mantém)
  - Ajustar `--grid-pattern` para linhas cinza muito sutis sobre branco (substituir o tom escuro atual por algo como `oklch(0.9 0.005 255 / 0.6)`).
- **Manter intactos** os tokens da sidebar (azul escuro):
  - `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`.
- Remover/neutralizar o bloco `.dark { ... }` (ou deixá-lo igual ao `:root` claro) para que, mesmo se algo aplicar `.dark`, não volte ao escuro.

### 3. Verificação visual
Após aplicar, conferir:
- Header (`AppLayout`): usa `bg-card/50` — ficará branco translúcido sobre branco, ok.
- Cards, inputs, dialogs (shadcn/ui): seguem tokens automaticamente, devem ficar claros.
- Sidebar (`AppSidebar` / `ui/sidebar.tsx`): usa `bg-sidebar` e classes `text-sidebar-*` → continua azul escuro com texto claro.
- `bg-grid` no `<main>`: padrão de grid sutil em cinza claro sobre branco.
- Página `login.tsx`, `feedback.tsx`, `d.$token.tsx`: revisar se há classes hardcoded escuras (ex: `bg-background bg-grid`) — devem se adaptar automaticamente aos novos tokens.

## Fora de escopo

- Não alterar o card de redes sociais (`/social`) — ele usa cores fixas (`#0b0b0b`) intencionalmente para o post.
- Não trocar a cor primária âmbar da marca.
- Não criar toggle de tema (apenas mudar para claro fixo, mantendo sidebar azul).