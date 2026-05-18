## Diagnóstico

Quando o orçamento é criado pelo painel, a mensagem do WhatsApp para o cliente é montada em `src/routes/documents.tsx` (linha 377) usando `window.location.origin`:

```ts
const link = `${window.location.origin}/d/${createdToken}`;
```

Se você (admin) está usando o app dentro do ambiente de **preview** do Lovable (`https://id-preview--8ecfdbc6-...lovableproject.com`) ou do sandbox de desenvolvimento, o link enviado ao cliente aponta para esse host. Esse domínio de preview:

- não é o site público,
- pode dormir / não estar disponível para terceiros,
- frequentemente retorna 404/redireciona quando aberto fora do editor.

Confirmei direto na base que o token existe e que a RPC `get_document_by_token` retorna o documento normalmente quando consultada via API pública (anon). Ou seja: **o documento existe**, o problema é o link que sai com o host errado.

A função `acceptBudget` já tem o domínio público fixo (`https://transbh-fleetflow.lovable.app`), mas o envio inicial do orçamento (e o botão "Copiar link" do preview do documento) não.

## Correção

1. Centralizar o domínio público em uma constante:
   - Criar `src/lib/public-url.ts` exportando `PUBLIC_SITE_URL = "https://transbh-fleetflow.lovable.app"` e helper `publicDocUrl(token)`.
2. Em `src/routes/documents.tsx`:
   - Trocar `${window.location.origin}/d/${createdToken}` (criação + auto WhatsApp) por `publicDocUrl(createdToken)`.
   - Trocar `${window.location.origin}/d/${d.public_token}` (linha ~493, botão de copiar/compartilhar) pelo mesmo helper.
3. Em `src/components/DocumentPreviewDialog.tsx` (linha 43): usar o mesmo helper para o botão "Copiar link".
4. Em `src/server/accept-budget.functions.ts` e `src/server/generate-contract-assets.functions.ts`: substituir a string hardcoded pelo mesmo helper (constante compartilhada), só para garantir consistência.

Não toco em `transports.$id.tsx` nem em `social.tsx` por enquanto — eles têm outra finalidade (link interno de rastreio e perfis sociais). Se quiser, posso ajustar também depois.

## Resultado esperado

Todos os links enviados ao cliente (WhatsApp / botão copiar) passam a apontar para `https://transbh-fleetflow.lovable.app/d/{token}`, que é o domínio público do site. O cliente abre o link, a RPC pública busca o documento, e o aceite/assinatura funciona normalmente — independente de você estar logado no preview ou no site publicado.

## Observação

Se no futuro você publicar com domínio próprio, basta atualizar a constante `PUBLIC_SITE_URL` em um único lugar.
