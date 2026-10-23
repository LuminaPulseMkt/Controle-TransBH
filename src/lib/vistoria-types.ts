import { PUBLIC_SITE_URL } from "@/lib/public-url";

// Listas padrão e tipos da Vistoria por acionamento (link público com token).

export type VistoriaKind = "coleta" | "entrega";
export type VistoriaStatus = "pendente" | "em_andamento" | "finalizada";

export const VISTORIA_KIND_LABEL: Record<VistoriaKind, string> = {
  coleta: "Coleta",
  entrega: "Entrega",
};

export const VISTORIA_STATUS_LABEL: Record<VistoriaStatus, string> = {
  pendente: "Aguardando preenchimento",
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
};

// ---- Questionário (estado de cada peça) -----------------------------------
export type PartState = "bom" | "danificado" | "inexistente" | "sem_teste";

export const PART_STATES: { value: PartState; label: string }[] = [
  { value: "bom", label: "Bom" },
  { value: "danificado", label: "Danificado" },
  { value: "inexistente", label: "Inexistente" },
  { value: "sem_teste", label: "Sem teste" },
];

export const PART_STATE_LABEL: Record<PartState, string> = {
  bom: "Bom",
  danificado: "Danificado",
  inexistente: "Inexistente",
  sem_teste: "Sem teste",
};

export const VISTORIA_PARTS: { key: string; label: string }[] = [
  { key: "documento", label: "Documento" },
  { key: "chave", label: "Chave" },
  { key: "teto", label: "Teto" },
  { key: "teto_solar", label: "Teto solar" },
  { key: "bagageiro_teto", label: "Bagageiro de teto" },
  { key: "capo", label: "Capô" },
  { key: "para_choque_diant", label: "Para-choque dianteiro" },
  { key: "para_choque_tras", label: "Para-choque traseiro" },
  { key: "para_brisa", label: "Para-brisa" },
  { key: "vidro_traseiro", label: "Vidro traseiro" },
  { key: "vidros_laterais", label: "Vidros laterais" },
  { key: "retrovisores", label: "Retrovisores" },
  { key: "farois", label: "Faróis" },
  { key: "lanternas", label: "Lanternas" },
  { key: "portas", label: "Portas" },
  { key: "porta_malas", label: "Tampa do porta-malas" },
  { key: "rodas", label: "Rodas / calotas" },
  { key: "banco_estofamento", label: "Bancos / estofamento" },
  { key: "painel", label: "Painel" },
  { key: "som", label: "Rádio / multimídia" },
  { key: "estepe", label: "Estepe" },
  { key: "macaco_chave_roda", label: "Macaco / chave de roda" },
  { key: "triangulo", label: "Triângulo" },
  { key: "tapetes", label: "Tapetes" },
];

// ---- Fotos -----------------------------------------------------------------
export interface PhotoSlot {
  key: string;
  label: string;
  required: boolean;
}

export const VISTORIA_PHOTOS: PhotoSlot[] = [
  { key: "frente", label: "Frente", required: true },
  { key: "traseira", label: "Traseira", required: true },
  { key: "lateral_esq", label: "Lateral esquerda", required: true },
  { key: "lateral_dir", label: "Lateral direita", required: true },
  { key: "diag_diant_esq", label: "Diagonal diant. esquerda", required: true },
  { key: "diag_diant_dir", label: "Diagonal diant. direita", required: true },
  { key: "diag_tras_esq", label: "Diagonal tras. esquerda", required: true },
  { key: "diag_tras_dir", label: "Diagonal tras. direita", required: true },
  { key: "teto", label: "Teto", required: true },
  { key: "hodometro", label: "Painel / hodômetro (KM)", required: true },
  { key: "pneu_diant_esq", label: "Pneu diant. esquerdo", required: true },
  { key: "pneu_diant_dir", label: "Pneu diant. direito", required: true },
  { key: "pneu_tras_esq", label: "Pneu tras. esquerdo", required: true },
  { key: "pneu_tras_dir", label: "Pneu tras. direito", required: true },
  { key: "chassi", label: "Chassi / placa", required: false },
];

export const VISTORIA_DOCUMENTS: PhotoSlot[] = [
  { key: "crlv", label: "Documento do veículo (CRLV)", required: false },
  { key: "doc_cliente", label: "Documento do cliente (RG/CNH)", required: false },
  { key: "outros", label: "Outros documentos", required: false },
];

// ---- Pneus -----------------------------------------------------------------
export const TIRE_SLOTS = [
  { key: "diant_esq", label: "Dianteiro esquerdo" },
  { key: "diant_dir", label: "Dianteiro direito" },
  { key: "tras_esq", label: "Traseiro esquerdo" },
  { key: "tras_dir", label: "Traseiro direito" },
  { key: "estepe", label: "Estepe" },
];

export const TIRE_STATES = ["Novo", "Bom", "Médio", "Ruim", "Careca"];

export const TIRE_BRANDS = [
  "Pirelli", "Goodyear", "Michelin", "Bridgestone", "Continental", "Dunlop",
  "Firestone", "Maxxis", "Kumho", "Hankook", "Yokohama", "Outra",
];

// ---- Combustível -----------------------------------------------------------
export const FUEL_STEPS = ["E", "1/4", "1/2", "3/4", "F"];

// ---- Dados da vistoria (jsonb `data`) -----------------------------------------
export interface VistoriaData {
  driver: {
    cpf: string;
    name: string;
    /** Veículo foi/vai em guincho/cegonha ou ficou em um pátio. */
    transport_mode: "caminhao" | "patio";
    tow_plate: string;
    patio_name: string;
    received_by: string;
    signature_url: string | null;
  };
  general: {
    interior_access: boolean | null;
    vehicle_working: boolean | null;
    crlv_present: boolean | null;
    km: string;
    fuel: number; // índice em FUEL_STEPS
    notes: string;
    tires: Record<string, { state: string; brand: string }>;
  };
  checks: Record<string, PartState>;
  photos: Record<string, string>;
  extra_photos: string[];
  documents: Record<string, string>;
  client: { cpf: string; name: string; email: string; signature_url: string | null };
  step?: number;
}

export function emptyVistoriaData(): VistoriaData {
  return {
    driver: { cpf: "", name: "", transport_mode: "caminhao", tow_plate: "", patio_name: "", received_by: "", signature_url: null },
    general: {
      interior_access: null,
      vehicle_working: null,
      crlv_present: null,
      km: "",
      fuel: 2,
      notes: "",
      tires: {},
    },
    checks: {},
    photos: {},
    extra_photos: [],
    documents: {},
    client: { cpf: "", name: "", email: "", signature_url: null },
    step: 0,
  };
}

/** Mescla dados salvos (possivelmente parciais) sobre o modelo vazio. */
export function normalizeVistoriaData(raw: unknown): VistoriaData {
  const base = emptyVistoriaData();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<VistoriaData>;
  return {
    driver: { ...base.driver, ...(r.driver ?? {}) },
    general: { ...base.general, ...(r.general ?? {}), tires: { ...(r.general?.tires ?? {}) } },
    checks: { ...(r.checks ?? {}) },
    photos: { ...(r.photos ?? {}) },
    extra_photos: Array.isArray(r.extra_photos) ? r.extra_photos : [],
    documents: { ...(r.documents ?? {}) },
    client: { ...base.client, ...(r.client ?? {}) },
    step: typeof r.step === "number" ? r.step : 0,
  };
}

export interface VistoriaTransportInfo {
  code: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  client_document: string | null;
  vehicle_plate: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_year: number | null;
  vehicle_chassis: string | null;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
}

export interface VistoriaPayload {
  id: string;
  kind: VistoriaKind;
  status: VistoriaStatus;
  data: unknown;
  expires_at: string;
  expired: boolean;
  finished_at: string | null;
  transport: VistoriaTransportInfo;
}

// ---- Validação por etapa -----------------------------------------------------
export function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export function formatCpf(s: string) {
  const d = onlyDigits(s).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function isValidCpf(s: string) {
  const d = onlyDigits(s);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function validateDriver(d: VistoriaData): string | null {
  if (d.driver.cpf.trim() && !isValidCpf(d.driver.cpf)) return "O CPF do motorista informado é inválido.";
  if (d.driver.name.trim().length < 3) return "Informe o nome do motorista.";
  if (d.driver.transport_mode === "patio") {
    if (d.driver.patio_name.trim().length < 2) return "Informe o nome do pátio.";
    if (d.driver.received_by.trim().length < 2) return "Informe quem recebeu o veículo no pátio.";
  } else if (d.driver.tow_plate.trim().length < 6) {
    return "Informe a placa do guincho/cegonha.";
  }
  if (!d.driver.signature_url) return "A assinatura do motorista é obrigatória.";
  return null;
}

export function validateGeneral(d: VistoriaData): string | null {
  const g = d.general;
  if (g.interior_access === null) return "Informe se houve acesso ao interior do veículo.";
  if (g.vehicle_working === null) return "Informe se o veículo está funcionando.";
  if (g.crlv_present === null) return "Informe se o CRLV foi apresentado.";
  if (!g.km.trim()) return "Informe a quilometragem.";
  return null;
}

export function validateChecks(d: VistoriaData): string | null {
  const missing = VISTORIA_PARTS.filter((p) => !d.checks[p.key]);
  if (missing.length > 0) return `Falta marcar o estado de: ${missing.map((m) => m.label).join(", ")}.`;
  return null;
}

export function validatePhotos(d: VistoriaData): string | null {
  const missing = VISTORIA_PHOTOS.filter((p) => p.required && !d.photos[p.key]);
  if (missing.length > 0) return `Fotos obrigatórias pendentes: ${missing.map((m) => m.label).join(", ")}.`;
  return null;
}

export function validateClient(d: VistoriaData): string | null {
  if (d.client.cpf.trim() && !isValidCpf(d.client.cpf)) return "O CPF informado é inválido.";
  if (d.client.name.trim().length < 3) return "Informe o nome do cliente.";
  if (d.client.email.trim() && !/^\S+@\S+\.\S+$/.test(d.client.email.trim())) return "O e-mail informado é inválido.";
  if (!d.client.signature_url) return "A assinatura do cliente é obrigatória.";
  return null;
}

// ---- Links e mensagens --------------------------------------------------------

export const vistoriaLink = (token: string) => `${PUBLIC_SITE_URL}/vistoria/${token}`;
export const vistoriaAccessPageLink = () => `${PUBLIC_SITE_URL}/vistoria`;

export function vistoriaMessage(opts: {
  clientName: string;
  kind: VistoriaKind;
  plate: string;
  token: string;
  accessCode: string;
}) {
  const kind = VISTORIA_KIND_LABEL[opts.kind].toLowerCase();
  return (
    `Olá ${opts.clientName}, segue o link da vistoria de ${kind} do veículo ${opts.plate}: ${vistoriaLink(opts.token)}\n\n` +
    `Se preferir, acesse ${vistoriaAccessPageLink()} e informe o código ${opts.accessCode} e a placa ${opts.plate}.`
  );
}

export interface RecipientTransport {
  code: string;
  client_name: string;
  client_phone: string | null;
  vehicle_plate: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  estimated_delivery?: string | null;
}

export interface RecipientLink {
  kind: VistoriaKind;
  token: string;
  access_code: string;
}

const brDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

/** Mensagem completa para quem vai coletar e/ou receber o veículo. */
export function vistoriaRecipientMessage(opts: {
  recipientName: string;
  transport: RecipientTransport;
  links: RecipientLink[];
}) {
  const { transport: t, links } = opts;
  const coleta = links.find((l) => l.kind === "coleta");
  const entrega = links.find((l) => l.kind === "entrega");
  const title = coleta && entrega ? "coleta e entrega" : coleta ? "coleta" : "entrega";
  const verb = coleta && entrega ? "coletar e entregar" : coleta ? "coletar" : "receber";
  const vehicle = [t.vehicle_brand, t.vehicle_model].filter(Boolean).join(" ").toUpperCase() || "VEÍCULO";
  const color = t.vehicle_color ? ` (${t.vehicle_color.toUpperCase()})` : "";
  const name = opts.recipientName.trim();

  const lines: string[] = [
    `🚨 Vistoria de ${title} — Transporte ${t.code}`,
    "",
    `Olá${name ? ` ${name}` : ""}, você vai ${verb} o veículo abaixo. Pedimos que faça a vistoria registrando o estado do veículo e a assinatura no momento ${coleta && entrega ? "de cada etapa" : coleta ? "da coleta" : "do recebimento"}.`,
    "",
    `Cliente: ${t.client_name.toUpperCase()}`,
  ];
  if (t.client_phone) lines.push(`Contato: ${t.client_phone}`);
  lines.push(
    "",
    `Veículo: ${vehicle}${color}`,
    `Placa: ${t.vehicle_plate.toUpperCase()}`,
    "",
    `Origem: ${t.origin_city} - ${t.origin_state}`,
    `Destino: ${t.destination_city} - ${t.destination_state}`,
  );
  if (t.estimated_delivery) lines.push(`Data limite para entrega: ${brDate(t.estimated_delivery)}`);
  lines.push("", "Documentos: CRLV do veículo, se disponível.");

  if (coleta) {
    lines.push(
      "",
      "📍 COLETA — na origem",
      "Ao chegar no local de origem, clique no link abaixo para iniciar a vistoria:",
      vistoriaLink(coleta.token),
    );
  }
  if (entrega) {
    lines.push(
      "",
      "🎯 ENTREGA — no destino",
      "Ao chegar no destino, clique no link abaixo para finalizar a vistoria:",
      vistoriaLink(entrega.token),
    );
  }

  const code =
    coleta && entrega
      ? `coleta ${coleta.access_code} / entrega ${entrega.access_code}`
      : (coleta ?? entrega)?.access_code ?? "";
  lines.push(
    "",
    "Os links expiram em 30 dias.",
    "",
    `Não conseguiu abrir pelo link? Acesse ${vistoriaAccessPageLink()} e informe a placa do veículo e o código: ${code}`,
  );
  return lines.join("\n");
}
