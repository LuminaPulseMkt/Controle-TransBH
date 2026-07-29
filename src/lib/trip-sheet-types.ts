export type TripDirection = "ida" | "volta";

export interface TripRow {
  direction: TripDirection;
  veiculo: string;
  placa: string;
  empresa: string;
  origem: string;
  destino: string;
  patio: string;
  pagamento: string;
}

export interface TripSheetData {
  title: string;
  sheet_date: string; // yyyy-mm-dd
  phone: string;
  rows: TripRow[];
}

export const emptyRow = (direction: TripDirection): TripRow => ({
  direction,
  veiculo: "",
  placa: "",
  empresa: "",
  origem: "",
  destino: "",
  patio: "",
  pagamento: "",
});

export const emptyTripSheet = (): TripSheetData => ({
  title: "Planilha de Viagem",
  sheet_date: new Date().toISOString().slice(0, 10),
  phone: "(61) 9.8275-5951",
  rows: [emptyRow("ida"), emptyRow("volta")],
});
