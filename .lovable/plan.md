## Objetivo
Substituir o envio manual via `wa.me` por envio automático através da **Evolution API** (instância já hospedada pelo usuário), com gatilhos automáticos em pontos-chave e botão manual nas listas.

## Configuração necessária
Vou solicitar 3 secrets via `add_secret`:
- `EVOLUTION_API_URL` — URL base da instância (ex.: `https://evo.meudominio.com`)
- `EVOLUTION_API_KEY` — chave global/da instância
- `EVOLUTION_INSTANCE_NAME` — nome da instância configurada

## Arquitetura

### 1. Helper de envio (`src/server/whatsapp.server.ts`)
Função `sendWhatsAppText({ phone, text })` que:
- Lê os 3 secrets de `process.env`
- Normaliza o telefone (apenas dígitos, com DDI 55 quando faltar)
- Chama `POST {EVOLUTION_API_URL}/message/sendText/{INSTANCE}` com header `apikey` e body `{ number, text }`
- Trata erros (loga server-side; nunca vaza detalhes ao cliente)
- Endpoint compatível com Evolution API v2

### 2. Server function exposta (`src/server/whatsapp.functions.ts`)
`sendWhatsAppManual` protegida por `requireSupabaseAuth` — qualquer usuário autenticado pode disparar mensagem manual a partir dos botões.
Input validado com Zod (telefone obrigatório, texto até 4096 chars).

### 3. Gatilhos automáticos

**a) Ao criar orçamento** — `src/routes/documents.tsx`, função `save()`
Após inserir/atualizar um documento `doc_type === "budget"`, se houver `client_phone`, dispara:
> "Olá {cliente}! Segue o link do seu orçamento TransBH: {link}"

**b) Ao aceitar orçamento** — `src/server/accept-budget.functions.ts`
Após criar contrato/transport/receivable com sucesso, dispara para o cliente:
> "Olá {cliente}! Recebemos seu aceite. Contrato: {link_contrato}. Valor: R$ {valor} venc. {data}."
Erro de envio não bloqueia o aceite (try/catch silencioso, log no servidor).

**c) Cobranças (receivables)** — `src/routes/financial.tsx` ou `collections.tsx`
Adicionar botão "Cobrar via WhatsApp" em cada receivable pendente/atrasado que envia:
> "Olá {cliente}! Lembrete da cobrança TransBH: R$ {valor} com vencimento em {data}. Em caso de dúvida, fale conosco."

### 4. Botões manuais
Trocar a abertura de `wa.me` (atualmente em `documents.tsx` e `transports.index.tsx`) por chamada à server function `sendWhatsAppManual` com a mesma mensagem que já é montada hoje. Toast de sucesso/erro.
- Mantenho fallback: se Evolution falhar ou os secrets estiverem ausentes, abre `wa.me` como hoje.

## Fora de escopo
- Envio de mídia/PDF anexado (só texto por enquanto).
- Templates dinâmicos da tabela `message_templates` (você escolheu texto fixo).
- Webhook de status de entrega.
- Agendamento (cron) — só dispara nos eventos atuais e via botão.

## Pontos de atenção
- Telefones serão normalizados para `55DDDNNNNNNNNN`. Se o cliente já tiver `55` no início, não duplico.
- O envio em fluxos automáticos (criar orçamento, aceite) **nunca** quebra a operação principal — falha só vira log + toast leve.
