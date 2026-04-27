export const brl = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

export const dateBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
};

export const daysBetween = (from: Date, to: Date) =>
  Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

export const transportStatusLabel: Record<string, string> = {
  pending: "Pendente",
  in_transit: "Em Trânsito",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export const paymentStatusLabel: Record<string, string> = {
  paid: "Pago",
  partial: "Pago Parcial",
  pending: "Pendente",
  overdue: "Vencido",
  negotiated: "Negociado",
};

export const vehicleTypeLabel: Record<string, string> = {
  car: "Carro",
  motorcycle: "Moto",
  truck: "Caminhão",
  machinery: "Maquinário",
};
