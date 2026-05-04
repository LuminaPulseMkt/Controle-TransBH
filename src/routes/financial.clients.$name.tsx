import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentStatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/format";
import { ArrowLeft, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { sendWhatsAppManual } from "@/server/whatsapp.functions";
import { renderFromDb } from "@/lib/message-templates";

export const Route = createFileRoute("/financial/clients/$name")({
  component: () => (
    <AuthGate adminOnly>
      <ClientReceivablesPage />
    </AuthGate>
  ),
});

interface Row {
  id: string;
  client_name: string;
  client_phone: string | null;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  description: string | null;
  transport_id: string | null;
  transports: {
    code: string;
    vehicle_plate: string;
    vehicle_brand: string | null;
    vehicle_model: string | null;
  } | null;
}

function ClientReceivablesPage() {
  const { name } = Route.useParams();
  const decoded = decodeURIComponent(name);
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("receivables")
      .select(
        "id, client_name, client_phone, amount, due_date, paid_at, status, description, transport_id, transports:transport_id(code, vehicle_plate, vehicle_brand, vehicle_model)",
      )
      .eq("client_name", decoded)
      .order("due_date", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Row[]);
  };

  useEffect(() => {
    void load();
  }, [decoded]);

  const markPaid = async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("receivables")
      .update({ status: "paid", paid_at: today })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cobrança marcada como paga.");
    void load();
  };

  const sendCharge = async (r: Row) => {
    const phone = (r.client_phone ?? "").replace(/\D/g, "");
    if (!phone) {
      toast.error("Cliente sem telefone cadastrado.");
      return;
    }
    const fallback =
      `Olá {client_name}! Lembrete da cobrança {company_name}:\n` +
      `Valor: {amount} — vencimento {due_date}.\n` +
      `Em caso de dúvida, fale conosco.`;
    const text = await renderFromDb("wa_charge_reminder", {
      client_name: r.client_name,
      amount: Number(r.amount),
      due_date: r.due_date,
    }, fallback);
    const t = toast.loading("Enviando WhatsApp...");
    try {
      const res = await sendWhatsAppManual({ data: { phone, text } });
      toast.dismiss(t);
      if (res?.ok) toast.success("Cobrança enviada via WhatsApp.");
      else {
        toast.error(res?.error ?? "Falha ao enviar. Abrindo WhatsApp Web...");
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.dismiss(t);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }
  };

  const total = (rows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const paid = (rows ?? [])
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.amount), 0);
  const outstanding = total - paid;

  return (
    <AppLayout
      title={`Cobranças · ${decoded}`}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/financial">
            <ArrowLeft className="h-4 w-4 mr-1" /> Financeiro
          </Link>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
          <div className="text-2xl font-semibold mt-1">{brl(total)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Pago</div>
          <div className="text-2xl font-semibold mt-1 text-emerald-500">{brl(paid)}</div>
        </Card>
        <Card className="p-4 border-primary/40">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Faltante</div>
          <div className="text-2xl font-semibold mt-1 text-primary">{brl(outstanding)}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {!rows ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Nenhuma cobrança encontrada para este cliente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Veículo</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const veh = r.transports;
                  const vehLabel = veh
                    ? [veh.vehicle_brand, veh.vehicle_model].filter(Boolean).join(" ") || "—"
                    : "—";
                  return (
                    <tr key={r.id} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {veh ? (
                          <Link
                            to="/transports/$id"
                            params={{ id: r.transport_id! }}
                            className="hover:underline"
                          >
                            <div className="font-mono uppercase">{veh.vehicle_plate}</div>
                            <div className="text-xs text-muted-foreground">{vehLabel}</div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">{r.description ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">{dateBR(r.due_date)}</td>
                      <td className="px-4 py-3 text-right font-mono">{brl(r.amount)}</td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status !== "paid" ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => sendCharge(r)} title="Enviar cobrança via WhatsApp">
                              <MessageCircle className="h-4 w-4 mr-1" /> Cobrar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => markPaid(r.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Pago
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            pago {dateBR(r.paid_at)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
