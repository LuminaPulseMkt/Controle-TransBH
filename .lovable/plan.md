## Objetivo
Adicionar um botão **Pré-visualizar** no diálogo de criação/edição de documentos (`/documents`) que abre o contrato (ou orçamento) renderizado com `DocumentView`, usando o estado atual do formulário — sem salvar no banco.

## Onde alterar
Arquivo único: `src/routes/documents.tsx`

## Mudanças
1. **Novo estado** `previewDraft: DocumentViewData | null` (separado de `previewDoc`, que é usado para documentos já salvos).
2. **Função `buildDraftPreview()`** — monta um `DocumentViewData` a partir do `form` atual:
   - `id`: `"draft"`
   - `doc_type`, `title`, dados do cliente, `total_amount` (= `total`)
   - `body`: mesmo objeto montado em `save()` (vehicles, origin, destination, notes, extra, insurance, service_value, etc.)
   - `created_at`: `new Date().toISOString()`
3. **Botão "Pré-visualizar"** no `DialogFooter` (linha ~940), ao lado de "Voltar" e "Salvar":
   - `<Button variant="secondary" onClick={() => setPreviewDraft(buildDraftPreview())}>` com ícone `Eye`.
   - Desabilitado se `client_name` estiver vazio (mesma validação mínima do salvar).
4. **Reaproveitar `DocumentPreviewDialog`** já existente para mostrar o rascunho:
   - Renderizar uma segunda instância apontando para `previewDraft`.
   - **Sem** `onExportPDF` e **sem** `onShareWhatsApp` (é apenas rascunho).
   - Passar `company={company}` para manter o cabeçalho idêntico ao real.
5. Diálogo de criação continua aberto por baixo — ao fechar a pré-visualização, o usuário volta ao formulário e pode ajustar antes de salvar.

## Detalhes técnicos
- `DocumentPreviewDialog` espera campos extras (`template`, `public_token`, `accepted_at`, etc.) — preencher com `null` no rascunho; ele só usa esses campos para o rodapé (copiar link / aceito) que ficam ocultos sem token.
- Sem chamadas ao Supabase, sem efeitos colaterais — apenas estado local.
- Nenhuma mudança em rotas, migrations, PDF ou outros componentes.