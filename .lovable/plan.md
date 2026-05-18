## Contratos com múltiplos veículos + geração de transporte e cobrança

### Resumo
Permitir que um contrato (e o orçamento que o originou) tenha vários veículos, com valor por veículo. Após criar o contrato, um botão **"Gerar transporte e cobrança"** cria 1 registro em **Transporte** por veículo e **1 cobrança única** em Financeiro com o valor total.

---

### 1) Banco — `supabase/migrations/...`

Adicionar à tabela `documents`:
- `generated_at timestamptz` — marca quando os ativos foram gerados.
- `generated_receivable_id uuid` — cobrança vinculada.
- `generated_transport_ids uuid[] default '{}'` — transportes vinculados.

Sem alteração de enum nem RLS. Os campos `accepted_*` continuam só para o fluxo de aceite do orçamento; este novo conjunto serve para qualquer contrato (criado manualmente ou via aceite).

### 2) Estrutura do `body` do documento

Novo campo `vehicles: Vehicle[]` em `body`, onde:
```
Vehicle = {
  description: string  // ex: "Honda Civic 2020"
  plate: string
  color?: string
  type: 'motorcycle' | 'sedan' | 'hatch' | 'caminhonete' | 'suv'
  brand?: string
  model?: string
  year?: number
  value: number        // R$ por veículo
}
```
Compat: ao ler um documento legado com `vehicle/vehicle_plate/vehicle_color`, converter para um único item em `vehicles[]` no `openEdit`. Manter os campos legados gravados apenas se `vehicles[]` tiver exatamente 1 item (para não quebrar PDFs antigos).

### 3) Frontend — `src/routes/documents.tsx`

- Substituir os 3 campos de veículo por uma lista editável "Veículos do contrato" com:
  - Botão **+ Adicionar veículo** (mín. 1).
  - Por item: Descrição, Placa, Tipo (Select com Moto/Sedan/Hatch/Caminhonete/SUV), Cor, Valor (R$), botão remover.
- **Total** passa a ser: `sum(vehicles.value) + extra + pickup_value + delivery_value`. Remover o campo "Frete" único (`service_value`) do form ou deixá-lo como "Adicional geral" — manter por simplicidade renomeando para "Outros adicionais".
- Atualizar `openEdit`, `pickTemplate`, `startBlank` e `save` para o novo shape.
- PDF (`exportPDF`) e `DocumentView`: listar veículos em tabela (Descrição · Placa · Tipo · Cor · Valor).

### 4) Nova server function — `src/server/generate-contract-assets.functions.ts`

`generateContractAssets({ contract_id, estimated_delivery? })`:
- Carrega o documento (`doc_type='contract'`).
- Se `generated_at` já preenchido → retorna idempotente com os IDs existentes.
- Para cada `vehicle` em `body.vehicles[]` (fallback: 1 veículo legado), insere em `transports` (origem/destino do body, `vehicle_plate`, `vehicle_type`, `vehicle_brand`, `vehicle_model`, `vehicle_year`, `vehicle_color`, `notes`).
- Insere **1 receivable** com `amount = total_amount`, `due_date = hoje+7`, `transport_id = primeiro transport`, descrição `"Contrato {title}"`.
- Atualiza `documents.generated_at/generated_receivable_id/generated_transport_ids`.
- Best-effort: envia WhatsApp ao cliente (reaproveitando template existente).

### 5) Botão "Gerar transporte e cobrança"

- Em `src/routes/documents.tsx`, na linha de cada contrato (e no `DocumentPreviewDialog`):
  - Se `generated_at == null` → botão primário **"Gerar transporte e cobrança"** que chama a server fn e dá `toast` com link para `/transports` e `/financial`.
  - Se já gerado → badge "Transporte/cobrança gerados" + link.
- Esconder o botão para `doc_type='budget'`.

### 6) Atualizar `acceptBudget` (compat)

Em `src/server/accept-budget.functions.ts`, ao aceitar um orçamento com `body.vehicles[]`, criar 1 transporte por veículo (loop), mantendo 1 receivable única com o total. Preencher também `generated_*` no contrato recém-criado para que o botão fique desativado.

### Notas
- Veículos antigos exibidos como `sedan` por causa da migração anterior podem ser ajustados manualmente em Transportes.
- Não há mudança de RLS — todas as operações em `transports`/`receivables` já são permitidas via `supabaseAdmin` na server fn.
