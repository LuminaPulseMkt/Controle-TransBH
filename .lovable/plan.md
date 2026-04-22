

## Corrigir erro 500 ao aceitar orçamento

### Diagnóstico

O endpoint `/_serverFn/accept-budget` retorna `HTTP 500 {"unhandled":true,"message":"HTTPError"}`. Não há logs no Postgres (a request nunca chega ao banco) nem logs detalhados no Worker.

A causa é o **Worker não conseguindo inicializar `supabaseAdmin`**: o cliente em `src/integrations/supabase/client.server.ts` lê `process.env.SUPABASE_SERVICE_ROLE_KEY`, que não está no `.env` do projeto (lá só existem `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`). Quando o handler toca `supabaseAdmin.from(...)`, o proxy executa `createClient` e o `throw new Error("Missing Supabase server environment variables")` sobe como exceção não tratada → 500 genérico.

Como não há `try/catch` em volta do handler, o cliente também recebe apenas um toast vago "Erro ao processar aceite" e a causa real fica escondida.

### Correção

**1. Disponibilizar a service role key ao Worker**

Adicionar ao `.env` (a chave já existe nos secrets do Supabase, basta espelhar para o runtime do Worker):

```env
SUPABASE_SERVICE_ROLE_KEY="<valor da secret SUPABASE_SERVICE_ROLE_KEY>"
```

Sem isso o `supabaseAdmin` continuará explodindo na primeira chamada.

**2. Endurecer `accept-budget.functions.ts`**

- Envolver todo o handler em `try/catch` e devolver sempre `{ ok: false, error, stage }` em vez de deixar a exceção subir como 500. Isso transforma qualquer falha futura em mensagem clara no toast (ex.: "Falha ao criar transporte: violates foreign key").
- Em cada `if (err)`, incluir `err.message` na string retornada (hoje só retorna texto fixo, então o admin nunca vê qual constraint quebrou).
- Logar `console.error("[acceptBudget]", stage, err)` antes de retornar — fica visível em `server-function-logs`.

**3. Ajustes de robustez já no mesmo arquivo**

- `template`: o tipo `contract_template` é um enum; quando o orçamento tem `template = null`, o fallback `"standard"` já é seguro, manter.
- `transports.created_by`: a coluna é `nullable`, mas a policy de INSERT só exige `auth.uid() IS NOT NULL`. Como usamos `supabaseAdmin` (bypass RLS), seguir copiando `budget.created_by` sem alteração.
- Validar `budget.total_amount` como número finito antes de inserir o recebível (evita `NaN` se o orçamento estiver malformado).

**4. UI — `AcceptBudgetCard.tsx`**

Mostrar o `error` retornado pelo servidor diretamente no toast (já faz `toast.error(res.error)`), sem mudanças adicionais. O texto agora será informativo após o passo 2.

### Como verificar

1. Após o deploy, abrir a página pública do orçamento existente (`/d/5af4a2cd-…`) em aba anônima.
2. Marcar o checkbox e clicar em "Aceitar orçamento e gerar contrato".
3. Esperado: toast "Orçamento aceito! Contrato gerado." + cartão verde com link para o contrato.
4. Conferir em `/transports` o novo registro `pending` e em `/financial` a cobrança com vencimento +7 dias.

### Arquivos a editar

- `.env` — adicionar `SUPABASE_SERVICE_ROLE_KEY`
- `src/server/accept-budget.functions.ts` — envolver em try/catch, propagar `err.message`, logar stages

