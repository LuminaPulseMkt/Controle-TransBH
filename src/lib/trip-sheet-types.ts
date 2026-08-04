export type TripDirection = "ida" | "volta";

export interface TripRow {
  direction: TripDirection;
  veiculo: string;
  placa: string;
  empresa: string;
  origem: string;
  destino: string;
  patio: string;
  valor: string; // Renamed from pagamento
  pago: boolean; // New checkbox
  recebido_por: string; // New field
}

export interface ExpenseRow {
  id: string;
  description: string;
  value: string;
}

export interface TripSheetData {
  title: string;
  sheet_date: string; // yyyy-mm-dd
  return_date: string; // yyyy-mm-dd, New field
  phone: string;
  rows: TripRow[];
  expenses: ExpenseRow[]; // New section
}

export const emptyRow = (direction: TripDirection): TripRow => ({
  direction,
  veiculo: "",
  placa: "",
  empresa: "",
  origem: "",
  destino: "",
  patio: "",
  valor: "",
  pago: false,
  recebido_por: "",
});

export const emptyExpense = (): ExpenseRow => ({
  id: crypto.randomUUID(),
  description: "",
  value: "",
});

export const emptyTripSheet = (): TripSheetData => ({
  title: "Planilha de Viagem",
  sheet_date: new Date().toISOString().slice(0, 10),
  return_date: "",
  phone: "(61) 9.8275-5951",
  rows: [emptyRow("ida"), emptyRow("volta")],
  expenses: [],
});