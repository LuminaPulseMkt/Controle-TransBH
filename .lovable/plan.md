## Objetivo
1. Adicionar campo **"Valor do veículo"** (valor de mercado / referência) por veículo no contrato, exibido na pré-visualização e no PDF, **sem somar no total**.
2. Adicionar **rodapé** com **e-mail, CNPJ, site, telefone, endereço** tanto em orçamentos quanto em contratos (na pré-visualização interna e na página pública).

## Mudanças

### 1. Banco — nova coluna `website` em `company_settings`
Migration adicionando `website text` (nullable). Sem default.

### 2. `src/routes/settings.tsx`
Adicionar input **"Site"** (`data.website`) na seção de dados da empresa, ao lado dos demais campos. Persistir no upsert.

### 3. `src/routes/documents.tsx` (formulário e payload)
- Em `VehicleForm`, adicionar campo opcional `market_value: string` (apenas para contratos).
- `emptyVehicle()` inclui `market_value: ""`.
- `bodyToVehicles()` lê `v.market_value`.
- No formulário, mostrar input **"Valor do veículo (R$)"** abaixo do "Valor (R$)" **somente quando `docType === "contract"`**, com hint "não soma ao total".
- No `save()` e no `previewDraft`, incluir `market_value: Number(v.market_value) || null` em `vehiclesPayload`.
- **Não alterar** `vehiclesTotal` nem `total` — o novo campo é puramente informativo.

### 4. `src/components/DocumentView.tsx`
- Para cada veículo, se `v.market_value > 0`, renderizar uma linha extra "Valor do veículo: R$ X" no card do veículo (abaixo de placa/cor/marca/modelo).
- Esse valor **não** entra na seção "Valores" nem no total.
- **Rodapé sempre visível** (remover gate `showFooter && company`): sempre que existir `company`, renderizar bloco com:
  - Nome da empresa (negrito)
  - CNPJ
  - Endereço
  - Telefone · WhatsApp · E-mail
  - Site (novo)
- Manter o estilo atual (texto pequeno, separador superior). Aplica-se a orçamento **e** contrato.
- Remover a prop `showFooter` (ou mantê-la sem efeito) e atualizar chamadas em `DocumentPreviewDialog` e `d.$token.tsx` se necessário.

### 5. `src/routes/d.$token.tsx`
- Buscar também `website` no `select` de `company_settings`.
- Ajustar tipo `CompanyInfo` para incluir `website`.

### 6. PDF (`src/routes/documents.tsx` + `src/routes/d.$token.tsx`)
- Adicionar bloco de rodapé no final da última página do PDF (jsPDF) com os mesmos campos: nome, CNPJ, endereço, telefone, e-mail, site. Linha fina separadora acima, fonte 8pt cinza.
- No PDF do contrato, ao listar veículos, se houver `market_value`, escrever "Valor do veículo: R$ X" abaixo dos demais dados.

## Fora de escopo
- Renomear/limpar o input "Adicionais" duplicado (linhas 928–931 do `documents.tsx`) — bug pré-existente, posso corrigir depois se quiser.
- Página pública de aceite — só o rodapé do `DocumentView` é alterado; nada de mudar fluxo de aceite.
