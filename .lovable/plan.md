## Objetivo
Criar uma nova aba **Checklists** no sistema, reproduzindo o modelo de "Check List de Transporte" enviado (UNIPORT LOG). O usuário poderá criar, editar, salvar, listar e exportar em PDF. Também ficará disponível um atalho na página de detalhes de cada transporte.

## Estrutura do checklist (do PDF)
- **Cabeçalho**: Cliente, Placa, Modelo, DUT, Cor, KM, Local, Data, Hora.
- **Itens do veículo (OK / Não OK)**: Documento Original, Chave Original, Chave Reserva, Controle do Alarme, Manual Uso/Manutenção, Extintor, Triângulo, Chave de Roda, Macaco, Rádio, CD Player, Bateria.
- **Pneus** (Dianteiro Dir/Esq, Traseiro Dir/Esq, Estepe): Medida, Marca, condição (Bom/Médio/Ruim/Furado).
- **Combustível**: 0, 1/4, 1/2, 3/4, Cheio.
- **Observações**.
- **Coleta** e **Entrega**: nome do motorista, RG, cidade, estado, declaração de acordo, **assinatura digital**, nome do responsável, RG, **assinatura do responsável**, data e hora.

## Banco de dados (Supabase)
Nova tabela `vehicle_checklists`:
- `transport_id` (uuid, nullable) — link opcional ao transporte.
- `client_name`, `plate`, `model`, `dut`, `color`, `km`, `location` (text).
- `checklist_date` (date), `checklist_time` (text).
- `items` (jsonb) — estado OK/Não OK de cada item.
- `tires` (jsonb) — array com 5 pneus (posição, medida, marca, condição).
- `fuel_level` (text) — `0|1/4|1/2|3/4|cheio`.
- `observations` (text).
- `pickup` (jsonb) — { driver_name, driver_rg, city, state, agreed, signature_url, responsible_name, responsible_rg, responsible_signature_url, date, time }.
- `delivery` (jsonb) — mesma forma de `pickup`.
- `created_by`, `created_at`, `updated_at`.

RLS: autenticados podem ver/criar/editar; admins podem deletar (mesmo padrão de `transports`).

Storage: usar bucket existente `transport-photos` para salvar imagens de assinatura (PNG, pasta `checklists/{id}/`).

## Rotas e UI
- `src/routes/checklists.tsx` — listagem com busca, criar novo, abrir editor.
- `src/routes/checklists.$id.tsx` — editor/visualização do checklist (formulário completo).
- Sidebar: novo item "Checklists" (ícone `ClipboardCheck`) com permissão `transports.view`.
- Página de detalhes do transporte (`src/routes/transports.$id.tsx`): seção "Checklists" com botão "Novo checklist" (pré-preenche placa, modelo, cor, cliente) e lista de checklists vinculados.

## Componentes
- `src/components/checklist/ChecklistForm.tsx` — formulário completo (cabeçalho, grid de itens OK/Não OK, tabela de pneus, combustível, observações, abas Coleta/Entrega).
- `src/components/checklist/SignaturePad.tsx` — canvas para desenhar assinatura (mouse + touch), botão "Limpar", upload para storage e retorno da URL.
- `src/components/checklist/ChecklistView.tsx` — renderização read-only usada na exportação PDF e visualização.

## Exportação PDF
- `src/lib/checklist-pdf.ts` — gera PDF A4 usando `jspdf` + `jspdf-autotable` (já no projeto, conforme padrão de `exporters.ts`), com logo da empresa e layout fiel ao modelo (cabeçalho, grid de itens com caixas marcadas, tabela de pneus, combustível, observações, blocos de coleta/entrega com assinaturas embutidas como imagem).
- Botão "Baixar PDF" no editor e na listagem.

## Critérios de aceitação
- Novo item "Checklists" na barra lateral abre a listagem.
- É possível criar um checklist em branco ou a partir de um transporte (placa/modelo pré-preenchidos).
- Todos os campos do PDF original estão presentes e editáveis.
- Assinaturas podem ser desenhadas com mouse/touch, limpas e salvas.
- O checklist é salvo no Supabase e pode ser reaberto/editado.
- "Baixar PDF" gera um arquivo com layout semelhante ao modelo enviado, com assinaturas embutidas.
- Atalho funcional na página de detalhes do transporte.
