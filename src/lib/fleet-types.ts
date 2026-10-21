import type { ExpenseRow } from "@/lib/trip-sheet-types";

export type FleetKind = "carreta" | "guincho";

export const FLEET_KIND_LABEL: Record<FleetKind, string> = {
  carreta: "Carreta",
  guincho: "Guincho",
};

export interface FleetVehicle {
  id: string;
  kind: FleetKind;
  plate: string;
  model: string | null;
  year: number | null;
  capacity: string | null;
  driver_name: string | null;
  daily_rate: number | null;
  notes: string | null;
  is_active: boolean;
}

export const fleetLabel = (v: Pick<FleetVehicle, "plate" | "model">) =>
  [v.plate, v.model].filter(Boolean).join(" · ");

/** Uma linha da planilha de guincho = um DIA de trabalho (não uma viagem). */
export interface TowRow {
  id: string;
  date: string; // yyyy-mm-dd
  cliente: string;
  local: string;
  servico: string; // o que foi feito no dia
  veiculos: string; // placas/veículos atendidos no dia
  valor: string; // diária
  pago: boolean;
  recebido_por: string;
}

export interface TowSheetData {
  title: string;
  fleet_vehicle_id: string | null;
  driver_name: string;
  period_start: string; // yyyy-mm-dd
  period_end: string; // yyyy-mm-dd
  phone: string;
  rows: TowRow[];
  expenses: ExpenseRow[];
}

export const emptyTowRow = (date = new Date().toISOString().slice(0, 10), valor = ""): TowRow => ({
  id: crypto.randomUUID(),
  date,
  cliente: "",
  local: "",
  servico: "",
  veiculos: "",
  valor,
  pago: false,
  recebido_por: "",
});

export const emptyTowSheet = (): TowSheetData => ({
  title: "Planilha de Guincho",
  fleet_vehicle_id: null,
  driver_name: "",
  period_start: new Date().toISOString().slice(0, 10),
  period_end: "",
  phone: "(61) 9.8275-5951",
  rows: [],
  expenses: [],
});

export const num = (v: string | number | null | undefined) => parseFloat(String(v ?? "").replace(",", ".")) || 0;
export const brlText = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
