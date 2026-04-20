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
        "Forma de pagamento: 50% na coleta e 50% na entrega.\n" +
        "Prazo estimado: até 5 dias úteis após a coleta.",
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
      insurance: "450",
      extra: "150",
      notes:
        "Inclui transporte com cinta especial e cobertura de carroceria.\n" +
        "Seguro com cobertura ampla incluso.\n" +
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
      insurance: "200",
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
      notes:
        "1. O CONTRATADO se responsabiliza pelo transporte do veículo descrito acima entre os locais de origem e destino.\n" +
        "2. O CONTRATANTE declara que o veículo está em condições de transporte e devidamente documentado.\n" +
        "3. O pagamento será realizado conforme as condições acordadas: 50% na coleta e 50% na entrega.\n" +
        "4. Prazo estimado de entrega: até 5 dias úteis após a coleta.",
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
        "1. O veículo será transportado com cintas e proteções especiais para veículos de coleção/alto valor.\n" +
        "2. Está incluso seguro com cobertura ampla durante todo o trajeto.\n" +
        "3. Carregamento e descarregamento serão acompanhados por vistoria fotográfica detalhada.\n" +
        "4. O CONTRATANTE declara estar ciente das características frágeis do veículo.",
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
        "1. O CONTRATADO compromete-se com a entrega expressa em até 48 horas após a coleta.\n" +
        "2. Pagamento integral antecipado é condição para a coleta.\n" +
        "3. Em caso de atraso por responsabilidade do CONTRATADO, será concedido desconto proporcional.\n" +
        "4. Coleta e entrega ocorrerão em horário comercial, salvo acordo prévio.",
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
