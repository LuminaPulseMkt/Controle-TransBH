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
  const [partialTarget, setPartialTarget] = useState<Receivable | null>(null);
  const [partialValue, setPartialValue] = useState("");
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

  const updateStatus = async (item: Receivable, newStatus: "pending" | "partial" | "paid") => {
    if (newStatus === "partial") {
      setPartialTarget(item);
      setPartialValue(item.paid_amount != null ? String(item.paid_amount) : "");
      return;
    }
    const patch: { status: typeof newStatus; paid_at: string | null; paid_amount: number | null } = {
      status: newStatus,
      paid_at: newStatus === "paid" ? new Date().toISOString().slice(0, 10) : null,
      paid_amount: newStatus === "paid" ? Number(item.amount) : null,
    };
    const { error } = await supabase.from("receivables").update(patch).eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado.");
    void load();
  };

  const savePartial = async () => {
    if (!partialTarget) return;
    const value = Number(partialValue);
    if (!Number.isFinite(value) || value <= 0) return toast.error("Informe um valor válido.");
    if (value >= Number(partialTarget.amount)) {
      return toast.error("Valor parcial deve ser menor que o total. Use 'Pago' para quitar.");
    }
    const { error } = await supabase.from("receivables").update({
      status: "partial",
      paid_amount: value,
      paid_at: new Date().toISOString().slice(0, 10),
    }).eq("id", partialTarget.id);
    if (error) return toast.error(error.message);
    toast.success("Pagamento parcial registrado.");
    setPartialTarget(null);
    setPartialValue("");
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
                    <Select
                      value={["pending", "partial", "paid"].includes(r.status) ? r.status : ""}
                      onValueChange={(v) => updateStatus(r, v as "pending" | "partial" | "paid")}
                    >
                      <SelectTrigger className="h-8 w-36 ml-auto text-xs">
                        <SelectValue placeholder="Alterar status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="partial">Pago Parcial</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                      </SelectContent>
                    </Select>
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

      <Dialog open={!!partialTarget} onOpenChange={(o) => { if (!o) { setPartialTarget(null); setPartialValue(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-display text-2xl">Pagamento Parcial</DialogTitle></DialogHeader>
          {partialTarget && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {partialTarget.client_name} · Total {brl(partialTarget.amount)}
              </div>
              <div>
                <Label>Valor pago *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(partialTarget.amount) - 0.01}
                  value={partialValue}
                  onChange={(e) => setPartialValue(e.target.value)}
                  autoFocus
                />
                {partialValue && Number(partialValue) > 0 && Number(partialValue) < Number(partialTarget.amount) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Saldo restante: <span className="text-destructive font-medium">{brl(Number(partialTarget.amount) - Number(partialValue))}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPartialTarget(null); setPartialValue(""); }}>Cancelar</Button>
            <Button onClick={savePartial}>Salvar</Button>
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
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs">{dateBR(p.expense_date)}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-muted">{p.category}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{p.description || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-destructive">{brl(p.amount)}</td>
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
  const [data, setData] = useState<{ revenue: number; expenses: number; receivables: Receivable[] } | null>(null);
  const [company, setCompany] = useState<{ name: string | null; logo_url: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      const iso = monthStart.toISOString().slice(0, 10);
      const [{ data: paid }, { data: partials }, { data: pay }, { data: rec }, { data: comp }] = await Promise.all([
        supabase.from("receivables").select("amount, paid_at").eq("status", "paid").gte("paid_at", iso),
        supabase.from("receivables").select("paid_amount, paid_at").eq("status", "partial").gte("paid_at", iso),
        supabase.from("payables").select("amount, expense_date").gte("expense_date", iso),
        supabase.from("receivables").select("*").eq("status", "overdue").order("due_date"),
        supabase.from("company_settings").select("name,logo_url").maybeSingle(),
      ]);
      const revenuePaid = paid?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
      const revenuePartial = partials?.reduce((s, r) => s + Number(r.paid_amount ?? 0), 0) ?? 0;
      const revenue = revenuePaid + revenuePartial;
      const expenses = pay?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
      setData({ revenue, expenses, receivables: rec ?? [] });
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
    doc.text(`Receita: ${brl(data.revenue)}`, 14, headerH + 32);
    doc.text(`Despesas: ${brl(data.expenses)}`, 14, headerH + 39);
    doc.text(`Resultado: ${brl(data.revenue - data.expenses)}`, 14, headerH + 46);

    if (data.receivables.length) {
      doc.text("Contas vencidas:", 14, headerH + 58);
      autoTable(doc, {
        startY: headerH + 62,
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

  const result = data.revenue - data.expenses;
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Receita do mês</div>
          <div className="text-display text-3xl text-success mt-1">{brl(data.revenue)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Despesa do mês</div>
          <div className="text-display text-3xl text-destructive mt-1">{brl(data.expenses)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Resultado</div>
          <div className={`text-display text-3xl mt-1 ${result >= 0 ? "text-success" : "text-destructive"}`}>{brl(result)}</div>
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
