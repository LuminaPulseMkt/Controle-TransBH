## Contexto

Hoje, em `src/routes/social.tsx`, o card "Redes Sociais" contém 4 links **hardcoded** apontando para contas fixas:

- `https://instagram.com/TransBH`
- `https://facebook.com/TransBH`
- `https://wa.me/` (vazio)
- `https://business.google.com` (genérico)

Não existe nenhuma integração OAuth, token armazenado ou publicação automática — apenas links estáticos. "Desconectar" aqui significa **remover os links fixos** e deixar que o admin configure as URLs próprias dele (ou abra em branco para cada um logar manualmente nas plataformas oficiais).

## Plano

### 1. Banco — adicionar campos sociais em `company_settings`

Migration adicionando 4 colunas nullable em `public.company_settings`:

- `instagram_url text`
- `facebook_url text`
- `whatsapp_url text`
- `google_business_url text`

Como já existe a linha de configurações da empresa, os valores começam `NULL` (= "não configurado"). Sem alteração de RLS — a tabela já permite leitura/escrita para administradores.

### 2. Página `/settings` — nova seção "Redes Sociais"

Em `src/routes/settings.tsx`, adicionar 4 inputs (apenas para administradores, padrão da página):

- Instagram (URL completa)
- Facebook (URL completa)
- WhatsApp (link `wa.me/55...` ou número)
- Google Business (link do perfil)

Cada campo tem placeholder explicativo e é salvo junto com os demais campos via o botão "Salvar" já existente.

### 3. Página `/social` — substituir links fixos por dinâmicos

Em `src/routes/social.tsx`:

- Carregar `instagram_url`, `facebook_url`, `whatsapp_url`, `google_business_url` junto com `logo_url`.
- Renderizar cada `SocialLink` apenas se a URL estiver preenchida.
- Se **nenhuma** rede estiver configurada, mostrar estado vazio:  
  *"Nenhuma rede social configurada. Configure as URLs em Configurações → Redes Sociais."* com botão "Ir para Configurações".
- Cada link continua abrindo em nova aba (`target="_blank"`), assim o admin loga manualmente na plataforma oficial quando precisar.

### 4. Sem mudança na logo

A logo continua transparente sobre o cabeçalho azul-escuro (`#0d1b2a`), conforme você confirmou.

## Detalhes técnicos

- Migration única em `supabase/migrations/` com 4 `ALTER TABLE ADD COLUMN`.
- `src/integrations/supabase/types.ts` é regenerado automaticamente após a migration.
- Sem novos secrets, sem edge functions, sem OAuth.

## Fora de escopo

- Integração OAuth real com Instagram/Facebook/Google (publicação automática) — não existe hoje e você não pediu para criar.
- Mudanças no card de "Entrega Concluída" (continua usando a logo da empresa normalmente).
- Mudanças na logo, no cabeçalho ou em outras páginas.
