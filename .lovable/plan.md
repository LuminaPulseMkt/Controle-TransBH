# Página de Feedback + Card de Entrega com foto

Resolver dois itens em sequência: criar a página `/feedback` que hoje retorna 404, e refazer o card de entrega para usar a foto do carro como fundo, com logo da empresa e carimbo verde de "Entregue com sucesso".

## 1. Página `/feedback` (corrige 404)

Novo arquivo `src/routes/feedback.tsx`:

- Lê `?ref=<código>&client=<nome>` da URL.
- Mostra: nome do cliente, código do transporte, 5 estrelas para clicar, campo opcional de comentário e botão "Enviar avaliação".
- **Lógica de redirect (4–5 estrelas)**: ao enviar com nota 4 ou 5, salva e redireciona automaticamente para o Google Reviews da empresa. Notas 1–3 ficam só no formulário interno com agradecimento e (opcional) abertura do WhatsApp para contato.
- URL do Google Reviews vem do `company_settings.google_review_url` (campo novo — ver migração abaixo). Se não estiver preenchido, mostra apenas tela de "Obrigado" sem redirect.

### Migração

Adicionar duas colunas em `company_settings`:
- `google_review_url text` — link público do Google Reviews para redirect.
- `logo_url` já existe (será usado no card também).

Criar tabela nova `transport_feedback` para armazenar avaliações:

| coluna | tipo |
|---|---|
| id | uuid PK |
| transport_code | text |
| client_name | text |
| rating | int (1–5) |
| comment | text null |
| created_at | timestamptz default now() |

RLS:
- INSERT público (anon + authenticated) — qualquer pessoa com o link pode avaliar.
- SELECT só para administradores.

### Configurações
Em `src/routes/settings.tsx` adicionar campo "Link Google Reviews" para o admin colar a URL.

## 2. Foto do carro no card de entrega

Em `src/routes/social.tsx`:

- Ao escolher um transporte, buscar todas as linhas de `transport_photos` daquele transporte.
- Mostrar uma faixa horizontal de miniaturas abaixo do select. Clique seleciona a foto que vai virar o fundo do card.
- Se não houver fotos, mostrar aviso "Este transporte não tem fotos cadastradas — adicione em Transportes".

## 3. Redesenho do card

Layout do `cardRef` (1080×1080, mesma proporção atual):

```text
+-----------------------------------------+
| [LOGO]                                  |  <- canto sup. esquerdo
|                                         |
|         (foto do carro cobrindo         |
|          todo o fundo, object-fit:      |
|          cover, com leve gradiente      |
|          escuro embaixo p/ legibilidade)|
|                                         |
| origem → destino                        |
| placa · código              [ CARIMBO ] |  <- carimbo no canto inf. direito
+-----------------------------------------+
```

Detalhes:
- **Foto de fundo**: `<img src={selectedPhoto}>` em `position:absolute; inset:0; width:100%; height:100%; object-fit:cover`.
- **Overlay**: gradiente escuro só na metade inferior para o texto branco continuar legível.
- **Logo**: `<img src={company.logo_url}>` no canto superior esquerdo, altura ~60–72px, com leve sombra. Se não houver logo, fallback para o texto "TransBH" em Bebas Neue (atual).
- **Carimbo "ENTREGUE COM SUCESSO"** no canto inferior direito:
  - Caixa rotacionada ~-12°, borda dupla verde escura (#1f5f3a), texto verde escuro em maiúsculas, fonte serif/condensed, fundo translúcido branco/cremoso.
  - Tamanho médio (~280px de largura).
- Texto de origem→destino e placa permanecem no canto inferior esquerdo, em branco com sombra.
- Geração da PNG continua via `html-to-image` (`toPng` já em uso) — funciona com `<img>` cross-origin desde que o bucket `transport-photos` seja público (já é).

## 4. Logo da empresa

A logo deve ser cadastrada uma única vez em **Configurações → Empresa** (campo `logo_url` já existe; verificar se o input está exposto — caso não esteja, adicionar upload simples para o bucket `company-assets`). O card lê automaticamente de `company_settings.logo_url`.

> Observação: você mencionou que enviaria a logo agora, mas ela não veio anexada nesta mensagem. Implemento o card com fallback para texto e, assim que você enviar a imagem, faço o upload e a configuro nas configurações da empresa.

## Arquivos alterados

- **novo** `src/routes/feedback.tsx` — página de avaliação + redirect Google.
- **novo** `supabase/migrations/<timestamp>_feedback_and_logo.sql` — coluna `google_review_url`, tabela `transport_feedback` + RLS.
- `src/routes/social.tsx` — seletor de fotos + redesenho completo do card.
- `src/routes/settings.tsx` — campo "Link Google Reviews" (e upload de logo se ainda não houver).

Sem mudança no card antigo de Link de Satisfação além de continuar apontando para `/feedback` (que agora existe).
