# Plano de Integração Financeira das Planilhas

O objetivo é integrar os dados financeiros das planilhas de viagem (receitas e despesas) na aba **Financeiro**, permitindo que o lucro e os gastos registrados nas planilhas sejam contabilizados no fluxo de caixa geral.

## 1. Banco de Dados
- Nenhuma alteração de esquema é estritamente necessária, pois já temos a tabela `trip_sheets` com os campos `rows` (que contém o `valor`) e `expenses`.

## 2. Lógica de Negócio e Agregação
- Atualizar a aba **Financeiro** (`src/routes/financial.tsx`) para incluir as planilhas na aba de **Relatórios**.
- Modificar o componente `ReportsTab` para buscar também os dados da tabela `trip_sheets` no intervalo de tempo selecionado (mês atual por padrão).

## 3. Interface do Usuário (UI)
- **Aba Financeiro > Relatórios**:
    - Somar o `Total Recebido` das planilhas ao `Receita do mês`.
    - Somar o `Total Despesas` das planilhas ao `Despesa do mês`.
    - O `Resultado` será atualizado automaticamente com esses novos totais.
- **Detalhamento**:
    - Adicionar uma seção ou menção nos relatórios indicando o quanto da receita/despesa provém das planilhas de viagem.

## 4. Exportação
- Atualizar a função `exportPDF` no `ReportsTab` para incluir os dados agregados das planilhas no PDF gerado.

## Arquivos a serem modificados
- `src/routes/financial.tsx`: Principal alteração na agregação de dados do `ReportsTab`.
