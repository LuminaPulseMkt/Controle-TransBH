## Alterar Tipos de Veículo na Aba Transporte

### Objetivo
Substituir os tipos de veículo disponíveis na aplicação. Remover **Caminhão**, **Maquinário** e **Carro**; adicionar **Sedan**, **Hatch**, **Caminhonete** e **SUV**. Manter **Moto**.

### Etapas

#### 1. Migração de banco de dados
- Recriar o enum `vehicle_type` no Supabase com os novos valores: `motorcycle`, `sedan`, `hatch`, `caminhonete`, `suv`.
- Atualizar a coluna `vehicle_type` nas tabelas afetadas (provavelmente `transports`) para usar o novo enum.
- Como há necessidade de remover valores, o enum será renomeado, recriado e as colunas serão migradas.

#### 2. Frontend — Labels e formulários
- Atualizar `src/lib/format.ts`: redefinir `vehicleTypeLabel` com os novos tipos e rótulos em português.
- Atualizar `src/routes/transports.index.tsx`:
  - Alterar o `SelectItem` do campo "Tipo" para listar: Moto, Sedan, Hatch, Caminhonete, SUV.
  - Ajustar o valor default do formulário de `"car"` para `"sedan"`.
- Atualizar `src/server/accept-budget.functions.ts`: alterar o `vehicle_type` default de `"car"` para `"sedan"`.

#### 3. Tipos TypeScript
- Após a migração, regenerar ou ajustar manualmente `src/integrations/supabase/types.ts` para refletir o novo enum, garantindo que o TypeScript não quebre.

### Notas
- `src/routes/transports.$id.tsx` exibe o label via `vehicleTypeLabel`, portanto atualizar o mapa de labels é suficiente.
- Veículos já cadastrados com os tipos removidos (car, truck, machinery) ficarão com valores legados no banco até serem atualizados manualmente; a aplicação os exibirá como a string bruta caso o label não exista.
