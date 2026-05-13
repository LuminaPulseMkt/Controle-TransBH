## Diagnóstico
Os logs do servidor mostram a causa exata do erro 500 em qualquer página:

```
ReferenceError: localStorage is not defined
  at src/integrations/supabase/client.ts:13
  → src/lib/auth-context.tsx
  → src/routes/__root.tsx
```

O cliente Supabase do browser referencia `localStorage` no escopo do módulo. Como `__root.tsx` importa `auth-context` que importa `client.ts`, o módulo é executado durante o SSR (Cloudflare Worker), onde `localStorage` não existe — derrubando todo o render.

## Correção
Tornar o `storage` condicional ao ambiente em `src/integrations/supabase/client.ts`:

```ts
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
  },
});
```

Com isso:
- No SSR (Worker), `storage` fica `undefined` e o supabase-js usa um stub em memória — sem crash.
- No browser, continua persistindo a sessão em `localStorage` normalmente (comportamento atual preservado).

## Escopo
Apenas 1 arquivo: `src/integrations/supabase/client.ts`. Sem mudanças em UI, schema ou auth-context.

## Validação
Após o fix, recarregar a preview deve renderizar a home (200) em vez do "Lovable proxy error (500)". Confirmaremos pelos logs do servidor.
