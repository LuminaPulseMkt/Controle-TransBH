## Objetivo
Garantir que os campos **Telefone** e **WhatsApp** no formulário de Parceiros sempre incluam o DDI **+55**, sem que o usuário precise digitar.

## Mudanças em `src/routes/partners.tsx`

1. **Helper `withBR55(value)`**:
   - Remove tudo que não é dígito.
   - Se vazio → retorna `""` (não força +55 em campo em branco).
   - Se já começa com `55` → retorna `+55` + restante formatado.
   - Caso contrário → prepend `55` aos dígitos e retorna `+55...`.
   - Formato final exibido: `+55 (DD) NNNNN-NNNN` (máscara leve para legibilidade).

2. **Substituir os dois `<Input>`** (Telefone e WhatsApp) por uma versão controlada:
   - `value` sempre passado por `withBR55`.
   - `onChange` aplica `withBR55` antes de salvar no estado.
   - `onFocus`: se vazio, pré-preenche `+55 `.
   - `placeholder="+55 (31) 99999-9999"`.
   - `inputMode="tel"`.

3. **No `save()`**: normalizar antes de persistir — se o campo só tiver `+55` (sem número real), gravar `null`; senão gravar a string formatada.

4. **Compatibilidade com `sendWa`**: a função já faz `replace(/\D/g, "")`, então a máscara não quebra o link do WhatsApp.

## Escopo
Apenas o diálogo de criar/editar parceiro. Não altera dados existentes no banco — a normalização acontece somente quando o registro é salvo de novo.

## Fora de escopo
Outros formulários (clientes em transportes, documentos etc.) — se quiser estender, peço confirmação depois.