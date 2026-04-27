# Ajustes no formulário de Orçamento

Na aba Documentos > Orçamento (e também Contrato, para manter consistência), vamos:

1. **Remover** o campo **Seguro**.
2. **Adicionar** dois novos campos: **Coleta** (data) e **Entrega** (data) — datas previstas de retirada e entrega do veículo.
3. **Adicionar** um campo opcional **Endereço** nos dados do cliente.

Nada disso exige migration: tudo é salvo no JSON `body` da tabela `documents` (ou em `client_document` para texto livre — vamos usar `body.client_address` para evitar confusão com CPF/CNPJ).

## Mudanças por arquivo

### `src/routes/documents.tsx`
- Estado `form`: remover `insurance`; adicionar `client_address`, `pickup_date`, `delivery_date`.
- `total = service_value + extra` (sem seguro).
- `openEdit`: ler `body.client_address`, `body.pickup_date`, `body.delivery_date` ao popular o form; ignorar `insurance`.
- `save`: gravar os novos campos em `body`; não enviar mais `insurance`.
- UI:
  - Na seção "Dados do cliente", adicionar `Input` "Endereço (opcional)" abaixo do e-mail, ocupando `md:col-span-2`.
  - Remover o bloco `<Label>Seguro</Label> <Input ... />`.
  - Adicionar dois novos campos lado a lado: `Coleta` (`type="date"`) e `Entrega` (`type="date"`), perto de Origem/Destino.
- `exportPDF`: remover linha "Seguro"; adicionar "Endereço", "Coleta" e "Entrega" quando preenchidos.
- `pickTemplate` / `startBlank`: parar de setar `insurance`.

### `src/lib/document-templates.ts`
- Manter o campo `insurance` no tipo (compatibilidade com modelos customizados antigos no banco), mas zerar nos defaults dos modelos fixos para não aparecer em novos orçamentos.
- Remover menções a "Seguro com cobertura ampla incluso." nas notes do template **Orçamento Veículo Frágil** (manter só nas cláusulas de Contrato, que continuam relevantes).

### `src/components/DocumentView.tsx`
- Remover (ou condicionar a `false`) a linha que mostra "Seguro" no preview, já que orçamentos novos não terão mais esse valor.
- Adicionar exibição de "Endereço", "Coleta" e "Entrega" quando presentes em `body`.

### `src/components/CustomTemplateDialog.tsx`
- Remover o campo "Seguro sugerido" do diálogo de criação de modelo customizado (segue a mesma decisão do form principal). O insert continua enviando `insurance: 0` para satisfazer a coluna `not null` da tabela `document_templates`.

### `src/routes/d.$token.tsx`
- No PDF público, remover a linha "Seguro" e adicionar as linhas de Endereço, Coleta e Entrega quando presentes (mesmo padrão do `exportPDF` em documents.tsx).

## Observações
- Não há mudança de banco. A coluna `insurance` em `document_templates` permanece (com default `0`); apenas paramos de exibi-la no UI.
- Documentos antigos que tenham `body.insurance > 0` deixarão de mostrar essa linha no preview/PDF — se preferir manter para histórico, me avise que faço uma exibição condicional só para documentos antigos.
- Os campos de data (`Coleta`/`Entrega`) são opcionais; se vazios, não aparecem no PDF nem no preview.
