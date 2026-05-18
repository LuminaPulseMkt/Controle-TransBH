# Aba Checklists — modelo em branco idêntico ao PDF

## Objetivo
A aba `Checklists` na sidebar passa a abrir **direto no formulário em branco**, com layout visualmente idêntico ao PDF `CHECK_LIST_CARRO_UNIPORT_LOG`. O usuário preenche, salva e exporta PDF. A lista de checklists salvos vai para uma tela secundária acessível pelo botão "Histórico".

## Mudanças

### 1. Rota `/checklists` (`src/routes/checklists.tsx`)
- Deixa de ser uma listagem.
- Vira **editor de um novo checklist em branco** (estado local, sem criar registro no banco até clicar em Salvar).
- Topo da página com 3 ações:
  - **Salvar** — faz `insert` no `vehicle_checklists` e redireciona para `/checklists/$id`.
  - **Exportar PDF** — gera PDF do estado atual (sem precisar salvar).
  - **Histórico** — link para `/checklists/historico`.

### 2. Nova rota `/checklists/historico` (`src/routes/checklists.historico.tsx`)
- Move o conteúdo de listagem atual (busca, tabela, abrir, excluir) para cá.
- Mantém RLS e permissões existentes.

### 3. Rota `/checklists/$id` (`src/routes/checklists.$id.tsx`)
- Mantida como está (editor de checklist salvo, com Exportar PDF).

### 4. Reformatar `ChecklistForm.tsx` para refletir o PDF
Reescrita visual para espelhar o documento original:

```text
┌──────────────────────────────────────────────────────────┐
│  [LOGO]      CHECK LIST DE VEÍCULO                       │
├──────────────────────────────────────────────────────────┤
│  Cliente: __________________________________________      │
│  Placa: ______  Modelo: ______  DUT: ____  Cor: ____      │
│  KM: ______   Local: ______   Data: __/__/__  Hora: __:__ │
├──────────────────────────────────────────────────────────┤
│  INTERIOR DO VEÍCULO            │  COMBUSTÍVEL            │
│  □ DOCUMENTO ORIGINAL   OK/NOK  │  [0][1/4][1/2][3/4][C] │
│  □ CHAVE ORIGINAL       OK/NOK  ├─────────────────────────┤
│  □ CHAVE RESERVA        OK/NOK  │  PNEUS                  │
│  ... (12 itens em 2 colunas)    │  Pos │Medida│Marca│Cond │
│                                 │  DD  │      │     │     │
│                                 │  DE  │      │     │     │
│                                 │  TD/TE/Estepe ...       │
├──────────────────────────────────────────────────────────┤
│  OBSERVAÇÕES                                              │
│  [textarea grande]                                        │
├──────────────────────────────┬───────────────────────────┤
│  COLETA                      │  ENTREGA                  │
│  Motorista / RG              │  Motorista / RG           │
│  Cidade / UF                 │  Cidade / UF              │
│  ☐ De acordo                 │  ☐ De acordo              │
│  [Assinatura motorista]      │  [Assinatura motorista]   │
│  Responsável / RG            │  Responsável / RG         │
│  [Assinatura responsável]    │  [Assinatura responsável] │
│  Data / Hora                 │  Data / Hora              │
└──────────────────────────────┴───────────────────────────┘
```

Detalhes visuais:
- Cabeçalho com logo da empresa (lendo `company_settings.logo_url`) e título centralizado.
- Bordas finas separando blocos, igual ao PDF (`border` + cantos retos).
- Itens do interior em grade com checkboxes OK/NOK na lateral direita de cada linha.
- Pneus como tabela compacta (DD / DE / TD / TE / Estepe).
- Coleta e Entrega lado a lado em telas md+; empilham no mobile.
- Tudo em fundo branco / texto escuro para parecer um documento (mesmo no tema dark do app), envolto em `Card` com `bg-white text-black print:shadow-none`.

### 5. Sidebar
- Item "Checklists" continua apontando para `/checklists` (agora abre o formulário direto).

## Critérios de aceitação
- Ao clicar em "Checklists" na sidebar, abre um formulário **vazio**, idêntico ao PDF.
- Todos os campos do PDF são editáveis (texto, OK/NOK, pneus, combustível, observações, assinaturas digitais coleta+entrega).
- Botão **Salvar** persiste no banco e leva para `/checklists/$id`.
- Botão **Exportar PDF** gera o PDF mesmo sem salvar.
- Botão **Histórico** mostra a lista que existia antes (busca, abrir, excluir).
- O layout impresso/exportado é visualmente fiel ao modelo original.

## Fora de escopo
- Não muda schema do banco (`vehicle_checklists` já cobre todos os campos).
- Não altera o atalho a partir do detalhe do transporte.
- Não altera permissões/RLS.
