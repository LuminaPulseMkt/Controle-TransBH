

## Melhorar legibilidade dos títulos em Contratos e Orçamentos

### Problema

Na visualização do documento (`DocumentView.tsx`), o título principal e os rótulos das seções usam tamanhos pequenos, peso leve e baixo contraste (`text-muted-foreground` em uppercase 10px com tracking largo), o que dificulta a leitura — especialmente no cabeçalho escuro e nos cartões de seção (Cliente, Detalhes do Serviço, Valores, Observações).

### Mudanças propostas em `src/components/DocumentView.tsx`

1. **Cabeçalho do documento (faixa escura)**
   - Nome da empresa: aumentar de `text-xl` para `text-2xl` e usar a fonte display (Bebas Neue) para destaque.
   - Etiqueta "Transporte de Veículos" / "Contrato" / "Orçamento": subir de `text-[10px]` para `text-xs` e clarear a cor (`text-white/80` em vez de `text-white/60`).
   - Data: passar a `text-base` com peso médio.

2. **Título do documento (ex.: "Orçamento de Transporte — Padrão")**
   - Subir de `text-2xl` para `text-3xl md:text-4xl`.
   - Aplicar a fonte display (`font-display`) para alinhar com a identidade industrial do app.
   - Trocar `font-semibold` por `font-bold` e clarear (`text-foreground`).
   - ID do documento: aumentar para `text-sm` com `text-foreground/70`.

3. **Títulos das seções (Cliente / Detalhes do Serviço / Valores / Observações / Cláusulas)**
   - Aumentar de `text-[10px]` para `text-sm`.
   - Reduzir tracking de `0.18em` para `0.1em` (mais legível).
   - Trocar `text-muted-foreground` por `text-primary` (âmbar) para destacar como cabeçalho de seção.
   - Manter uppercase, mas com `font-bold`.

4. **Campos (label/valor) dentro das seções**
   - Subir de `text-sm` para `text-base`.
   - Aumentar `min-w` do label de 90px para 110px para melhor alinhamento com os textos maiores.
   - Reforçar contraste do label (`text-foreground/70` em vez de `text-muted-foreground`).

5. **Total**
   - Manter o valor em `text-2xl` mas aumentar o rótulo "Total" para `text-base font-semibold`.

6. **Assinaturas (contratos) e rodapé da empresa**
   - Nome do contratante/contratada: subir para `text-sm font-medium text-foreground`.
   - Etiqueta "Contratante/Contratada": `text-xs` em vez de `text-[10px]`.
   - Rodapé com dados da empresa: subir para `text-sm`.

### Fora do escopo

- Não altero as cores do tema (`src/styles.css`), nem o conteúdo dos modelos em `document-templates.ts`.
- Não mexo no `DocumentPreviewDialog` nem na rota pública `d.$token.tsx` — ambos consomem `DocumentView`, então herdam as melhorias automaticamente.

### Como validar

1. Abrir `/documents`, clicar em qualquer orçamento ou contrato para abrir o preview.
2. Conferir que título, seções e campos estão claramente legíveis no tema escuro.
3. Abrir um link público (`/d/<token>`) para confirmar a mesma melhoria na visão do cliente.

