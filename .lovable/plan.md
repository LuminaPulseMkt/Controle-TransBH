

## Adicionar campos Placa e Cor no formulário de Contratos/Orçamentos

### O que muda

Hoje o formulário tem apenas um campo livre **Veículo** (ex.: "Honda Civic 2020 — ABC1D23"). Vou separar **Placa** e **Cor** em campos dedicados, mantendo o campo Veículo (descrição/modelo) — assim a placa fica padronizada e a cor fica visível tanto no documento quanto no PDF.

### Mudanças em `src/routes/documents.tsx`

1. **Estado do formulário** (`form`, ~linha 76): adicionar dois campos:
   - `vehicle_plate: ""`
   - `vehicle_color: ""`

2. **`openEdit()`** (~linha 155): popular os novos campos a partir de `d.body.vehicle_plate` e `d.body.vehicle_color`.

3. **`save()`** (~linha 206): incluir `vehicle_plate` (uppercase) e `vehicle_color` no objeto `body` salvo no JSONB.

4. **Layout do formulário** (~linhas 547–550): substituir o bloco atual por uma grade com 3 inputs:
   - **Veículo** (md:col-span-2) — descrição/modelo, placeholder "Honda Civic 2020"
   - **Placa** — `uppercase font-mono`, `maxLength={8}`, placeholder "ABC1D23"
   - **Cor** — placeholder "Prata"

5. **`exportPDF()`** (~linhas 270): após `Veículo:`, imprimir também `Placa:` e `Cor:` se preenchidos.

### Mudanças em `src/components/DocumentView.tsx`

Na seção "Detalhes do Serviço" (~linhas 77–83), incluir os novos campos quando preenchidos:
- `{body.vehicle_plate && <Field label="Placa" value={body.vehicle_plate} />}`
- `{body.vehicle_color && <Field label="Cor" value={body.vehicle_color} />}`

E adicionar `body.vehicle_plate || body.vehicle_color` à condição que decide se a seção é renderizada.

### Compatibilidade

- Documentos antigos sem `vehicle_plate`/`vehicle_color` continuam funcionando — os campos só aparecem no preview/PDF se estiverem preenchidos.
- Não muda o schema do banco: os novos campos vivem dentro do JSONB `documents.body` (mesmo lugar de `vehicle`, `origin`, etc.). Sem migrações necessárias.

### Fora do escopo

- Não toco em `CustomTemplateDialog`, geração via `d.$token.tsx` (a rota pública usa o mesmo `DocumentView`, herda automaticamente).
- Não copio a placa/cor para a tabela `transports` ao aceitar um orçamento (pode ser uma melhoria futura, se desejar).

### Como validar

1. Abrir `/documents` → criar novo orçamento ou contrato → conferir os 3 campos (Veículo, Placa, Cor) no formulário.
2. Salvar e clicar em **Visualizar** → conferir Placa e Cor na seção "Detalhes do Serviço".
3. Exportar PDF → conferir as linhas Placa e Cor logo abaixo de Veículo.
4. Editar um documento existente sem placa/cor → preencher e salvar → confirma persistência.

