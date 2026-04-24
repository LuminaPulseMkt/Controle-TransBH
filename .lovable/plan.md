

## Upload de múltiplas fotos no detalhe do Transporte

### Comportamento atual

Em `/transports/:id`, o formulário de "Adicionar foto" aceita apenas **um arquivo por vez**: o input não tem `multiple`, o estado guarda um único `File`, e o upload faz um único `insert`. Para enviar 5 fotos é preciso repetir o processo 5 vezes.

### O que muda

Permitir selecionar **várias imagens de uma vez**, mostrar a lista de arquivos pendentes (com miniatura + nome + tamanho) antes de enviar, possibilitar remover qualquer arquivo da fila antes do upload e enviar todos em paralelo com feedback de progresso. As fotos já enviadas continuam aparecendo na galeria como hoje.

### Mudanças em `src/routes/transports.$id.tsx`

1. **Estado** (linhas 78–80):
   - Trocar `pendingFile: File | null` por `pendingFiles: File[]`.
   - Manter `caption` (legenda única aplicada a todos os arquivos do lote — opcional).
   - Adicionar `uploadProgress: { done: number; total: number }` para mostrar "Enviando 2 de 5…".

2. **Input de arquivo** (linha 252):
   - Adicionar atributo `multiple` ao `<Input type="file">`.
   - Trocar handler para acumular arquivos: `setPendingFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])` — assim o usuário pode clicar em "Escolher" várias vezes e ir somando.
   - Limpar o `value` do input após seleção para permitir re-selecionar o mesmo arquivo se removido.

3. **Nova lista de pré-visualização** (acima do input):
   - Renderizar grid pequeno (3–6 colunas) com miniatura via `URL.createObjectURL(file)`, nome truncado, tamanho em KB e botão ✕ para remover daquele lote.
   - Mostrar contador "X arquivo(s) selecionado(s)".
   - Garantir `URL.revokeObjectURL` no unmount/remoção para evitar leak.

4. **`uploadPhoto()`** (linhas 111–127): renomear para `uploadPhotos()` e refatorar:
   - Validar `pendingFiles.length > 0`.
   - Iterar em paralelo (`Promise.allSettled`) sobre cada arquivo, chamando `storage.upload` + `transport_photos.insert` por item.
   - Atualizar `uploadProgress` conforme cada um termina.
   - Ao final: toast com total de sucessos/falhas (ex.: "5 fotos adicionadas." ou "4 enviadas, 1 falhou: <motivo>").
   - Limpar `pendingFiles`, `caption`, `uploadProgress` e recarregar a galeria.

5. **Botão Enviar**: label dinâmico "Enviar (N)" e indicador de progresso quando `uploading`.

### Compatibilidade

- Schema do banco e bucket `transport-photos` já suportam múltiplas linhas por transporte (a galeria atual já lista N fotos). Sem migrações.
- A foto principal (`transport.photo_url`) e a remoção individual continuam funcionando sem alteração.

### Fora do escopo

- Não adiciono compressão/redimensionamento client-side das imagens.
- Não permito legendas individuais por arquivo no lote (uma legenda compartilhada para o batch — manter simples). Caso queira, é trivial estender depois.
- Não toco em RLS, bucket nem em outras telas.

### Como validar

1. Abrir `/transports/:id`, ir até "Adicionar foto".
2. Clicar em escolher arquivos e selecionar 3+ imagens — confirmar que aparecem como cartões em pré-visualização com miniatura, nome e botão de remover.
3. Adicionar mais arquivos em uma segunda seleção — confirmar que somam à lista existente.
4. Remover um da fila com o ✕ — confirmar que some da pré-visualização.
5. Clicar **Enviar (N)** — ver indicador "Enviando X de N…", toast de sucesso e galeria recarregada com todas as novas fotos.
6. Forçar um erro (ex.: arquivo enorme) — confirmar que o toast mostra parcial sucesso/falha sem perder os enviados.

