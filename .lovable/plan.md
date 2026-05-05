## Objetivo

Criar uma área de **Parceiros** (motoristas terceirizados que costumam fazer cotações), com cadastro de valor padrão por parceiro e ação de **enviar transporte/orçamento aprovado direto pelo WhatsApp** ao parceiro escolhido.

## Funcionalidades

1. **Cadastro de parceiros** (CRUD) com:
   - Nome, telefone/WhatsApp, documento (CPF/CNPJ, opcional)
   - Cidade base, regiões/rotas que costuma atender (texto livre)
   - Valor médio cobrado (numérico) + observação de tabela (texto)
   - Status ativo/inativo, observações

2. **Atribuição de parceiro a um transporte**
   - Na tela de detalhe do transporte (`transports.$id.tsx`), novo bloco "Parceiro responsável" com select de parceiros ativos.
   - Salva `partner_id` em `transports`.
   - Mostra valor cotado padrão e permite sobrescrever (`partner_quoted_amount`).

3. **Enviar para WhatsApp do parceiro**
   - Botão "Enviar ao parceiro" na tela do transporte e também no documento (orçamento) quando aceito.
   - Usa `sendWhatsAppManual` (já existe) com mensagem montada a partir de um novo template `wa_partner_assignment` em `message_templates`, com variáveis: `{partner_name}`, `{transport_code}`, `{client_name}`, `{origin}`, `{destination}`, `{vehicle}`, `{partner_amount}`, `{notes}`, `{tracking_link}`.

4. **Indicação automática a partir do orçamento aceito**
   - Em `documents.tsx`/aceite, se o documento aceito gerou um transporte e há um parceiro pré-selecionado, oferecer "Compartilhar com parceiro" no modal pós-aceite.

## Banco de dados (migration)

```sql
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  whatsapp text,
  document text,
  base_city text,
  routes text,                  -- regiões/rotas que costuma atender
  default_amount numeric DEFAULT 0,
  pricing_notes text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transports
  ADD COLUMN partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN partner_quoted_amount numeric,
  ADD COLUMN partner_notified_at timestamptz;
```

RLS:
- `SELECT`: qualquer autenticado com permissão `partners.view`.
- `INSERT/UPDATE/DELETE`: somente admins ou usuários com `partners.manage`.
- Trigger `updated_at`.

Seed do template:
```sql
INSERT INTO public.message_templates (key,label,body) VALUES
('wa_partner_assignment','WhatsApp - Atribuição a parceiro',
 'Olá {partner_name}! Tenho um transporte para você:\n\nCódigo: {transport_code}\nCliente: {client_name}\nVeículo: {vehicle}\nRota: {origin} → {destination}\nValor combinado: {partner_amount}\n\nObs: {notes}\n\nAcompanhe: {tracking_link}');
```

## Permissões (estende `src/lib/permissions.ts`)

Novas chaves:
- `partners.view` — ver lista de parceiros e atribuir a transporte.
- `partners.manage` — criar/editar/excluir parceiros.

Defaults colaborador: `partners.view: true`, `partners.manage: false`.

## Front-end

**Nova rota** `src/routes/partners.tsx`
- Lista (tabela) com nome, telefone, cidade base, valor médio, status.
- Modal "Novo/Editar parceiro" com todos os campos.
- Ações: editar, ativar/inativar, excluir, enviar mensagem teste WhatsApp.
- Protegida por `requirePermission="partners.view"`.

**Sidebar** (`AppSidebar.tsx`)
- Novo item "Parceiros" entre Transportes e Financeiro, com `permission: "partners.view"` e ícone `Handshake` (lucide).

**Detalhe do transporte** (`transports.$id.tsx`)
- Card "Parceiro responsável":
  - Select de parceiros ativos.
  - Campo valor (preenche com `default_amount`, editável).
  - Botão **"Enviar ao parceiro via WhatsApp"** → renderiza template `wa_partner_assignment`, abre `sendWhatsAppManual`, salva `partner_notified_at`.
  - Mostra "Notificado em: …" quando aplicável.
  - Esconde valores se `!can("values.view")`.

**Aceite de orçamento** (fluxo de `accept-budget`)
- No diálogo pós-aceite (admin), botão "Encaminhar para parceiro" abrindo o mesmo seletor.

**Settings → Templates de mensagem**
- O novo template aparece automaticamente, editável pelo admin (já existe a tela).

## Arquivos a criar/editar

- Nova migration: `partners` + colunas em `transports` + RLS + template seed
- Novo: `src/routes/partners.tsx`, `src/components/PartnerDialog.tsx`, `src/components/PartnerSelectCard.tsx`
- Editar: `src/lib/permissions.ts`, `src/components/AppSidebar.tsx`, `src/routes/transports.$id.tsx`, `src/routes/documents.tsx` (botão pós-aceite)
- Sem mudança em server functions (reaproveita `sendWhatsAppManual`)

Posso aplicar?
