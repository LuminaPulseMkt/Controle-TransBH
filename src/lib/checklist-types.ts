export const CHECKLIST_ITEMS = [
  "DOCUMENTO ORIGINAL",
  "CHAVE ORIGINAL",
  "CHAVE RESERVA",
  "CONTROLE DO ALARME",
  "MANUAL USO / MANUTENÇÃO",
  "EXTINTOR",
  "TRIÂNGULO",
  "CHAVE DE RODA",
  "MACACO",
  "RÁDIO",
  "CD PLAYER",
  "BATERIA",
] as const;

export type ChecklistItemKey = (typeof CHECKLIST_ITEMS)[number];
export type ItemStatus = "ok" | "nok" | null;
export type TireCondition = "bom" | "medio" | "ruim" | "furado" | null;
export type FuelLevel = "0" | "1/4" | "1/2" | "3/4" | "cheio" | null;

export const TIRE_POSITIONS = [
  "Dianteiro Direito",
  "Dianteiro Esquerdo",
  "Traseiro Direito",
  "Traseiro Esquerdo",
  "Estepe",
] as const;

export type TirePosition = (typeof TIRE_POSITIONS)[number];

export interface TireRow {
  position: TirePosition;
  size: string;
  brand: string;
  condition: TireCondition;
}

export interface PartySection {
  driver_name: string;
  driver_rg: string;
  city: string;
  state: string;
  agreed: boolean;
  signature_url: string | null;
  responsible_name: string;
  responsible_rg: string;
  responsible_signature_url: string | null;
  date: string;
  time: string;
}

export interface ChecklistData {
  client_name: string;
  plate: string;
  model: string;
  dut: string;
  color: string;
  km: string;
  location: string;
  checklist_date: string;
  checklist_time: string;
  items: Record<string, ItemStatus>;
  tires: TireRow[];
  fuel_level: FuelLevel;
  observations: string;
  pickup: PartySection;
  delivery: PartySection;
}

export function emptyParty(): PartySection {
  return {
    driver_name: "",
    driver_rg: "",
    city: "",
    state: "",
    agreed: false,
    signature_url: null,
    responsible_name: "",
    responsible_rg: "",
    responsible_signature_url: null,
    date: "",
    time: "",
  };
}

export function emptyChecklist(): ChecklistData {
  return {
    client_name: "",
    plate: "",
    model: "",
    dut: "",
    color: "",
    km: "",
    location: "",
    checklist_date: new Date().toISOString().slice(0, 10),
    checklist_time: new Date().toTimeString().slice(0, 5),
    items: Object.fromEntries(CHECKLIST_ITEMS.map((k) => [k, null])),
    tires: TIRE_POSITIONS.map((position) => ({
      position,
      size: "",
      brand: "",
      condition: null,
    })),
    fuel_level: null,
    observations: "",
    pickup: emptyParty(),
    delivery: emptyParty(),
  };
}
