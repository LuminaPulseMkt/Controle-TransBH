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
  aguardando_coleta: "Aguardando coleta",
  coletado_aguardando_embarque: "Coletado - aguardando embarque",
  veiculo_patio_aguardando_retirada: "Veículo em pátio - aguardando retirada",
  finalizado: "Finalizado",
  cancelled: "Cancelado",
};

export const paymentStatusLabel: Record<string, string> = {
  paid: "Pago",
  partial: "Pago Parcial",
  pending: "Pendente",
  overdue: "Vencido",
  negotiated: "Negociado",
};

export const waLink = (phone: string | null | undefined, text?: string) => {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${withCountry}${query}`;
};

export const vehicleTypeLabel: Record<string, string> = {
  motorcycle: "Moto",
  sedan: "Sedan",
  hatch: "Hatch",
  caminhonete: "Caminhonete",
  suv: "SUV",
};
