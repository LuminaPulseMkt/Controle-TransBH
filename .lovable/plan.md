## Objetivo

1. Quando o cliente aceita o orçamento, gerar um **contrato com cláusulas próprias** (pagamento, seguro de carga, prazo, responsabilidades, vistoria, foro) — diferentes do texto de "observações" do orçamento.
2. Tornar essas cláusulas **editáveis** em Configurações.
3. Corrigir o **valor multiplicado** mostrado em "Contratos & Orçamentos" (total agrupado por cliente soma orçamento + contrato gerado).

---

## 1. Cláusulas padrão de contrato (editáveis)

**Onde guardar**: reutilizar a tabela `message_templates` (já existe, já tem UI de edição). Adicionar uma chave nova:

- `contract_clauses_default` — cláusulas padrão usadas quando o orçamento é aceito.

**Conteúdo padrão** (texto fixo que o usuário poderá editar depois):

```
1. OBJETO
A CONTRATADA compromete-se a transportar o veículo descrito neste contrato
da origem até o destino indicados, com zelo e segurança.

2. PAGAMENTO
2.1. Valor total: {amount}.
2.2. Forma de pagamento: 50% na coleta e 50% na entrega, salvo acordo
     diferente registrado por escrito.
2.3. O atraso no pagamento implica multa de 2% e juros de 1% ao mês.

3. SEGURO E RESPONSABILIDADE PELA CARGA
3.1. O veículo viaja coberto por seguro de transporte contra colisão,
     tombamento, incêndio e roubo durante todo o trajeto.
3.2. Em caso de sinistro, a CONTRATADA acionará o seguro e manterá o
     CONTRATANTE informado em até 24h.
3.3. Não estão cobertos: itens pessoais deixados no veículo, danos
     pré-existentes não registrados na vistoria e avarias mecânicas
     internas não decorrentes do transporte.

4. PRAZO DE ENTREGA
4.1. Prazo estimado: até {due_date}.
4.2. Atrasos por caso fortuito, força maior, condições climáticas
     extremas ou bloqueios de via não geram multa.
4.3. Atraso superior a 5 dias úteis por culpa exclusiva da CONTRATADA
     gera desconto de 5% sobre o frete.

5. VISTORIA
5.1. Vistoria fotográfica detalhada será feita na coleta e na entrega.
5.2. Eventuais avarias devem ser apontadas no ato da entrega; após a
     assinatura do termo, presume-se que o veículo foi entregue íntegro.

6. OBRIGAÇÕES DO CONTRATANTE
6.1. Apresentar documentação do veículo em dia.
6.2. Garantir que o veículo esteja com combustível suficiente para manobra
     (mínimo 1/4 do tanque) e em condições de rodar curtas distâncias.

7. RESCISÃO
Em caso de cancelamento pelo CONTRATANTE após a coleta, será cobrada
taxa proporcional ao trajeto já percorrido.

8. FORO
Fica eleito o foro da comarca da sede da CONTRATADA para dirimir
quaisquer questões deste contrato.
```

Variáveis suportadas: `{amount}`, `{due_date}`, `{client_name}`, `{company_name}`, `{title}`.

**Migração SQL**:
```sql
INSERT INTO public.message_templates (key, label, body) VALUES
('contract_clauses_default', 'Contrato — Cláusulas padrão', '<texto acima>')
ON CONFLICT (key) DO NOTHING;
```

**UI de edição**: adicionar uma terceira seção em Configurações → Modelos de Mensagem chamada **"Contrato"**, mostrando essa cláusula com textarea grande (mín. 14 linhas) e a lista de variáveis suportadas.

---

## 2. Geração do contrato com cláusulas próprias

Em `src/server/accept-budget.functions.ts` (estágio `create_contract`):

- Buscar o template `contract_clauses_default`.
- Renderizar variáveis (`amount`, `due_date`, `client_name`, `company_name`, `title`).
- Gravar o resultado no `body.notes` do contrato (substituindo o `body` herdado do orçamento — clonar `body` mas trocar `notes`).
- Manter título, valores e dados do cliente vindos do orçamento.

Resultado: o contrato gerado mostrará **cláusulas profissionais** em vez de copiar as "observações" do orçamento. O `DocumentView` já renderiza `body.notes` sob o título "Cláusulas" quando `doc_type === "contract"`.

---

## 3. Correção do total duplicado em "Contratos & Orçamentos"

**Causa**: em `src/routes/documents.tsx` (linhas 182-195), `groupedByClient` soma `total_amount` de **todos** os documentos do cliente. Como cada orçamento aceito gera um contrato com o mesmo `total_amount`, o cliente aparece com 2 documentos somando 2× o valor.

**Correção**: ao calcular o total agrupado, **ignorar contratos que foram gerados a partir de um orçamento aceito** (eles representam o mesmo dinheiro do orçamento). Critério: somar apenas:
- todos os orçamentos, e
- contratos cujo `id` **não** seja referenciado por nenhum `accepted_contract_id` de outro documento.

Implementação: construir um `Set<string>` com todos os `accepted_contract_id` não nulos, e no `reduce` pular contratos cujo id esteja nesse set.

```ts
const linkedContractIds = new Set(
  filtered.map(d => d.accepted_contract_id).filter(Boolean) as string[]
);
// dentro do loop:
const countsForTotal = !(d.doc_type === "contract" && linkedContractIds.has(d.id));
if (countsForTotal) existing.total += Number(d.total_amount ?? 0);
```

Os documentos continuam aparecendo na lista expandida (orçamento + contrato), apenas o total deixa de duplicar.

---

## Arquivos a editar

- `supabase/migrations/<novo>.sql` — seed do template `contract_clauses_default`.
- `src/server/accept-budget.functions.ts` — buscar template e injetar no `body.notes` do contrato.
- `src/routes/settings.tsx` — adicionar seção "Contrato" na aba de Modelos de Mensagem.
- `src/routes/documents.tsx` — corrigir cálculo de total agrupado por cliente.

## Fora de escopo

- Editor rich-text (textarea simples).
- Versionamento histórico das cláusulas (contratos já assinados mantêm o texto que tinham, pois ele é gravado em `body.notes`).
