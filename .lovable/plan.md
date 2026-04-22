

## Aceite público de orçamento → contrato + transporte + cobrança

Adicionar um botão **"Aceitar orçamento"** na página pública `/d/{token}`. Ao aceitar, o sistema cria automaticamente, em uma única operação:

1. Um **contrato** com os mesmos dados do orçamento.
2. Um registro em **Transportes** com o cliente e veículo.
3. Um lançamento em **Cobranças (Recebíveis)** com o valor total.

### Como o cliente vê

- Na página pública do orçamento, abaixo do total, aparece um cartão de aceite com:
  - Checkbox "Li e concordo com as condições do orçamento"
  - Campo opcional "Data prevista de entrega"
  - Botão **"Aceitar orçamento e gerar contrato"**
- Após confirmar, a tela mostra um estado de sucesso com:
  - Aviso "Orçamento aceito" + data/hora
  - Link direto para o **contrato gerado** (também página pública `/d/{novo_token}`)
  - Botão "Baixar contrato em PDF"
- Se o orçamento já foi aceito antes, o botão é substituído pelo aviso e link para o contrato existente (idempotência).
- Contratos não exibem o botão de aceite.

### Como o admin vê

- Na lista de Documentos, orçamentos aceitos ganham um selo **"Aceito"** com a data.
- O contrato gerado aparece automaticamente na aba "Contratos", agrupado pelo mesmo cliente.
- O transporte aparece em /transports com status `pending`.
- O recebível aparece em /financial com vencimento padrão de **7 dias** após o aceite, status `pending`.

### Estrutura técnica

**1. Migração de banco**

Adicionar à tabela `documents`:
- `accepted_at timestamptz` — quando o cliente aceitou
- `accepted_ip text` — IP do aceite (auditoria)
- `accepted_contract_id uuid` — referência ao contrato gerado a partir do orçamento
- `accepted_transport_id uuid` — referência ao transporte criado
- `accepted_receivable_id uuid` — referência ao recebível criado

Política RLS extra (anon): permitir `UPDATE` apenas dos campos `accepted_*` quando `public_token` é fornecido e `accepted_at` ainda é nulo. Como não dá para restringir colunas via RLS, o aceite será feito via **server function com `supabaseAdmin`** (bypass RLS) e validação por token — RLS continua bloqueando UPDATE direto pelo anon.

**2. Server function `acceptBudget`** (`src/server/accept-budget.ts`)

```ts
createServerFn({ method: "POST" })
  .inputValidator(z.object({
    token: z.string().uuid(),
    estimated_delivery: z.string().date().optional(),
    accepted: z.literal(true),
  }))
  .handler(async ({ data }) => {
    // 1. Buscar documento por public_token usando supabaseAdmin
    // 2. Validar: doc_type === 'budget' && accepted_at === null
    // 3. Se já aceito → retornar contrato/links existentes (idempotente)
    // 4. Inserir contract (mesmos campos, doc_type='contract', body copiado)
    // 5. Inserir transport (cliente + parse origin/destination "Cidade/UF")
    // 6. Inserir receivable (amount=total, due_date=now+7d)
    // 7. UPDATE budget SET accepted_at=now(), accepted_*_id=...
    // 8. Retornar { contract_token, message }
  })
```

Parsing de origem/destino: o orçamento guarda strings livres em `body.origin` / `body.destination`. O parser tenta extrair `"Cidade/UF"` ou `"Cidade - UF"`; se não conseguir, usa a string toda como `*_city` e `"--"` como `*_state` (campos obrigatórios na tabela). O veículo (`body.vehicle`) vai como `vehicle_plate` placeholder `"A DEFINIR"` se vazio, com a string original em `notes`.

**3. UI da página pública** (`src/routes/d.$token.tsx`)

- Adicionar componente `<AcceptBudgetCard />` exibido só quando `doc_type === 'budget'`.
- Estados: `idle` → `confirming` (modal de confirmação) → `submitting` → `success` / `error`.
- Após sucesso, refetch do documento + exibe link `/d/{contract_token}`.
- Se `doc.accepted_at` já vier preenchido no fetch, exibe direto o estado de sucesso com link salvo.

**4. Lista de documentos** (`src/routes/documents.tsx`)

- Em `DocRow`, se `d.accepted_at`, mostrar badge verde **"Aceito em {data}"**.
- Adicionar campo `accepted_at`, `accepted_contract_id` na interface `Document` e no SELECT.

**5. WhatsApp**

Sem mudanças no payload — o link já vai. O cliente abre, aceita, e o contrato é criado.

### Diagrama do fluxo

```text
Cliente abre /d/{token-orcamento}
        │
        ├─► Clica "Aceitar orçamento"
        │       │
        │       └─► server fn acceptBudget(token)
        │              │
        │              ├─► INSERT documents (contract)  ──► token-contrato
        │              ├─► INSERT transports             ──► aparece em /transports
        │              ├─► INSERT receivables (+7 dias)  ──► aparece em /financial
        │              └─► UPDATE documents SET accepted_at, accepted_*_id
        │
        └─► Redireciona para /d/{token-contrato}
```

### Arquivos a criar/editar

- **Migração SQL**: campos `accepted_*` em `documents`
- **Criar**: `src/server/accept-budget.ts` (server function com `supabaseAdmin`)
- **Criar**: `src/components/AcceptBudgetCard.tsx`
- **Editar**: `src/routes/d.$token.tsx` (renderiza card de aceite + estado pós-aceite)
- **Editar**: `src/routes/documents.tsx` (badge "Aceito" + select dos novos campos)
- **Editar**: `src/integrations/supabase/types.ts` (regenerado)

### Pontos de decisão

- **Vencimento padrão da cobrança**: 7 dias após o aceite (sem campo customizável no aceite, para manter simples — admin pode ajustar depois em Financeiro).
- **Idempotência**: clicar "Aceitar" duas vezes nunca duplica — segunda chamada retorna o contrato já criado.
- **Sem assinatura digital nesta etapa**: aceite é registrado por checkbox + IP + timestamp (juridicamente válido como aceite eletrônico simples). Assinatura formal pode ser uma evolução futura.

