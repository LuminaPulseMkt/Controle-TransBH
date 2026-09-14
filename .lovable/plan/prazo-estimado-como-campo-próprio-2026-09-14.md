# Prazo Estimado como campo próprio

Hoje a frase "Prazo estimado: até 5 dias úteis após a coleta." vem fixa dentro do texto de Observações/Cláusulas do modelo padrão. Ela será removida do texto e virá um campo separado, preenchido por você em cada documento.

## O que muda

1. **Remover a frase fixa** do modelo de orçamento padrão, para que ela não apareça mais automaticamente nas observações.
2. **Novo campo "Prazo Estimado"** no formulário de Contratos & Orçamentos, ao lado dos campos de rota/valores. Texto livre (ex.: "até 5 dias úteis após a coleta" ou "10 a 15 dias").
3. **Exibição nos documentos**: o prazo aparece no bloco de dados (junto com Origem/Destino) na pré-visualização na tela e no PDF gerado, tanto em orçamento quanto em contrato. Se ficar vazio, a linha simplesmente não aparece.
4. Documentos já salvos continuam abrindo normalmente; o campo vem vazio até ser preenchido.

## Detalhes técnicos

- `src/lib/document-templates.ts`: remover a linha "Prazo estimado..." das notas do modelo `budget-standard`.
- `src/routes/documents.tsx`: adicionar `delivery_deadline` ao estado do formulário, carregar de `d.body.delivery_deadline` na edição, salvar em `body` no insert/update e no payload de pré-visualização.
- `src/components/DocumentView.tsx`: renderizar `UnderlineField label="Prazo estimado"` após Destino, quando preenchido.
- `src/lib/document-pdf.ts`: `drawField("Prazo estimado", body.delivery_deadline)` após Destino, condicional.
- Sem alteração de banco: `documents.body` é JSONB.
