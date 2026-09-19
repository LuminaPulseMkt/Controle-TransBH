import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentStatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR, paymentStatusLabel } from "@/lib/format";
import { Plus, Loader2, Download, History, Trash2 } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import { toast } from "sonner";
import { loadLogoDataUrl } from "@/lib/pdf-logo";

type FinancialSearch = { tab?: string; status?: string };

export const Route = createFileRoute("/financial")({
  validateSearch: (s: Record<string, unknown>): FinancialSearch => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  component: () => (
    <AuthGate requirePermission="financial.view">
      <FinancialPage />
    </AuthGate>
  ),
});

interface Receivable {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  description: string | null;
  amount: number;
  paid_amount: number | null;
  due_date: string;
  paid_at: string | null;
  status: string;
  transport_id: string | null;
}

interface Payment {
  id: string;
  receivable_id: string;
  amount: number;
  paid_at: string;
  note: string | null;
  created_at: string;
}

interface Payable {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
}

function FinancialPage() {
  const search = Route.useSearch();
  const initialTab = search.tab && ["receivables", "payables", "reports"].includes(search.tab)
    ? search.tab
    : "receivables";
  return (
    <AppLayout title="Financeiro">
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
          <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="mt-4">
          <ReceivablesTab initialStatus={search.status} />
        </TabsContent>
        <TabsContent value="payables" className="mt-4">
          <PayablesTab />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function ReceivablesTab({ initialStatus }: { initialStatus?: string }) {
  const [items, setItems] = useState<Receivable[] | null>(null);
  const [transports, setTransports] = useState<{ id: string; code: string; client_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState(initialStatus ?? "all");
  const [historyTarget, setHistoryTarget] = useState<Receivable | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [newPayAmount, setNewPayAmount] = useState("");
  const [newPayDate, setNewPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [newPayNote, setNewPayNote] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const initialForm = {
    client_name: "",
    client_phone: "",
    client_email: "",
    description: "",
    amount: "",
    due_date: new Date().toISOString().slice(0, 10),
    transport_id: "",
  };
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    await supabase.rpc("mark_overdue_receivables");
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase.from("receivables").select("*").order("due_date", { ascending: true }),
      supabase.from("transports").select("id, code, client_name").order("created_at", { ascending: false }),
    ]);
    setItems(r ?? []);
    setTransports(t ?? []);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const save = async () => {
    if (!form.client_name || !form.amount) return toast.error("Cliente e valor são obrigatórios.");
    setBusy(true);
    const { error } = await supabase.from("receivables").insert({
      client_name: form.client_name,
      client_phone: form.client_phone || null,
      client_email: form.client_email || null,
      description: form.description || null,
      amount: Number(form.amount),
      due_date: form.due_date,
      transport_id: form.transport_id || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Recebível criado.");
    setOpen(false);
    setForm(initialForm);
    void load();
  };

  const loadPayments = async (receivableId: string) => {
    setPayments(null);
    const { data, error } = await supabase
      .from("receivable_payments")
      .select("*")
      .eq("receivable_id", receivableId)
      .order("paid_at", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setPayments((data ?? []) as Payment[]);
  };

  const openHistory = (item: Receivable) => {
    setHistoryTarget(item);
    setNewPayAmount("");
    setNewPayDate(new Date().toISOString().slice(0, 10));
    setNewPayNote("");
    void loadPayments(item.id);
  };

  const closeHistory = () => {
    setHistoryTarget(null);
    setPayments(null);
  };

  const recalcReceivable = async (item: Receivable, list: Payment[]) => {
    const totalPaid = list.reduce((s, p) => s + Number(p.amount), 0);
    const amount = Number(item.amount);
    let status: "pending" | "partial" | "paid" | "overdue" = "pending";
    let paid_at: string | null = null;
    if (totalPaid <= 0) {
      // sem pagamentos: mantém pending/overdue conforme vencimento
      status = new Date(item.due_date) < new Date(new Date().toISOString().slice(0, 10))
        ? "overdue" : "pending";
      paid_at = null;
    } else if (totalPaid < amount) {
      status = "partial";
      paid_at = list[list.length - 1].paid_at;
    } else {
      status = "paid";
      paid_at = list[list.length - 1].paid_at;
    }
    const { error } = await supabase.from("receivables").update({
      status,
      paid_amount: totalPaid > 0 ? totalPaid : null,
      paid_at,
    }).eq("id", item.id);
    if (error) toast.error(error.message);
  };

  const addPayment = async () => {
    if (!historyTarget || !payments) return;
    const value = Number(newPayAmount);
    if (!Number.isFinite(value) || value <= 0) return toast.error("Informe um valor válido.");
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const remaining = Number(historyTarget.amount) - totalPaid;
    if (value > remaining + 0.001) {
      return toast.error(`Valor excede o saldo restante (${brl(remaining)}).`);
    }
    setPayBusy(true);
    const { data, error } = await supabase.from("receivable_payments").insert({
      receivable_id: historyTarget.id,
      amount: value,
      paid_at: newPayDate,
      note: newPayNote || null,
    }).select().single();
    if (error) {
      setPayBusy(false);
      return toast.error(error.message);
    }
    const updated = [...payments, data as Payment].sort((a, b) =>
      a.paid_at.localeCompare(b.paid_at) || a.created_at.localeCompare(b.created_at),
    );
    setPayments(updated);
    await recalcReceivable(historyTarget, updated);
    setNewPayAmount("");
    setNewPayNote("");
    setPayBusy(false);
    toast.success("Pagamento registrado.");
    void load();
  };

  const deletePayment = async (paymentId: string) => {
    if (!historyTarget || !payments) return;
    if (!confirm("Excluir este pagamento?")) return;
    const { error } = await supabase.from("receivable_payments").delete().eq("id", paymentId);
    if (error) return toast.error(error.message);
    const updated = payments.filter((p) => p.id !== paymentId);
    setPayments(updated);
    await recalcReceivable(historyTarget, updated);
    toast.success("Pagamento excluído.");
    void load();
  };

  const deleteReceivable = async (item: Receivable) => {
    if (!confirm(`Excluir o recebível de ${item.client_name} (${brl(item.amount)})? Esta ação não pode ser desfeita.`)) return;
    const { error: payErr } = await supabase.from("receivable_payments").delete().eq("receivable_id", item.id);
    if (payErr) return toast.error(payErr.message);
    const { error } = await supabase.from("receivables").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Recebível excluído.");
    void load();
  };

  const updateStatus = async (item: Receivable, newStatus: "pending" | "partial" | "paid") => {
    if (newStatus === "partial" || newStatus === "paid") {
      // Abre o histórico para registrar pagamento(s)
      openHistory(item);
      return;
    }
    // Voltar para pendente: confirma e remove todos os pagamentos
    if (Number(item.paid_amount ?? 0) > 0) {
      if (!confirm("Voltar para Pendente removerá todos os pagamentos registrados. Continuar?")) return;
      const { error: delErr } = await supabase
        .from("receivable_payments").delete().eq("receivable_id", item.id);
      if (delErr) return toast.error(delErr.message);
    }
    const { error } = await supabase.from("receivables").update({
      status: "pending", paid_at: null, paid_amount: null,
    }).eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado.");
    void load();
  };

  return (
    <>
      <Card className="p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(paymentStatusLabel).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <ExportMenu
            filename={`recebiveis-${new Date().toISOString().slice(0,10)}`}
            title="Contas a Receber"
            subtitle={filter !== "all" ? paymentStatusLabel[filter] : "Todos"}
            columns={["Cliente", "Descrição", "Valor (R$)", "Pago (R$)", "Saldo (R$)", "Vencimento", "Status", "Pago em"]}
            rows={filtered.map((r) => {
              const paid = Number(r.paid_amount ?? 0);
              const balance = Number(r.amount) - paid;
              return [
                r.client_name,
                r.description ?? "—",
                Number(r.amount).toFixed(2),
                paid.toFixed(2),
                balance.toFixed(2),
                dateBR(r.due_date),
                paymentStatusLabel[r.status] ?? r.status,
                r.paid_at ? dateBR(r.paid_at) : "—",
              ];
            })}
            summary={[
              { label: "Total", value: brl(filtered.reduce((s, r) => s + Number(r.amount), 0)) },
              { label: "Recebido", value: brl(filtered.reduce((s, r) => s + Number(r.paid_amount ?? (r.status === "paid" ? r.amount : 0)), 0)) },
              { label: "Itens", value: String(filtered.length) },
            ]}
          />
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Recebível
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {!items ? (
          <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Nenhum recebível.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3">{r.client_name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.description || "—"}</td>
                  <td className={`px-4 py-3 font-medium ${r.status === "overdue" ? "text-destructive" : ""}`}>
                    {brl(r.amount)}
                    {r.status === "partial" && r.paid_amount != null && (
                      <div className="text-xs font-normal text-muted-foreground">
                        Pago <span className="text-success">{brl(r.paid_amount)}</span> · Resta <span className="text-destructive">{brl(Number(r.amount) - Number(r.paid_amount))}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{dateBR(r.due_date)}</td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => openHistory(r)}
                        title="Histórico de pagamentos"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Select
                        value={["pending", "partial", "paid"].includes(r.status) ? r.status : ""}
                        onValueChange={(v) => updateStatus(r, v as "pending" | "partial" | "paid")}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue placeholder="Alterar status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="partial">Pago Parcial</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => deleteReceivable(r)}
                        title="Excluir recebível"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-display text-2xl">Novo Recebível</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cliente *</Label>
              <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
            </div>
            <div>
              <Label>Transporte</Label>
              <Select value={form.transport_id} onValueChange={(v) => setForm({ ...form, transport_id: v })}>
                <SelectTrigger><SelectValue placeholder="Vincular transporte (opcional)" /></SelectTrigger>
                <SelectContent>
                  {transports.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.code} — {t.client_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyTarget} onOpenChange={(o) => { if (!o) closeHistory(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-display text-2xl">Histórico de Pagamentos</DialogTitle>
          </DialogHeader>
          {historyTarget && (
            <div className="space-y-4">
              <div className="text-sm">
                <div className="font-medium">{historyTarget.client_name}</div>
                {historyTarget.description && (
                  <div className="text-xs text-muted-foreground">{historyTarget.description}</div>
                )}
              </div>

              {(() => {
                const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
                const remaining = Number(historyTarget.amount) - totalPaid;
                return (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded border border-border p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                      <div className="font-medium">{brl(historyTarget.amount)}</div>
                    </div>
                    <div className="rounded border border-border p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pago</div>
                      <div className="font-medium text-success">{brl(totalPaid)}</div>
                    </div>
                    <div className="rounded border border-border p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo</div>
                      <div className={`font-medium ${remaining > 0 ? "text-destructive" : "text-success"}`}>{brl(remaining)}</div>
                    </div>
                  </div>
                );
              })()}

              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="px-3 py-2">Observação</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments == null ? (
                      <tr><td colSpan={4} className="p-4"><Skeleton className="h-6 w-full" /></td></tr>
                    ) : payments.length === 0 ? (
                      <tr><td colSpan={4} className="p-4 text-center text-xs text-muted-foreground">Nenhum pagamento registrado.</td></tr>
                    ) : payments.map((p) => (
                      <tr key={p.id} className="border-t border-border/50">
                        <td className="px-3 py-2 text-xs">{dateBR(p.paid_at)}</td>
                        <td className="px-3 py-2 text-right font-mono">{brl(p.amount)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.note || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deletePayment(p.id)} title="Excluir">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(() => {
                const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
                const remaining = Number(historyTarget.amount) - totalPaid;
                if (remaining <= 0.001) {
                  return <div className="text-xs text-success text-center">Recebível totalmente quitado.</div>;
                }
                return (
                  <div className="border border-border rounded p-3 space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Adicionar pagamento</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Valor</Label>
                        <Input
                          type="number" step="0.01" min="0.01" max={remaining}
                          value={newPayAmount}
                          onChange={(e) => setNewPayAmount(e.target.value)}
                          placeholder={brl(remaining)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Data</Label>
                        <Input type="date" value={newPayDate} onChange={(e) => setNewPayDate(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Observação</Label>
                        <Input value={newPayNote} onChange={(e) => setNewPayNote(e.target.value)} placeholder="PIX, TED…" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => { setNewPayAmount(String(remaining.toFixed(2))); }}
                      >
                        Quitar saldo
                      </Button>
                      <Button size="sm" onClick={addPayment} disabled={payBusy}>
                        {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeHistory}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PayablesTab() {
  const [items, setItems] = useState<Payable[] | null>(null);
  const [open, setOpen] = useState(false);
  const initialForm = {
    category: "Combustível",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("payables").select("*").order("expense_date", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.category || !form.amount) return toast.error("Categoria e valor são obrigatórios.");
    setBusy(true);
    const { error } = await supabase.from("payables").insert({
      category: form.category,
      description: form.description || null,
      amount: Number(form.amount),
      expense_date: form.expense_date,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Despesa registrada.");
    setOpen(false);
    setForm(initialForm);
    void load();
  };

  const deletePayable = async (item: Payable) => {
    if (!confirm(`Excluir a despesa "${item.description || item.category}" (${brl(item.amount)})? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("payables").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Despesa excluída.");
    void load();
  };

  const total = items?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const currentYM = new Date().toISOString().slice(0, 7); // "YYYY-MM" — compara como string para evitar bug de fuso
  const monthTotal = items?.filter((p) => p.expense_date?.startsWith(currentYM))
    .reduce((s, p) => s + Number(p.amount), 0) ?? 0;

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Despesas no mês</div>
          <div className="text-display text-3xl text-destructive mt-1">{brl(monthTotal)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total geral</div>
          <div className="text-display text-3xl mt-1">{brl(total)}</div>
        </Card>
      </div>
      <Card className="p-4 mb-4 flex justify-end gap-2">
        <ExportMenu
          filename={`despesas-${new Date().toISOString().slice(0,10)}`}
          title="Contas a Pagar"
          columns={["Data", "Categoria", "Descrição", "Valor (R$)"]}
          rows={(items ?? []).map((p) => [
            dateBR(p.expense_date),
            p.category,
            p.description ?? "—",
            Number(p.amount).toFixed(2),
          ])}
          summary={[
            { label: "Total", value: brl(total) },
            { label: "Mês atual", value: brl(monthTotal) },
          ]}
        />
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Despesa
        </Button>
      </Card>
      <Card className="overflow-hidden">
        {!items ? (
          <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Nenhuma despesa.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs">{dateBR(p.expense_date)}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-muted">{p.category}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{p.description || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-destructive">{brl(p.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => deletePayable(p)}
                      title="Excluir despesa"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-display text-2xl">Nova Despesa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Combustível", "Manutenção", "Pedágio", "Salário motorista", "Seguro", "Documentação", "Outros"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReportsTab() {
  const [data, setData] = useState<{ 
    revenue: number; 
    expenses: number; 
    tripRevenue: number;
    tripExpenses: number;
    receivables: Receivable[] 
  } | null>(null);
  const [company, setCompany] = useState<{ name: string | null; logo_url: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      const iso = monthStart.toISOString().slice(0, 10);
      const [{ data: monthPayments }, { data: pay }, { data: rec }, { data: comp }, { data: trips }] = await Promise.all([
        supabase.from("receivable_payments").select("amount, paid_at").gte("paid_at", iso),
        supabase.from("payables").select("amount, expense_date").gte("expense_date", iso),
        supabase.from("receivables").select("*").eq("status", "overdue").order("due_date"),
        supabase.rpc("get_public_company_info").maybeSingle(),
        supabase.from("trip_sheets").select("rows, expenses, sheet_date").gte("sheet_date", iso),
      ]);

      const revenue = monthPayments?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
      const expenses = pay?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;

      // Calcular dados financeiros das planilhas
      let tripRevenue = 0;
      let tripExpenses = 0;

      trips?.forEach((sheet: any) => {
        const rows = (sheet.rows || []) as any[];
        const sheetExpenses = (sheet.expenses || []) as any[];
        
        rows.forEach(r => {
          tripRevenue += parseFloat(r.valor) || 0;
        });
        
        sheetExpenses.forEach(e => {
          tripExpenses += parseFloat(e.value) || 0;
        });
      });

      setData({ 
        revenue, 
        expenses, 
        tripRevenue,
        tripExpenses,
        receivables: rec ?? [] 
      });
      setCompany(comp ?? null);
    })();
  }, []);

  const exportPDF = async () => {
    if (!data) return;
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    const headerH = 56;
    doc.setFillColor(13, 27, 42);
    doc.rect(0, 0, 210, headerH, "F");
    const logo = await loadLogoDataUrl(company?.logo_url ?? null);
    if (logo) {
      const targetH = 48;
      const targetW = Math.min(logo.widthFor(targetH), 140);
      doc.addImage(logo.dataUrl, "PNG", 14, (headerH - targetH) / 2, targetW, targetH);
    } else {
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(28);
      doc.text(company?.name || "TransBH", 14, headerH / 2 + 4);
    }
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text("Relatório Financeiro", 14, headerH + 12);
    doc.setFontSize(11);
    doc.text(`Mês: ${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`, 14, headerH + 22);
    doc.text(`Receita Total: ${brl(data.revenue + data.tripRevenue)}`, 14, headerH + 32);
    doc.text(`   (Financeiro: ${brl(data.revenue)} | Planilhas: ${brl(data.tripRevenue)})`, 14, headerH + 37);
    doc.text(`Despesas Totais: ${brl(data.expenses + data.tripExpenses)}`, 14, headerH + 47);
    doc.text(`   (Financeiro: ${brl(data.expenses)} | Planilhas: ${brl(data.tripExpenses)})`, 14, headerH + 52);
    doc.text(`Resultado Líquido: ${brl((data.revenue + data.tripRevenue) - (data.expenses + data.tripExpenses))}`, 14, headerH + 62);

    if (data.receivables.length) {
      doc.text("Contas vencidas:", 14, headerH + 74);
      autoTable(doc, {
        startY: headerH + 78,
        head: [["Cliente", "Valor", "Vencimento", "Dias"]],
        body: data.receivables.map((r) => [
          r.client_name,
          brl(r.amount),
          dateBR(r.due_date),
          String(Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000)),
        ]),
      });
    }
    doc.save(`relatorio-transbh-${Date.now()}.pdf`);
  };

  if (!data) return <Skeleton className="h-48 w-full" />;

  const totalRevenue = data.revenue + data.tripRevenue;
  const totalExpenses = data.expenses + data.tripExpenses;
  const result = totalRevenue - totalExpenses;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Receita Total</div>
          <div className="text-display text-3xl text-success mt-1">{brl(totalRevenue)}</div>
          <div className="text-[10px] text-muted-foreground mt-2 flex flex-col">
            <span>Financeiro: {brl(data.revenue)}</span>
            <span>Planilhas: {brl(data.tripRevenue)}</span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Despesa Total</div>
          <div className="text-display text-3xl text-destructive mt-1">{brl(totalExpenses)}</div>
          <div className="text-[10px] text-muted-foreground mt-2 flex flex-col">
            <span>Financeiro: {brl(data.expenses)}</span>
            <span>Planilhas: {brl(data.tripExpenses)}</span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Resultado Líquido</div>
          <div className={`text-display text-3xl mt-1 ${result >= 0 ? "text-success" : "text-destructive"}`}>{brl(result)}</div>
          <div className="text-[10px] text-muted-foreground mt-2">
            Mês atual (agregado)
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-display text-xl">Aging — Contas vencidas</h3>
          <Button onClick={exportPDF} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </div>
        {data.receivables.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma conta vencida 🎉</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2">Cliente</th>
                <th className="py-2">Valor</th>
                <th className="py-2">Vencimento</th>
                <th className="py-2">Dias</th>
              </tr>
            </thead>
            <tbody>
              {data.receivables.map((r) => {
                const days = Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000);
                return (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="py-2">{r.client_name}</td>
                    <td className="py-2 text-destructive font-medium">{brl(r.amount)}</td>
                    <td className="py-2 text-xs">{dateBR(r.due_date)}</td>
                    <td className="py-2"><span className="text-xs px-2 py-0.5 rounded bg-destructive/15 text-destructive">{days}d</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
