import { cn } from "@/lib/utils";
import { paymentStatusLabel, transportStatusLabel } from "@/lib/format";

const transportStyles: Record<string, string> = {
  aguardando_coleta: "bg-muted text-muted-foreground border-border",
  coletado_aguardando_embarque: "bg-info/15 text-info border-info/40",
  veiculo_patio_aguardando_retirada: "bg-warning/15 text-warning border-warning/40",
  finalizado: "bg-success/15 text-success border-success/40",
  cancelled: "bg-destructive/15 text-destructive border-destructive/40",
};

const paymentStyles: Record<string, string> = {
  paid: "bg-success/15 text-success border-success/40",
  partial: "bg-warning/15 text-warning border-warning/40",
  pending: "bg-muted text-muted-foreground border-border",
  overdue: "bg-destructive/15 text-destructive border-destructive/40",
  negotiated: "bg-info/15 text-info border-info/40",
};

export function TransportStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        transportStyles[status] ?? transportStyles.aguardando_coleta,
      )}
    >
      {transportStatusLabel[status] ?? status}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        paymentStyles[status] ?? paymentStyles.pending,
      )}
    >
      {paymentStatusLabel[status] ?? status}
    </span>
  );
}
