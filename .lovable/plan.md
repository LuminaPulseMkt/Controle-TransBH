## Objetivo

1. Criar um **Dashboard** completo (rota `/`) com indicadores de saúde financeira: orçamentos aprovados vs. não aprovados, custo real (parceiros/despesas) vs. valor cobrado (margem), e filtros por período.
2. Adicionar **exportação PDF + CSV** em todas as abas com listagens (Transportes, Documentos, Financeiro/Recebíveis, Financeiro/Despesas, Cobranças, Parceiros, Social, Usuários).

---

## 1. Dashboard reformulado (`src/routes/index.tsx`)

Substituir a home atual por um painel com:

**Filtro de período** (chips: Hoje / 7d / Mês atual / Mês anterior / 90d / Customizado com 2 date pickers).

**KPIs principais (cards):**
- Receita recebida (recebíveis `paid` no período)
- A receber (pending + partial + overdue)
- Despesas (payables no período)
- Custo com parceiros (soma `partner_quoted_amount` dos transportes no período)
- **Margem bruta** = Receita − (Despesas + Custo parceiros)
- Ticket médio por transporte

**Funil de orçamentos:**
- Orçamentos enviados, aceitos (com `accepted_at`), pendentes, taxa de conversão (%)
- Valor total cotado vs. valor total fechado

**Comparativo Custo x Cobrado (por transporte):**
- Tabela: Código · Cliente · Valor cobrado (recebível vinculado) · Custo parceiro · Margem · % margem
- Linhas com margem negativa destacadas em vermelho

**Gráficos** (usar `recharts`, já no stack shadcn):
- Linha: receita vs. despesa por dia/semana no período
- Barras: top 5 clientes por receita
- Pizza: status dos transportes

**Permissões:** dashboard financeiro só para quem tem `financial.view`. Para colaboradores sem essa permissão, mostrar versão enxuta (apenas transportes/funil sem valores).

**Botões "Exportar PDF" e "Exportar CSV"** no topo do dashboard, gerando o snapshot completo do período.

---

## 2. Utilitário compartilhado de exportação

Criar `src/lib/exporters.ts`:

```ts
export function exportCSV(filename: string, rows: Record<string, unknown>[]): void
export function exportPDF(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  company?: { name: string | null; logo_url: string | null };
  summary?: { label: string; value: string }[];
}): Promise<void>
```

- CSV: escape de aspas/vírgulas, BOM UTF-8 para Excel.
- PDF: reaproveita `jspdf` + `jspdf-autotable` + `loadLogoDataUrl` (mesmo header escuro do relatório financeiro existente).
- Componente `<ExportMenu />` (`src/components/ExportMenu.tsx`) com dropdown shadcn (PDF / CSV).

---

## 3. Adicionar `<ExportMenu />` em cada listagem

Em cada arquivo, montar `columns` + `rows` a partir do estado já carregado e respeitar a permissão `values.view` (ocultar colunas de valor para colaboradores restritos).

| Rota | Conteúdo exportado |
|------|--------------------|
| `routes/transports.index.tsx` | Código, cliente, veículo, origem→destino, status, motorista, parceiro, valor (se permitido) |
| `routes/documents.tsx` | Tipo, título, cliente, data, valor, status (aceito/pendente) |
| `routes/financial.tsx` (Recebíveis) | Cliente, descrição, valor, vencimento, status, transporte vinculado |
| `routes/financial.tsx` (Despesas) | Data, categoria, descrição, valor |
| `routes/financial.tsx` (Relatórios) | Reescrever botão atual usando o helper unificado e adicionar CSV |
| `routes/financial.clients.$name.tsx` | Histórico do cliente (recebíveis + transportes) |
| `routes/collections.tsx` | Recebíveis vencidos, dias de atraso, telefone, última nota |
| `routes/partners.tsx` | Nome, WhatsApp, cidade base, rotas, valor padrão, status |
| `routes/social.tsx` | Itens listados (posts/avaliações conforme conteúdo atual) |
| `routes/users.tsx` | Usuários, papel, último login |

Cada listagem ganha o filtro existente respeitado na exportação (exporta o que está visível).

---

## 4. Dependências

Sem novas dependências — `jspdf`, `jspdf-autotable` e `recharts` já estão no projeto (recharts vem com shadcn). Se `recharts` não estiver instalado, adicionar via `bun add recharts` no início.

---

## 5. Banco de dados

**Nenhuma migração necessária.** Todos os dados já existem (`transports.partner_quoted_amount`, `receivables`, `payables`, `documents.accepted_at`, etc.). Cálculo de margem é feito no cliente cruzando `transports` ↔ `receivables` (pelo `transport_id`) e `transports.partner_quoted_amount`.

---

## Arquivos afetados

**Novos:**
- `src/lib/exporters.ts`
- `src/components/ExportMenu.tsx`
- `src/components/dashboard/*` (KPIs, gráficos, tabela margem)

**Editados:**
- `src/routes/index.tsx` (dashboard completo)
- `src/routes/transports.index.tsx`
- `src/routes/documents.tsx`
- `src/routes/financial.tsx`
- `src/routes/financial.clients.$name.tsx`
- `src/routes/collections.tsx`
- `src/routes/partners.tsx`
- `src/routes/social.tsx`
- `src/routes/users.tsx`

Posso aplicar?