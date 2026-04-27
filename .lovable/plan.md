# Campo de rastreio no editar transporte + envio ao cliente

Adicionar um campo **"Localização atual"** (rastreio) no diálogo de edição da aba Transportes, com histórico simples e botão para enviar a atualização ao cliente pelo WhatsApp.

## O que muda

### 1. Banco de dados (migration)

Adicionar duas colunas em `public.transports`:
- `current_location text` — última posição informada (ex.: "BR-381, km 412 — Betim/MG").
- `location_updated_at timestamptz` — quando foi atualizada (definido automaticamente quando `current_location` muda).

E criar uma tabela de histórico (opcional mas útil para timeline):
```sql
create table public.transport_location_updates (
  id uuid primary key default gen_random_uuid(),
  transport_id uuid not null references public.transports(id) on delete cascade,
  location text not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.transport_location_updates enable row level security;
-- mesmas policies de transports: authenticated view/insert, admin delete
```

### 2. Diálogo de edição (`src/routes/transports.index.tsx`)

Na seção de edição (perto de "Observações"), adicionar um bloco **"Rastreio / Localização atual"** com:
- `Input` "Localização atual" (preenche `current_location`).
- `Textarea` curto "Comentário do motorista" (opcional, vai pro histórico).
- Texto auxiliar mostrando "Última atualização: <data/hora>".
- Botão **"Salvar e notificar cliente no WhatsApp"** que:
  1. Salva o transporte normalmente (já atualiza `current_location` e `location_updated_at`).
  2. Insere uma linha em `transport_location_updates`.
  3. Abre `https://wa.me/<telefone>?text=<mensagem>` numa nova aba com mensagem pronta:
     > Olá {cliente}, atualização do transporte {código} ({placa}): seu veículo está em **{localização}**. Previsão de entrega: {data}. — TransBH
  4. Desabilitado se `client_phone` estiver vazio (com tooltip explicando).

O botão "Salvar" normal continua existindo — o novo botão fica ao lado, só dispara WhatsApp se a localização foi preenchida.

### 3. Página de detalhes (`src/routes/transports.$id.tsx`)

Adicionar um pequeno card **"Rastreio"** mostrando:
- `current_location` em destaque + `location_updated_at`.
- Lista (timeline) das últimas atualizações de `transport_location_updates`.
- Botão "Enviar última localização ao cliente" (mesma mensagem de WhatsApp).

### 4. Format/labels

Sem mudanças em `src/lib/format.ts` — só usar `dateBR` + um helper local pra hora.

## Arquivos alterados
- nova migration Supabase (coluna `current_location`, `location_updated_at`, tabela `transport_location_updates` + RLS).
- `src/routes/transports.index.tsx` — campo no form, lógica de salvar histórico, botão WhatsApp.
- `src/routes/transports.$id.tsx` — card de rastreio + timeline + botão WhatsApp.

## Observação importante
O envio é via **link `wa.me` aberto no navegador** (mesmo padrão já usado em `collections.tsx`). Não há envio automático server-side — o usuário confirma o envio no WhatsApp Web/app. Se você quiser envio **automático** (sem abrir o WhatsApp), precisaríamos integrar Twilio ou WhatsApp Business API; me avise que faço como passo seguinte.
