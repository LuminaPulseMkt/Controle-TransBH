

## Editar contratos e orçamentos já gerados

### Comportamento

Adicionar um botão **Editar** em cada linha da lista de documentos (`/documents`) que reabre o mesmo formulário usado na criação, pré-preenchido com os dados atuais. Ao salvar, o documento é atualizado em vez de um novo ser criado.

### Permissões

A política RLS `Admins update documents` só permite `UPDATE` para administradores. Logo:

- O botão **Editar** só aparece para usuários `isAdmin`.
- Não-admins continuam vendo apenas Visualizar / PDF / WhatsApp.

### Bloqueio de edição em orçamentos aceitos

Um orçamento aceito (`accepted_at` preenchido) já gerou contrato + transporte + cobrança. Editar valores depois disso quebra a rastreabilidade. Regra:

- Se `doc_type === "budget"` e `accepted_at != null` → botão Editar fica **desabilitado** com tooltip "Orçamento já aceito — não pode ser editado".
- Contratos podem ser editados livremente (por admin).

### Mudanças em `src/routes/documents.tsx`

1. **Novo estado** `editingDoc: Document | null` ao lado de `previewDoc`.
2. **Nova função `openEdit(d: Document)`**:
   - Define `docType = d.doc_type`.
   - Faz `setForm({...})` populando todos os campos a partir de `d` e `d.body` (origin, destination, vehicle, service_value, insurance, extra, notes — convertendo números para string).
   - Define `setEditingDoc(d)`, `setStep("form")` (pula a tela de modelos) e `setOpen(true)`.
3. **Refator de `save()`**:
   - Se `editingDoc` existir: `supabase.from("documents").update({ ... }).eq("id", editingDoc.id)`.
   - Senão: mantém o `insert` atual.
   - Em ambos os casos: limpa `editingDoc` ao fechar e recarrega a lista.
   - Mensagens: "Documento atualizado." vs "Documento criado.".
4. **Reset ao fechar**: no `onOpenChange` do `Dialog`, quando fechar, zerar `editingDoc` e voltar `step` para `"template"`.
5. **Título do diálogo**: "Editar {Orçamento|Contrato}" quando `editingDoc` estiver presente.
6. **Esconder a faixa "Trocar modelo"** no modo edição (não faz sentido trocar modelo de um doc existente — só edita os campos).
7. **Em `DocRow`**: adicionar prop `onEdit?: () => void` e prop `canEdit: boolean`. Quando `canEdit` for true, renderizar antes do botão PDF:
   ```
   <Button size="sm" variant="outline" onClick={onEdit} disabled={isAcceptedBudget}>
     <Pencil className="h-4 w-4 mr-1" /> Editar
   </Button>
   ```
   Com `title` explicativo quando desabilitado.
8. **Passar `onEdit={() => openEdit(d)}` e `canEdit={isAdmin}`** nas duas renderizações de `DocRow` (visão "Por cliente" e visão "Lista").

### Fora do escopo

- Não altero o schema do banco — RLS e colunas já suportam tudo.
- Não toco no `DocumentPreviewDialog`, `DocumentView`, `CustomTemplateDialog`, geração de PDF nem na rota pública `/d/$token`.
- Não adiciono histórico/auditoria de edições (pode ser uma melhoria futura se você quiser).
- Não permito alterar `doc_type` (orçamento ↔ contrato) — apenas os campos do formulário.

### Como validar

1. Logado como administrador, abrir `/documents`.
2. Em qualquer documento não-aceito, clicar **Editar** → confere que o diálogo abre direto no formulário com todos os valores preenchidos.
3. Alterar título, valores ou observações e salvar → toast "Documento atualizado." e a lista reflete a mudança (valor total, data permanece a original).
4. Em um orçamento já aceito, conferir que o botão Editar está desabilitado com tooltip explicativo.
5. Logado como colaborador (não-admin), conferir que o botão Editar não aparece.

