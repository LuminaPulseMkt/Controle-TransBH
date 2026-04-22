

## Melhorar legibilidade dos títulos na lista de Contratos & Orçamentos

### Problema

Na aba **Contratos & Orçamentos** (`/documents`), cada linha mostra o título do documento (ex.: "Orçamento de Transporte — Padrão", "Contrato de Transporte de Veículos") com fonte pequena e o badge de tipo (Orçamento/Contrato) ao lado em uppercase com `text-[10px]` e tracking largo. O resultado fica apagado e difícil de ler tanto na visão "Por cliente" quanto na "Lista".

### Mudanças em `src/components/.../DocRow` (dentro de `src/routes/documents.tsx`, linhas 577–598)

1. **Ícone do documento** (esquerda)
   - Subir de `h-10 w-10` para `h-11 w-11` para acompanhar o título maior.
   - Aumentar o ícone interno de `h-5 w-5` para `h-5.5 w-5.5` (manter `h-5 w-5` se 5.5 não existir no Tailwind — usar `h-6 w-6`).

2. **Título do documento** (`<h3>`, linha 584)
   - Trocar `font-semibold truncate` por `text-lg md:text-xl font-bold text-foreground truncate leading-tight`.
   - Resultado: passa de ~14px peso semibold para 18–20px peso bold, com cor primária do texto (sem opacidade), mantendo truncamento.

3. **Badge "Orçamento" / "Contrato"** (linha 585)
   - Substituir `text-[10px] uppercase tracking-wider` por `text-xs font-semibold` (sem uppercase, sem tracking exagerado).
   - Manter `px-2 py-0.5 rounded bg-muted`, mas adicionar `text-foreground/80` para garantir contraste.

4. **Badge "Aceito {data}"** (linha 589) — para manter consistência visual
   - Mesma troca: `text-[10px] uppercase tracking-wider` → `text-xs font-semibold` (preservando cores emerald e ícone).

5. **Linha de metadados (data · valor)** (linha 594)
   - Subir de `text-sm text-muted-foreground` para `text-sm text-foreground/70` (mais contraste, mesmo tamanho).

### Fora do escopo

- Não altero o cabeçalho do grupo "Por cliente" (nome do cliente já está legível em `font-semibold`).
- Não mexo no `DocumentView` (preview/visualização do documento aberto), já ajustado nas rodadas anteriores.
- Sem mudanças em `DocumentPreviewDialog`, geração de PDF ou rota pública `/d/$token`.

### Como validar

1. Abrir `/documents`.
2. Conferir a visão "Por cliente": expandir um cliente e verificar que os títulos dos documentos estão grandes, em negrito e o badge de tipo legível em case normal.
3. Alternar para a visão "Lista" e confirmar a mesma melhoria.

