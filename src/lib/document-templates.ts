// Modelos pré-prontos para Orçamentos e Contratos.
// Cada modelo já preenche título, valores sugeridos e observações/cláusulas,
// deixando ao usuário apenas o preenchimento dos dados de cliente, veículo e rota.

export type DocTemplateKind = "budget" | "contract";
export type TemplateKey = "standard" | "fragile" | "express";

export interface DocTemplate {
  id: string;
  kind: DocTemplateKind;
  // chave persistida em documents.template (apenas para contratos é exigida pelo enum)
  templateKey: TemplateKey;
  name: string;
  description: string;
  // marca se é um modelo customizado (vindo do banco) ou fixo
  isCustom?: boolean;
  defaults: {
    title: string;
    service_value: string;
    insurance: string;
    extra: string;
    notes: string;
  };
}

const CONTRACT_CLAUSES =
  "CLÁUSULA PRIMEIRA – DO BEM A SER TRANSPORTADO\n" +
  "1.1 A CONTRATADA obriga-se a proceder o transporte do veículo do presente instrumento, devendo ser considerado e observado todos os defeitos e avarias apontados, conforme vistoria ou fotos. A CONTRATADA não se responsabiliza por qualquer objeto ou pertences pessoais transportados junto ao veículo. A CONTRATADA não se responsabiliza pelo não funcionamento do veículo em decorrência de travamento de motor, descarregamento de bateria, vícios ou defeitos ocultos na parte elétrica ou mecânica. Em caso de avaria no veículo transportado, a CONTRATADA se responsabilizará pelo conserto utilizando sua rede credenciada.\n\n" +
  "CLÁUSULA SEGUNDA – DOS SERVIÇOS\n" +
  "2.1 Quaisquer atrasos ocorridos por culpa do CONTRATANTE serão repassados a este, os custos decorrentes de tal atraso, conforme tarifas vigentes, a que se refere os 5 (cinco) dias de atraso.\n\n" +
  "CLÁUSULA TERCEIRA – DO SEGURO\n" +
  "A CONTRATADA, visando oferecer uma melhor proteção do veículo transportado, compromete-se a contratar seguro que tem por objeto os danos materiais que ocorram durante o transporte e sejam causados diretamente por: colisão, e/ou capotagem e/ou abalroamento e/ou tombamento do veículo transportador, incêndio ou explosão no veículo transportado. Para efeito de cobertura de seguro, o CONTRATANTE declara que os valores constantes na solicitação correspondem ao valor real do veículo no mercado, e servirão como base para todos os efeitos de indenização, não se levando em conta valores estimativos ou sentimentais, obedecendo-se sempre a tabela de mercado. Os valores declarados representam, em qualquer hipótese, o limite de responsabilidade da CONTRATADA e da SEGURADORA, que poderão exigir a prova do veículo transportado. Nº da apólice: 540 00320910. Seguradora: Tokio Marine. Os bens segurados são avaliados, pela seguradora, de acordo com a tabela FIPE. VEÍCULOS DE LEILÃO SÃO AVALIADOS, PELA SEGURADORA, DE ACORDO COM O VALOR DA NOTA. Caso o CONTRATANTE opte por assegurar o veículo com outra seguradora, a CONTRATADA não será responsável por eventuais avarias ou sinistros ocorridos em decorrência do transporte, devendo em qualquer hipótese fornecer o valor do veículo transportado. Para fins de indenização/seguro, a CONTRATADA não será responsável pela perda do veículo em função de arresto, sequestro, penhora com remoção, busca e apreensão ou qualquer outra medida judicial que recaia sobre ele.\n\n" +
  "CLÁUSULA QUARTA – PAGAMENTOS\n" +
  "Nenhuma avaria ou sinistro será motivo justificável para que o CONTRATANTE retenha os valores pactuados; contudo, o pagamento poderá ser efetuado após a devida reparação e entrega do veículo pela CONTRATADA. O pagamento será creditado pelo CONTRATANTE, em nome da CONTRATADA, mediante ordem bancária em conta corrente.\n\n" +
  "CLÁUSULA QUINTA – DAS DISPOSIÇÕES FINAIS\n" +
  "A alteração de quaisquer cláusulas deste instrumento só poderá ser feita através de aditamento, mediante a concordância e assinatura em termo próprio pelo CONTRATANTE e pela CONTRATADA. Fica eleito o foro da sede da CONTRATADA, com a renúncia de qualquer outro, por mais privilegiado que seja, para dirimir quaisquer dúvidas que forem suscitadas em decorrência do presente instrumento.\n\n" +
  "CLÁUSULA SEXTA – MULTAS\n" +
  "Na quebra de contrato de transporte será cobrado o valor de R$ 200,00 por veículo. O CONTRATANTE terá o prazo de 3 dias úteis para retirada do veículo após a chegada ao destino; depois do prazo vencido será cobrada estadia de R$ 50,00 por dia.\n\n" +
  "CLÁUSULA SÉTIMA – DAS CONDIÇÕES DO RECEBIMENTO DO OBJETO\n" +
  "A CONTRATADA não se responsabiliza pelo estado de limpeza do objeto transportado, tendo em vista que irá acondicionado, em sua maioria, em equipamentos com carroceria aberta. Em referência ao uso, funcionamento e manobras do objeto, sendo veículo automotor, pela CONTRATADA para fins de carregamento, descarregamento ou traslados de balsas autorizados pelo CONTRATANTE, caso supere o anotado em check list 50 km (cinquenta quilômetros), será automaticamente de responsabilidade da CONTRATADA a indenização em favor do CONTRATANTE no valor de R$ 0,72 (setenta e dois centavos) por km rodado. Em caso de avaria no veículo, fica desde já autorizada a utilização de peças novas, originais ou não, nacionais ou importadas, ou peças usadas, observadas as disposições da Lei nº 12.977/2014, que regula e disciplina a atividade de desmontagem de veículos automotores terrestres. Havendo avaria no bem, o CONTRATANTE concorda que eventuais reparos sejam realizados na rede credenciada da CONTRATADA, a qual arcará com os custos.";

export const DOCUMENT_TEMPLATES: DocTemplate[] = [
  // ---------- ORÇAMENTOS ----------
  {
    id: "budget-standard",
    kind: "budget",
    templateKey: "standard",
    name: "Orçamento Padrão",
    description: "Frete simples para carros e motos em rotas regionais.",
    defaults: {
      title: "Orçamento de Transporte — Padrão",
      service_value: "1500",
      insurance: "0",
      extra: "0",
      notes:
        "Validade da proposta: 7 dias.\n" +
        "Forma de pagamento: 50% na coleta e 50% na entrega.",

    },
  },
  {
    id: "budget-fragile",
    kind: "budget",
    templateKey: "fragile",
    name: "Orçamento Veículo Frágil",
    description: "Para veículos de coleção, importados ou de alto valor.",
    defaults: {
      title: "Orçamento de Transporte — Veículo Frágil",
      service_value: "2800",
      insurance: "0",
      extra: "150",
      notes:
        "Inclui transporte com cinta especial e cobertura de carroceria.\n" +
        "Validade da proposta: 7 dias.",
    },
  },
  {
    id: "budget-express",
    kind: "budget",
    templateKey: "express",
    name: "Orçamento Entrega Expressa",
    description: "Coleta e entrega prioritária em até 48h.",
    defaults: {
      title: "Orçamento de Transporte — Entrega Expressa",
      service_value: "2200",
      insurance: "0",
      extra: "300",
      notes:
        "Entrega expressa em até 48h após confirmação.\n" +
        "Pagamento integral antecipado.\n" +
        "Validade da proposta: 3 dias.",
    },
  },

  // ---------- CONTRATOS ----------
  {
    id: "contract-standard",
    kind: "contract",
    templateKey: "standard",
    name: "Contrato Padrão",
    description: "Modelo padrão de contrato de transporte de veículo.",
    defaults: {
      title: "Contrato de Transporte de Veículo — Padrão",
      service_value: "1500",
      insurance: "0",
      extra: "0",
      notes: CONTRACT_CLAUSES,
    },
  },
  {
    id: "contract-fragile",
    kind: "contract",
    templateKey: "fragile",
    name: "Contrato Veículo Frágil",
    description: "Cláusulas específicas para veículos de alto valor.",
    defaults: {
      title: "Contrato de Transporte — Veículo Frágil",
      service_value: "2800",
      insurance: "450",
      extra: "150",
      notes:
        CONTRACT_CLAUSES +
        "\n\nOBSERVAÇÕES ESPECÍFICAS — VEÍCULO FRÁGIL\n" +
        "Veículo de alto valor / coleção: transporte realizado com cintas e proteções especiais. Vistoria fotográfica detalhada na coleta e na entrega.",
    },
  },
  {
    id: "contract-express",
    kind: "contract",
    templateKey: "express",
    name: "Contrato Entrega Expressa",
    description: "Compromisso de entrega prioritária em 48h.",
    defaults: {
      title: "Contrato de Transporte — Entrega Expressa",
      service_value: "2200",
      insurance: "200",
      extra: "300",
      notes:
        CONTRACT_CLAUSES +
        "\n\nOBSERVAÇÕES ESPECÍFICAS — ENTREGA EXPRESSA\n" +
        "Entrega expressa em até 48 horas após a coleta. Pagamento integral antecipado é condição para a coleta. Em caso de atraso por responsabilidade da CONTRATADA, será concedido desconto proporcional.",
    },
  },
];

// Converte uma linha do banco em DocTemplate
export interface DBTemplateRow {
  id: string;
  kind: DocTemplateKind;
  template_key: TemplateKey;
  name: string;
  description: string | null;
  title: string;
  service_value: number | string;
  insurance: number | string;
  extra: number | string;
  notes: string;
}

export function dbRowToTemplate(row: DBTemplateRow): DocTemplate {
  return {
    id: row.id,
    kind: row.kind,
    templateKey: row.template_key,
    name: row.name,
    description: row.description ?? "",
    isCustom: true,
    defaults: {
      title: row.title,
      service_value: String(row.service_value ?? ""),
      insurance: String(row.insurance ?? ""),
      extra: String(row.extra ?? ""),
      notes: row.notes ?? "",
    },
  };
}
