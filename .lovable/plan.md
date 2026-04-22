

## Ajustar legibilidade do cabeçalho dos documentos

### Problema

No cabeçalho escuro do documento (faixa azul-marinho no topo), três textos estão com legibilidade ruim:

1. **"TransBH"** — usa `font-display` (Bebas Neue) com peso bold e tracking apertado, o que comprime as letras e prejudica a leitura no fundo escuro.
2. **"Transporte de Veículos"** — `text-xs` em uppercase com `tracking-[0.18em]` (espaçamento muito largo entre letras pequenas).
3. **"Orçamento" / "Contrato"** — mesmo problema: fonte pequena, uppercase, tracking largo demais, dificultando leitura.

### Mudança proposta em `src/components/DocumentView.tsx` (linhas 38–63 — bloco do cabeçalho)

**Logo / nome da empresa:**
- Trocar `font-display` por `font-sans` para evitar compressão da Bebas Neue.
- Aumentar de `text-2xl` para `text-3xl`.
- Manter `font-bold` e cor `text-primary` (âmbar).
- Adicionar `tracking-tight` em vez de tracking padrão para um nome curto ficar coeso mas legível.

**Etiqueta "Transporte de Veículos" (subtítulo da logo):**
- Remover uppercase e tracking largo.
- Trocar `text-xs uppercase tracking-[0.18em]` por `text-sm font-medium`.
- Manter `text-white/80`.

**Etiqueta "Orçamento" / "Contrato" (canto direito):**
- Remover uppercase e tracking largo.
- Trocar `text-xs uppercase tracking-[0.18em]` por `text-sm font-semibold`.
- Manter `text-white/80`.

**Data (logo abaixo da etiqueta):**
- Manter `text-base font-medium`, sem alteração — já está legível.

### Resultado esperado

- "TransBH" maior e com letras mais abertas (sem usar a fonte display estreita).
- "Transporte de Veículos", "Orçamento" e "Contrato" passam de uppercase comprimido com tracking largo para texto normal (case original) em tamanho `sm`, ficando muito mais fáceis de ler.

### Fora do escopo

- Não altero os títulos das seções internas (Cliente, Valores etc.) — esses já foram ajustados na rodada anterior.
- Não mexo no PDF gerado por `jsPDF` em `d.$token.tsx`, apenas na visualização HTML compartilhada (`DocumentView`), que serve tanto o preview interno quanto o link público.

### Como validar

1. Abrir `/documents` e clicar em qualquer documento para ver o preview.
2. Conferir o cabeçalho escuro: nome da empresa grande e legível, subtítulo e etiqueta de tipo de documento sem espaçamento exagerado.
3. Abrir um link público `/d/<token>` e confirmar a mesma melhoria.

