

## Página pública de visualização de orçamento/contrato

Criar uma página dentro da plataforma onde o cliente acessa um link único para visualizar o orçamento ou contrato gerado, sem precisar de login. O mesmo link será usado no botão de compartilhamento via WhatsApp.

### Como vai funcionar

1. Cada documento (orçamento/contrato) ganha uma URL pública única do tipo:
   `https://transbh-fleetflow.lovable.app/d/{id-do-documento}`
2. Ao abrir o link, o cliente vê uma versão limpa, com a marca TransBH, dos dados do documento (cliente, veículo, rota, valores, observações/cláusulas) — exatamente como já aparece no preview interno hoje.
3. Botões disponíveis para o cliente: **Baixar PDF** e (em contratos) **Aceitar / Ver assinatura**.
4. No painel interno, o botão "WhatsApp" passa a enviar a mensagem já com esse link embutido, no formato:
   > "Olá {cliente}, segue seu orçamento TransBH: {link}".

### Estrutura técnica

**1. Banco de dados (migração)**
- Adicionar coluna `public_token` (text, único, gerado por `gen_random_uuid()`) na tabela `documents` — token usado na URL para evitar enumeração por id.
- Backfill: gerar token para todos os documentos existentes.
- Nova policy RLS de SELECT público:
  ```sql
  CREATE POLICY "Public view by token"
  ON public.documents FOR SELECT TO anon
  USING (public_token IS NOT NULL);
  ```
  *(o token só é descoberto via link; sem ele, ninguém lista documentos)*

**2. Nova rota pública**
- `src/routes/d.$token.tsx` — fora de qualquer guard de auth.
- Carrega o documento por `public_token` usando o cliente Supabase anon.
- Reaproveita o layout do `DocumentPreviewDialog` extraindo o conteúdo para um componente compartilhado `DocumentView` (`src/components/DocumentView.tsx`), usado tanto no dialog interno quanto na página pública.
- Cabeçalho com logo TransBH, rodapé com contato da empresa (puxado de `company_settings`).
- `head()` da rota com `og:title`, `og:description` e `og:image` (logo) para preview bonito quando o link cair no WhatsApp.
- `notFoundComponent` e `errorComponent` próprios (link inválido / expirado).

**3. Botão de compartilhamento WhatsApp**
- Em `src/routes/documents.tsx` e dentro do `DocumentPreviewDialog`, atualizar `onShareWhatsApp` para montar:
  ```ts
  const url = `${window.location.origin}/d/${doc.public_token}`;
  const msg = `Olá ${doc.client_name}, segue seu ${isContract ? "contrato" : "orçamento"} TransBH:\n${url}`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
  ```
- Adicionar também botão "Copiar link" ao lado do WhatsApp no dialog de preview.

**4. Download de PDF na página pública**
- Reaproveitar a função de exportação de PDF já existente (jspdf/html2canvas) — disponível para visitantes anônimos no botão "Baixar PDF".

### Diagrama do fluxo

```text
Admin gera documento  ──►  documents.public_token
        │
        ├─► Botão "WhatsApp" no painel
        │     └─► wa.me/?text=...+/d/{token}
        │
Cliente recebe link  ──►  /d/{token}  (rota pública, sem login)
        │                     │
        │                     ├─► Visualiza documento
        │                     └─► Baixa PDF
```

### Arquivos a criar/editar

- **Migração SQL**: `documents.public_token` + RLS pública
- **Criar**: `src/routes/d.$token.tsx`
- **Criar**: `src/components/DocumentView.tsx` (extrai layout do preview)
- **Editar**: `src/components/DocumentPreviewDialog.tsx` (usa DocumentView + botão "Copiar link")
- **Editar**: `src/routes/documents.tsx` (WhatsApp envia link público)
- **Editar**: `src/integrations/supabase/types.ts` (regenerado automaticamente)

