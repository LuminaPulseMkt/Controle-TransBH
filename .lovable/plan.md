

## Corrigir "Configuração do servidor incompleta (SUPABASE_SERVICE_ROLE_KEY)"

### Diagnóstico

O log do Worker confirma:
```
[acceptBudget] missing env: SUPABASE_SERVICE_ROLE_KEY
```

A chave **existe** nos secrets do Supabase, mas o Worker do TanStack Start (Cloudflare) só enxerga variáveis registradas como **secrets de runtime do próprio projeto Lovable**. Hoje o projeto tem apenas `LOVABLE_API_KEY` registrado lá — nenhum `SUPABASE_*`. Por isso `process.env.SUPABASE_SERVICE_ROLE_KEY` é `undefined` em produção.

Os valores que estão no `.env` local (`VITE_SUPABASE_*`) são embutidos no bundle do **cliente** pelo Vite — não chegam ao runtime do servidor.

### Correção

**1. Adicionar dois secrets de runtime ao projeto Lovable:**

- `SUPABASE_URL` → `https://mbcyrkofidalwpfykutf.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` → valor da service role key (a mesma já guardada no Supabase)

Vou solicitar a inclusão desses secrets via ferramenta. Após aprovação, eles passam a estar disponíveis em `process.env.*` no Worker e o `supabaseAdmin` inicializa normalmente.

**2. Nenhuma alteração de código necessária.**

O handler `acceptBudget` já valida a presença das variáveis e retorna mensagem clara — assim que os secrets forem injetados, o fluxo passa.

**3. Republicar o app**

Secrets só entram em vigor para o Worker após um novo deploy. Depois de aprovar a adição dos secrets, é preciso clicar em **Publish → Update** para o runtime de produção carregá-los.

### Como verificar

1. Após publicar, abrir `/d/{token-do-orçamento}` em aba anônima.
2. Marcar o checkbox e clicar em "Aceitar orçamento e gerar contrato".
3. Esperado: toast verde "Orçamento aceito! Contrato gerado." + link para o contrato.
4. Conferir novo registro em `/transports` (status `pending`) e em `/financial` (vencimento +7 dias).

### Observação importante

O `SUPABASE_SERVICE_ROLE_KEY` é uma chave **administrativa** que ignora RLS. Ela já é usada apenas em código server-side (`client.server.ts`, importado só por `*.functions.ts`), nunca chega ao bundle do cliente.

