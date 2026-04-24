
## Corrigir botão "Detalhes" + upload múltiplo no diálogo de Transporte

### Problema 1 — botão Detalhes não funciona

`src/routes/transports.tsx` registra a rota `/transports` com o componente da lista, **sem `<Outlet />`**. No `routeTree.gen.ts` (linhas 69–73), `/transports/$id` é registrada como **filha** de `/transports`. Resultado: ao clicar em "Detalhes" e ir para `/transports/<id>`, o React Router renderiza o pai (a lista) e nunca chega a montar o filho — visualmente parece que nada acontece.

**Correção:** transformar a rota da lista em `transports.index.tsx` para que pai e filho fiquem como **rotas irmãs** sob `/transports` e `/transports/$id`.

1. **Renomear** `src/routes/transports.tsx` → `src/routes/transports.index.tsx` (sem mudar o conteúdo do componente, exceto os ajustes do problema 2 abaixo).
2. O TanStack Router Vite plugin regenera `routeTree.gen.ts` automaticamente — não edito esse arquivo.
3. Após o rename: `/transports` (lista) e `/transports/$id` (detalhe) ficam independentes; o `<Link to="/transports/$id">` já existente passa a funcionar.

### Problema 2 — upload múltiplo no diálogo de Novo/Editar Transporte

Hoje o input de foto no diálogo aceita só **um arquivo**, faz upload imediato e guarda apenas a URL em `form.photo_url`. Para anexar várias fotos, o usuário precisa abrir o detalhe (que está quebrado).

**Correção em `transports.index.tsx` (após o rename):**

1. **Estado novo** (junto com `form` e `uploading`):
   - `pendingFiles: File[]` — fila de arquivos selecionados aguardando upload.
   - `extraPhotoUrls: string[]` — URLs já enviadas durante esta sessão do diálogo (vão para `transport_photos` no save).
   - `existingPhotos: { id: string; photo_url: string }[]` — fotos já salvas em `transport_photos` quando estiver editando, para o usuário ver e poder remover.

2. **Carregar fotos existentes ao editar**: dentro de `openEdit(t)`, fazer `select` em `transport_photos` filtrando por `transport_id = t.id` e popular `existingPhotos`. Ao abrir "Novo", zerar tudo.

3. **Substituir `onPhotoChange`** por dois handlers:
   - `onFilesSelected`: adiciona `Array.from(e.target.files)` a `pendingFiles` (acumula entre seleções) e limpa `e.target.value`.
   - `removePending(file)`: remove do array.
   - `removeExisting(photo)`: deleta a linha de `transport_photos` e atualiza `existingPhotos` (também tenta remover do storage por melhor higiene, ignorando falha).
   - `removeExtra(url)`: remove de `extraPhotoUrls` (não bate no banco — ainda não foi salvo).

4. **UI no diálogo** (substituir o bloco "Foto do veículo"):
   - Grade pequena (ex.: `grid-cols-3 md:grid-cols-4 gap-2`) mostrando:
     - **Existentes** (somente em edição) com botão ✕.
     - **Já enviadas nesta sessão** (`extraPhotoUrls`) com botão ✕.
     - **Pendentes** (`pendingFiles`) com miniatura via `URL.createObjectURL` + nome truncado + ✕.
   - A primeira foto da lista combinada vira "capa" (badge "Capa") — define `form.photo_url`.
   - Input `<Input type="file" multiple accept="image/*" />` com label "Adicionar fotos".

5. **Refator do upload**: nova função `uploadPending()` chamada **dentro de `save()`**, antes do `insert/update` do transporte:
   - Se `pendingFiles.length > 0`, faz `Promise.allSettled` de uploads para `transport-photos`, coleta as URLs públicas, acumula em `extraPhotoUrls`. Mostra toast resumido em caso de falhas parciais.
   - Limpa `pendingFiles`.

6. **`save()` atualizado**:
   - Roda `uploadPending()` primeiro.
   - Define `form.photo_url` como a primeira da lista combinada (existentes + extras), se ainda vazio.
   - Insere/atualiza o transporte normalmente.
   - **Após** sucesso: para cada URL em `extraPhotoUrls` que ainda não está em `existingPhotos`, faz `insert` em `transport_photos` com `transport_id` recém-criado/editado (no caso de novo, usar o `id` retornado pelo `.select().single()`).
   - Recarrega a lista, fecha o diálogo, limpa estado.

7. **Indicador de progresso** no botão Salvar quando estiver fazendo upload em lote ("Enviando 2/5… / Salvando…").

### Compatibilidade

- Schema atual já suporta múltiplas fotos: `transport_photos` (transport_id, photo_url, caption) + bucket público `transport-photos`. **Sem migrações.**
- A coluna `transports.photo_url` continua sendo usada como capa.
- Detalhe (`transports.$id.tsx`) já lista as fotos de `transport_photos` e mantém seu próprio uploader em lote (já implementado anteriormente) — sem mudanças nesse arquivo.

### Fora do escopo

- Não mudo RLS, bucket nem o componente de detalhe.
- Não adiciono compressão/redimensionamento.
- Sem legenda individual por foto no diálogo (mantém o fluxo simples; legendas detalhadas continuam disponíveis na página de detalhe).

### Como validar

1. Abrir `/transports` → clicar **Detalhes** em qualquer linha → deve abrir `/transports/<id>` com as informações completas (antes, ficava preso na lista).
2. Clicar **Novo Transporte** → no campo de fotos, selecionar 3 imagens → ver as 3 miniaturas, com a primeira marcada como "Capa" → remover uma → salvar → confirmar que a lista mostra a capa e a página de detalhe lista as outras 2 fotos.
3. **Editar** um transporte existente → confirmar que as fotos já enviadas aparecem na grade e podem ser removidas individualmente → adicionar mais 2 → salvar → confirmar persistência (capa + galeria).
4. Forçar erro de upload (arquivo muito grande) → confirmar toast com sucesso parcial e que o transporte ainda é salvo com as fotos que deram certo.
