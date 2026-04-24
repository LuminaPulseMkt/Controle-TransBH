## Objetivo

Deixar o Dashboard 100% navegável: cada KPI, gráfico e linha da tabela leva ao módulo correspondente já filtrado.

## Mudanças

### 1. KPIs clicáveis (`src/routes/index.tsx`)

Envolver cada `KpiCard` em `<Link>`:

| Card | Destino |
|---|---|
| Em andamento | `/transports?status=in_progress` |
| A receber | `/financial?status=pending` |
| Vencidos | `/collections` |
| Receita do mês | `/financial?status=paid&period=month` |

Adicionar hover state (ring/translate) no `KpiCard` para indicar que é clicável.

### 2. Gráfico Receita vs Despesas

Tornar o card inteiro clicável → `/financial`. Adicionar botão "Ver detalhes →" no header do card.

### 3. Tabela "Transportes recentes"

- Cada linha (`<tr>`) vira clicável → `/transports/$id` usando `useNavigate`, com `cursor-pointer` e hover já existente.
- Coluna **Cliente**: link para `/financial/clients/$name` (página já existente) com `stopPropagation`.
- Coluna **Código**: mantém ida para `/transports/$id`.

### 4. Suporte a filtros nas páginas destino

As rotas `/transports`, `/financial` e `/collections` precisam aceitar `search params` (`status`, `period`) via `validateSearch` e aplicar como filtro inicial nas queries Supabase. Se já existirem filtros locais, pré-popular o estado a partir do search param.

## Arquivos editados

- `src/routes/index.tsx` — envolver KPIs e linhas em Link / navegação programática
- `src/routes/transports.index.tsx` — `validateSearch({status})` + pré-filtro
- `src/routes/financial.tsx` — `validateSearch({status, period})` + pré-filtro
- `src/routes/collections.tsx` — confirmar listagem default já mostra vencidos (sem mudança se for o caso)

## Detalhes técnicos

- Usar `Link` do `@tanstack/react-router` (não interpolar params na string `to`).
- `validateSearch` com schema simples (string opcional) para evitar erros de tipo.
- Em linhas da tabela: `onClick` no `<tr>` + `e.stopPropagation()` nos sub-links para evitar navegação dupla.
