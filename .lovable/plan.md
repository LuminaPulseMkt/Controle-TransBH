## Auditoria de bugs (modo conservador)

Varri os arquivos principais (`routes/`, `components/`, `lib/`, `server/`) e o typecheck passa sem erros. Abaixo está o relatório detalhado de **bugs reais** encontrados, classificados por severidade. Nenhuma mudança altera comportamento esperado — apenas corrige defeitos. Sem refatoração estética.

---

### Severidade ALTA (causam dado/UI incorretos hoje)

**1. Dashboard — gráfico "Receita vs Despesas" trunca em 60 dias**
`src/routes/index.tsx:176` — `Math.min(60, ...)` corta a série em 60 pontos. No preset **90d** e em ranges customizados longos, os últimos dias somem do gráfico.
**Fix:** remover o teto de 60 (ou elevar para o tamanho do range; já são ~90 pontos no máximo).

**2. Financeiro — total do mês em despesas erra perto da virada do mês**
`src/routes/financial.tsx:325-329` — `new Date("YYYY-MM-DD")` é parseado em UTC; `getMonth()`/`getFullYear()` rodam em horário local. Em fusos atrás de UTC (Brasil = UTC-3), uma despesa do dia 1 pode ser contada no mês anterior e vice-versa.
**Fix:** comparar `expense_date` como string (`p.expense_date.startsWith("YYYY-MM")`) em vez de converter para `Date`.

**3. Detalhes do transporte — vazamento de Object URLs ao desmontar**
`src/routes/transports.$id.tsx:136-141` — o `useEffect` de cleanup tem deps `[]` e captura `previewUrls` vazio do primeiro render; nenhuma URL é revogada quando a página desmonta com fotos pendentes.
**Fix:** usar `useRef` para guardar o `Map` e revogar tudo no unmount, ou mover o revoke para o efeito que recalcula.

---

### Severidade MÉDIA (cache obsoleto / UX inconsistente)

**4. ExportMenu — cache global de empresa nunca expira**
`src/components/ExportMenu.tsx:27-37` — `cachedCompany` é módulo-level. Se o usuário trocar logo/nome em Configurações, os PDFs continuam usando o antigo até dar refresh.
**Fix:** invalidar o cache quando uma exportação ocorrer após N segundos (ex.: TTL de 60s) ou remover o cache (chamada é barata).

**5. Transports — `void load()` morto após navegação**
`src/routes/transports.index.tsx:411-419` — depois de `navigate(...)` há `return;` mas o `void load()` da linha 419 nunca executa nesse caminho. Sem bug visível, mas o fluxo de "edição" (não-novo) também cai no `load()` correto. Não é bug — apenas confirmar e deixar como está.
**Ação:** nenhuma (item descartado após análise).

**6. Receivables — reset parcial do form**
`src/routes/financial.tsx:139` e `:320` — após salvar, faz `setForm({ ...form, client_name: "", amount: "", description: "" })`, mantendo telefone/e-mail/transporte do registro anterior. Se o usuário criar dois recebíveis seguidos para clientes diferentes, dados do primeiro vazam.
**Fix:** resetar para o estado inicial completo.

---

### Severidade BAIXA (limpeza de tipos / smell)

**7. Cast duplo em status update**
`src/routes/transports.$id.tsx:166` — `status as Transport["status"] as any`. Substituir pelo tipo correto da union.

**8. `as any` evitáveis**
- `src/routes/financial.tsx:450` — `setCompany((comp as any) ?? null)` — `comp` já vem tipado pelo Supabase.
- `src/routes/transports.index.tsx:348-349` — `vehicle_type as any`, `status as any`. Tipar `emptyForm` com a union correta.

**9. Imports não usados após adicionar ExportMenu**
`src/routes/financial.tsx:23-25` — `jsPDF`, `autoTable`, `loadLogoDataUrl` ainda são usados pelo `ReportsTab` (PDF do aging). Mantém.
`src/routes/financial.tsx:20` — `Download` também é usado. Mantém. **Ação: nada.**

**10. `var location_note` extraído mas não destacado**
`src/routes/transports.index.tsx:337` — `const { location_note, ...formForDb } = form;` gera warning eslint de variável não usada (é usada na linha 388, então OK). Pode adicionar comentário `// eslint-disable-next-line` localizado se warning incomodar — opcional.

---

### Itens propositalmente fora de escopo
- `routeTree.gen.ts` (gerado).
- Logs `console.error` no servidor (`accept-budget`, `whatsapp.server`) — úteis para debugging em produção, não são "esquecidos".
- `as any` em `src/server/accept-budget.functions.ts:113` (`budget.body`) — requer tipagem de JSON dinâmico, fora do escopo conservador.
- Não vou quebrar arquivos grandes (transports.index 970 linhas) — você pediu mínimo risco.

---

### Plano de aplicação (em ordem)

1. **HIGH-1** `src/routes/index.tsx`: remover `Math.min(60, ...)` em `dailySeries`.
2. **HIGH-2** `src/routes/financial.tsx`: trocar comparação de mês em `PayablesTab.monthTotal` para `startsWith`.
3. **HIGH-3** `src/routes/transports.$id.tsx`: usar `useRef` para `previewUrls` e revogar no unmount.
4. **MED-4** `src/components/ExportMenu.tsx`: TTL de 60s no cache (`cachedAt + 60000 < now ⇒ recarregar`).
5. **MED-6** `src/routes/financial.tsx`: criar `initialForm` constante e resetar com ela em ambos os tabs.
6. **LOW-7/8** remover `as any` redundantes nos 4 pontos listados.

Tudo é mudança local, sem novas dependências, sem mudança de assinatura pública. Após aplicar, vou rodar typecheck e te entregar a lista de antes/depois por arquivo.
