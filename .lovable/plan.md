## Ajustes na aba Transporte e fluxo pós-aceite

Três mudanças, todas em arquivos já existentes — sem migrações nem novas tabelas.

---

### 1. Reordenar formulário "Novo/Editar Transporte" — veículo primeiro

Hoje, no diálogo de `Novo Transporte` em `/transports`, o primeiro campo é a Placa, mas o nome do veículo (Marca/Modelo) só aparece depois. Você relatou que ao abrir Detalhes o "nome do veículo" não aparece corretamente.

Olhando `transports.$id.tsx`, o cabeçalho de Detalhes mostra:
- Linha grande: **placa** (`vehicle_plate`)
- Subtítulo: `marca + modelo + ano` (só aparece se foram preenchidos)

Ou seja, se a pessoa criar o transporte sem preencher Marca/Modelo, o nome some. A correção é deixar o bloco de identificação do veículo em primeiro lugar e visualmente em destaque, para que sempre seja preenchido.

**Reorganização do diálogo (`src/routes/transports.index.tsx`):**

Nova ordem dos campos:
1. **Identificação do veículo** (em destaque, no topo): Marca, Modelo, Placa, Tipo, Ano, Cor — nessa sequência
2. **Cliente**: Nome*, CPF/CNPJ, Telefone
3. **Rota**: Cidade origem*, UF*, Cidade destino*, UF*
4. **Logística**: Entrega estimada, Status, Motorista
5. **Observações**
6. **Fotos do veículo** (PhotoManager já existente)

Marca e Modelo não vão ficar marcados como obrigatórios no banco (não posso mudar `NOT NULL` sem migração e quebraria dados antigos), mas serão validados no `save()` com toast: "Informe ao menos a marca ou modelo do veículo".

---

### 2. Upload de múltiplos arquivos por vez

Já está implementado tanto no diálogo de criar/editar (PhotoManager com `<input multiple>`) quanto na página de Detalhes (`pendingFiles[]` + `Promise.allSettled`). Vou apenas:
- Confirmar visualmente que o input do diálogo aceita seleção múltipla (já aceita — `multiple` está na linha 634).
- Garantir que o texto do botão deixe isso explícito: "Adicionar fotos (várias permitidas)".

Nada de lógica nova aqui — só reforço de UX.

---

### 3. Após aceitar orçamento / criar transporte → ir para cobranças do cliente

Hoje:
- Admin cria transporte manualmente em `/transports` → fica na lista de transportes.
- Cliente aceita orçamento em `/d/{token}` → vê card "Ver contrato gerado" (link para o contrato).

Você quer que **ambos** os fluxos terminem mostrando as cobranças do cliente, com cliente, veículo e valor faltante.

#### 3a. Nova rota `src/routes/financial.client.$name.tsx` (admin)

Página filtrada que mostra:
- Cabeçalho: nome do cliente
- Cartão resumo: total cobrado, total pago, **valor faltante** (`pending + overdue`)
- Tabela enxuta com colunas: Veículo (placa + marca/modelo do `transport_id` vinculado), Descrição, Vencimento, Valor, Status, Ação "Marcar pago"

Carrega:
```ts
supabase.from("receivables")
  .select("*, transports(vehicle_plate, vehicle_brand, vehicle_model)")
  .eq("client_name", name)
  .order("due_date");
```

A rota usa `AuthGate adminOnly` (mesmo padrão de `/financial`).

#### 3b. Redirecionar admin após salvar Novo Transporte

No `save()` de `transports.index.tsx`, ao final do fluxo de **criação** (não de edição), em vez de só fechar o diálogo e recarregar a lista:

```ts
toast.success("Transporte criado.");
setOpen(false);
navigate({ to: "/financial/client/$name", params: { name: form.client_name } });
```

Para edição, mantém comportamento atual (fecha e recarrega).

#### 3c. Cliente após aceitar orçamento público

Em `src/components/AcceptBudgetCard.tsx`, depois do aceite bem-sucedido, em vez (ou além) do link "Ver contrato gerado", mostrar um card:

```
Cobrança gerada
Cliente: João Silva
Veículo: Honda Civic — ABC1D23
Valor a pagar: R$ 4.500,00
Vencimento: 01/05/2026
[Ver detalhes do contrato]
```

A `acceptBudget` server-fn já cria o `receivable` e retorna `contract_token`. Vou estender o retorno para incluir também `receivable: { amount, due_date }` e `vehicle: { plate, brand, model }` (lidos do transporte recém-criado), e o card renderiza essas informações sem precisar de nova chamada.

Cliente público **não** vai para `/financial/client/...` (rota admin protegida) — vê o resumo direto no próprio card.

---

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/routes/transports.index.tsx` | Reordenar campos do diálogo, validar marca/modelo, navegar para `/financial/client/$name` ao criar |
| `src/routes/financial.client.$name.tsx` | **Novo** — lista de receivables filtrada por cliente com veículo e valor faltante |
| `src/components/AcceptBudgetCard.tsx` | Mostrar card de cobrança (cliente, veículo, valor) após aceite |
| `src/server/accept-budget.functions.ts` | Retornar `receivable` + `vehicle` no payload do aceite |

Sem migrações no banco. Sem novos buckets. Sem novas dependências.

### Como testar

1. Abrir `/transports` → "Novo Transporte" → confirmar que o primeiro bloco do formulário é o veículo (Marca, Modelo, Placa…).
2. Tentar salvar sem marca nem modelo → toast de erro.
3. Salvar com tudo preenchido → vai direto para `/financial/client/{nome}` mostrando a tabela de cobranças desse cliente.
4. Em Detalhes do transporte, confirmar que marca/modelo aparecem no cabeçalho.
5. No diálogo, selecionar 3 fotos de uma vez → todas aparecem em miniatura e são salvas juntas ao clicar Salvar.
6. Em uma página `/d/{token}` de orçamento, aceitar → ver card "Cobrança gerada" com cliente, veículo e valor.
