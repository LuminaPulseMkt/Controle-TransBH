## Objetivo
Substituir o conteúdo da cláusula/observações dos contratos em `src/lib/document-templates.ts` pelas 7 cláusulas fornecidas (PRIMEIRA a SÉTIMA), para que todo contrato gerado já saia com esse texto padrão.

## Onde alterar
- Arquivo único: `src/lib/document-templates.ts`
- Campo: `defaults.notes` dos 3 modelos de contrato:
  - `contract-standard` (Contrato Padrão)
  - `contract-fragile` (Contrato Veículo Frágil)
  - `contract-express` (Contrato Entrega Expressa)

## O que será feito
1. Definir uma constante `CONTRACT_CLAUSES` com o texto exato enviado, formatado com quebras de linha entre as cláusulas (cada CLÁUSULA em parágrafo próprio, com título em maiúsculas seguido do corpo).
2. Em **Contrato Padrão**: substituir `notes` por `CONTRACT_CLAUSES` puro.
3. Em **Contrato Veículo Frágil**: `CONTRACT_CLAUSES` + parágrafo extra "Observações específicas: veículo de alto valor, transporte com cintas e proteções especiais; vistoria fotográfica detalhada na coleta e entrega."
4. Em **Contrato Entrega Expressa**: `CONTRACT_CLAUSES` + parágrafo extra "Observações específicas: entrega expressa em até 48h após a coleta; pagamento integral antecipado é condição para a coleta; em caso de atraso por responsabilidade da CONTRATADA, será concedido desconto proporcional."
5. Manter `service_value`, `insurance`, `extra` e `title` como estão hoje.

## Texto das cláusulas (preservado integralmente)
Será inserido exatamente o conteúdo enviado pelo usuário, organizado assim:

```text
CLÁUSULA PRIMEIRA – DO BEM A SER TRANSPORTADO
1.1 A CONTRATADA obriga-se a proceder o transporte do veículo …
[…texto integral…]

CLÁUSULA SEGUNDA – DOS SERVIÇOS
2.1 Quaisquer atrasos ocorridos por culpa do contratante …

CLÁUSULA TERCEIRA – DO SEGURO
A CONTRATADA, visando oferecer uma melhor proteção …
N° da apólice: 540 00320910. Seguradora: Tokio Marine. […]

CLÁUSULA QUARTA – PAGAMENTOS
Nenhuma avaria ou sinistro será motivo justificável …

CLÁUSULA QUINTA – DAS DISPOSIÇÕES FINAIS
A alteração de quaisquer cláusulas deste instrumento …

CLÁUSULA SEXTA – MULTAS
Na quebra de contrato de transporte será cobrado R$ 200,00 por veículo …

CLÁUSULA SÉTIMA – DAS CONDIÇÕES DO RECEBIMENTO DO OBJETO
A CONTRATADA não se responsabiliza pelo estado de limpeza …
```

## Observações
- Modelos customizados salvos no banco (`document_templates`) não serão afetados — só os 3 modelos fixos do código.
- Documentos já criados também não mudam; só novos contratos criados a partir desses modelos receberão o texto novo.
- Nenhuma migração de banco é necessária.

## Detalhes técnicos
- Editar apenas `DOCUMENT_TEMPLATES` em `src/lib/document-templates.ts`.
- Sem alteração em rotas, componentes, ou geração de PDF — o componente `DocumentView` já renderiza `notes` preservando quebras de linha.