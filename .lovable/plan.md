## Objetivo
Centralizar todos os textos enviados (WhatsApp e e-mail) na tabela `message_templates`, editáveis pela tela **Configurações → Modelos de Mensagem**, e ligar e-mail real via Lovable Emails (domínio próprio).

## O que já existe (reaproveitar)
- Tabela `message_templates(key, label, body)` com RLS pronta.
- Aba **Modelos de Mensagem** em `/settings` editando `body` por blur.
- WhatsApp já dispara via Evolution API em: criação de orçamento, aceite, cobrança manual e ações manuais em documentos/transports.

## Mudanças

### 1. Seed dos 6 templates editáveis (migration)
Inserir/atualizar (ON CONFLICT key) na `message_templates`:

| key | label | uso |
|---|---|---|
| `wa_budget_created` | WhatsApp — Orçamento enviado | gatilho ao criar orçamento |
| `wa_budget_accepted` | WhatsApp — Aceite recebido | gatilho ao aceitar orçamento |
| `wa_charge_reminder` | WhatsApp — Cobrança | botão "Cobrar" |
| `email_budget_created` | E-mail — Orçamento (assunto + corpo) | mesmo gatilho do WhatsApp |
| `email_budget_accepted` | E-mail — Aceite confirmado | mesmo gatilho do WhatsApp |
| `email_charge_reminder` | E-mail — Cobrança | botão "Cobrar e-mail" |

Para os 3 templates de e-mail, o `body` guarda **assunto + corpo** separados por uma linha contendo apenas `---` (mais simples que duas colunas e funciona bem no `<Textarea>`).

### 2. Helper `renderTemplate(body, vars)` — `src/lib/message-templates.ts`
Faz `{client_name}`, `{amount}`, `{due_date}`, `{link}`, `{title}`, `{transport_code}`, `{days_overdue}`, `{company_name}` → valor, com fallback `""` se variável ausente. Usado em todos os pontos de envio.

### 3. Carregar templates do banco antes de enviar
Padrão usado em todos os pontos: query simples `select body from message_templates where key=?`. No servidor (`accept-budget.functions.ts`) lê via `supabaseAdmin`. No client (documents.tsx, financial.clients.$name.tsx, transports.index.tsx) lê via `supabase`. Fallback para texto padrão se template vazio.

### 4. Pontos que passam a usar templates
- `src/routes/documents.tsx` `save()` → usa `wa_budget_created` (e dispara `email_budget_created` se houver `client_email`).
- `src/server/accept-budget.functions.ts` → usa `wa_budget_accepted` + `email_budget_accepted`.
- `src/routes/financial.clients.$name.tsx` `sendCharge()` → usa `wa_charge_reminder`; novo botão "E-mail" usa `email_charge_reminder`.
- `src/routes/transports.index.tsx` (mensagem de status) — opcional manter como está; se quiser editável criamos `wa_transport_update` (fora deste escopo, posso adicionar se confirmar).

### 5. Infra de e-mail (Lovable Emails)
- Configurar domínio de e-mail (vou abrir o diálogo de setup no momento da execução).
- Rodar `setup_email_infra` + `scaffold_transactional_email`.
- Criar 3 templates React Email em `src/lib/email-templates/` (`budget-created`, `budget-accepted`, `charge-reminder`) que recebem **subject e body já renderizados** via `templateData` — assim a edição continua sendo só na aba Modelos de Mensagem (o `.tsx` é só wrapper visual com cabeçalho/rodapé da marca).
- Criar `src/lib/email/send.ts` (helper `sendTransactionalEmail`) e usar nos pontos acima.
- Para envios disparados por usuário não autenticado (página de aceite), o aceite já roda via `createServerFn` no servidor — fará a chamada interna ao endpoint usando o JWT do request quando houver, ou via service role.

### 6. UI da aba Modelos de Mensagem (`src/routes/settings.tsx`)
- Agrupar os cards em duas seções: **WhatsApp** e **E-mail**.
- Para templates de e-mail, dois campos (Assunto e Corpo) que serializam para `assunto\n---\n corpo` no `body`.
- Mostrar a lista correta de variáveis disponíveis por template (não a lista genérica atual).
- Pequeno preview com variáveis substituídas por exemplos.

## Variáveis suportadas
`{client_name}`, `{title}`, `{amount}`, `{due_date}`, `{link}`, `{company_name}`, `{transport_code}`, `{days_overdue}`.

## Fora de escopo
- Editor rich-text para e-mail (mantém texto puro com cabeçalho/rodapé fixos da marca).
- Anexos no e-mail (não suportado pela infra; podemos colocar link do documento).
- Templates por idioma.
- Templates de mudança de status de transporte (posso adicionar depois se quiser).

## Pontos de atenção
- O setup de e-mail exige verificação DNS — o envio só sai depois que o domínio estiver ativo, mas a edição dos textos já fica disponível na hora.
- Edição da `message_templates` continua restrita a admin (RLS atual mantida).
