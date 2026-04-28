
# Página /feedback + Card de Entrega com colagem de 4 fotos

## 1. Corrigir 404 do link de satisfação

Criar `src/routes/feedback.tsx`:

- Lê `?ref=<código>&client=<nome>` da URL.
- Mostra nome do cliente, código do transporte, 5 estrelas clicáveis, campo de comentário opcional e botão "Enviar avaliação".
- Ao enviar:
  - Salva em `transport_feedback` (tabela já existe).
  - Se nota **4 ou 5** e `company_settings.google_review_url` estiver preenchido, redireciona automaticamente para o Google Reviews.
  - Se nota **1–3**, mostra tela de "Obrigado pelo retorno" sem redirect.
- Inclui `errorComponent` e `notFoundComponent` (padrão TanStack).

Em `src/routes/settings.tsx`: adicionar campo "Link Google Reviews" salvando em `company_settings.google_review_url` (coluna já existe).

## 2. Card de Entrega — colagem 2×2 com 4 fotos

Em `src/routes/social.tsx`, após escolher o transporte:

- Buscar até 4 linhas mais recentes de `transport_photos` daquele transporte.
- Mostrar abaixo do select uma faixa de miniaturas com as fotos disponíveis e checkbox para escolher exatamente quais 4 entram na colagem (pré-seleciona as 4 primeiras).
- Se houver menos de 4 fotos, preenche os slots vazios com um placeholder escuro com o ícone de câmera + texto "sem foto", para a colagem manter o formato 2×2.
- Aviso quando não houver nenhuma foto cadastrada: "Este transporte não tem fotos — adicione em Transportes".

## 3. Layout novo do card (1080×1080)

```text
+---------------------------+---------------------------+
|                           |                           |
|        FOTO 1             |        FOTO 2     [LOGO]  |  <- logo canto sup. direito
|                           |                           |
+---------------------------+---------------------------+
|                           |                           |
|        FOTO 3             |        FOTO 4             |
|                           |              [ CARIMBO ]  |  <- carimbo canto inf. direito
+---------------------------+---------------------------+
   origem → destino · placa · código (rodapé fino preto translúcido)
```

Detalhes:
- **Grade 2×2**: 4 `<img>` em `object-fit: cover`, separadas por uma linha fina branca de 4px.
- **Logo**: `<img src={company.logo_url}>` no canto superior direito, ~96px de altura, com leve drop-shadow. Fallback para texto "TransBH" se `logo_url` estiver vazio.
- **Carimbo "ENTREGUE COM SUCESSO"** no canto inferior direito, sobreposto à colagem:
  - Caixa rotacionada ~-12°, borda dupla verde escura (#1f5f3a), texto verde escuro em maiúsculas, fonte condensada, fundo branco translúcido.
  - Largura ~300px (tamanho médio).
- **Removido**: o emoji 🚗 e o texto grande "ENTREGA REALIZADA COM SUCESSO!" — agora a mensagem fica só no carimbo.
- **Rodapé**: barra fina preta translúcida na base com `origem → destino · placa · código` em branco para identificação, sem competir com o carimbo.
- Geração da PNG continua via `html-to-image` (`toPng`), bucket `transport-photos` já é público (CORS ok).

## 4. Logo da empresa

Cadastrada uma vez em **Configurações → Empresa** (campo `logo_url`). O card lê automaticamente. Como a logo ainda não foi anexada nesta mensagem, implemento o card com fallback de texto "TransBH"; quando você enviar a imagem eu faço o upload e configuro.

## Arquivos alterados

- **novo** `src/routes/feedback.tsx` — página de avaliação + redirect Google.
- `src/routes/social.tsx` — seletor das 4 fotos + novo layout de colagem do card (logo direita, carimbo direita, sem o texto antigo).
- `src/routes/settings.tsx` — campo "Link Google Reviews".

Sem novas migrações: `transport_feedback` e `google_review_url` já existem no banco.
