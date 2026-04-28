# Coleta e Entrega como valores (R$)

Trocar os campos **Coleta** e **Entrega** do formulário de Orçamento/Contrato — hoje são datas (`pickup_date`, `delivery_date`) — para **valores monetários** (`pickup_value`, `delivery_value`), que entram na composição do total.

## Comportamento

- Dois novos inputs numéricos (R$) na seção de detalhes do serviço, ao lado de Origem/Destino.
- Total passa a ser: `frete + adicionais + coleta + entrega`.
- Valores opcionais: se zerados/vazios, não aparecem no preview nem no PDF.
- Campos antigos (`pickup_date`/`delivery_date`) deixam de ser usados — documentos antigos simplesmente não exibirão mais essas linhas (datas).

## Arquivos a alterar

### `src/routes/documents.tsx`
- Estado `form`: substituir `pickup_date`/`delivery_date` por `pickup_value`/`delivery_value` (string, igual a `service_value`).
- `openEdit`: ler `body.pickup_value` / `body.delivery_value`.
- `save`: gravar os novos campos numéricos em `body` (Number ou 0).
- `total` (useMemo): incluir `pickup_value` e `delivery_value` na soma.
- Inputs: mudar de `type="date"` para `type="number" step="0.01"` com labels "Coleta (R$)" e "Entrega (R$)".
- `exportPDF`: remover linhas de data; adicionar linhas "Coleta: R$ X" e "Entrega: R$ X" na seção de **Valores** quando > 0.

### `src/components/DocumentView.tsx`
- Remover `pickup_date`/`delivery_date` da seção "Detalhes do Serviço".
- Na seção "Valores", após "Adicionais", exibir "Coleta" e "Entrega" quando `body.pickup_value > 0` / `body.delivery_value > 0` usando `brl(...)`.

### `src/routes/d.$token.tsx`
- Mesma troca do `exportPDF`: remover linhas de data, somar Coleta/Entrega no PDF público dentro do bloco de valores.

## Total — exemplo

```ts
const total = useMemo(() => {
  return (Number(form.service_value) || 0)
       + (Number(form.extra) || 0)
       + (Number(form.pickup_value) || 0)
       + (Number(form.delivery_value) || 0);
}, [form]);
```

Sem migration: tudo continua dentro do JSON `body` da tabela `documents`.
