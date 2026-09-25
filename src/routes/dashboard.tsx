import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { BrandLogo } from "@/components/BrandLogo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { TransportStatusBadge } from "@/components/StatusBadge";
import { ExportMenu } from "@/components/ExportMenu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, dateBR, transportStatusLabel } from "@/lib/format";
import {
  Truck, Wallet, AlertTriangle, FileText, Plus, TrendingUp,
  TrendingDown, Percent, Target, Handshake, Wrench,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, LineChart, Line, PieChart, Pie, Cell as RCell,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AuthGate>
      <DashboardPage />
    </AuthGate>
  ),
});

type Preset = "today" | "7d" | "month" | "lastMonth" | "90d" | "custom";

function rangeFromPreset(p: Preset, customFrom?: string, customTo?: string): { from: Date; to: Date; label: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (p) {
    case "today":
      return { from: today, to: now, label: "Hoje" };
    case "7d": {
      const f = new Date(today); f.setDate(f.getDate() - 6);
      return { from: f, to: now, label: "Últimos 7 dias" };
    }
    case "month": {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: f, to: now, label: "Mês atual" };
    }
    case "lastMonth": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { from: f, to: t, label: "Mês anterior" };
    }
    case "90d": {
      const f = new Date(today); f.setDate(f.getDate() - 89);
      return { from: f, to: now, label: "Últimos 90 dias" };
    }
    case "custom": {
      const f = customFrom ? new Date(customFrom + "T00:00:00") : today;
      const t = customTo ? new Date(customTo + "T23:59:59") : now;
      return { from: f, to: t, label: `${dateBR(f)} a ${dateBR(t)}` };
    }
  }
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

interface Transport {
  id: string; code: string; client_name: string; vehicle_plate: string;
  origin_city: string; destination_city: string; status: string;
  partner_id: string | null; partner_quoted_amount: number | null;
  cost_pickup: number | null; cost_boarding: number | null; cost_other: number | null;
  created_at: string;
}
interface Receivable { id: string; client_name: string; amount: number; status: string; due_date: string; paid_at: string | null; transport_id: string | null; }
interface Payable { id: string; amount: number; expense_date: string; category: string; }
interface Doc { id: string; doc_type: string; total_amount: number | null; created_at: string; accepted_at: string | null; client_name: string; }
interface Partner { id: string; name: string; }

function DashboardPage() {
  const { isAdmin, can } = useAuth();
  const showValues = can("values.view");
  const navigate = useNavigate();

  const [preset, setPreset] = useState<Preset>("month");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const range = useMemo(() => rangeFromPreset(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const [loading, setLoading] = useState(true);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [inProgressCount, setInProgressCount] = useState(0);

  useEffect(() => { void load(); }, [preset, customFrom, customTo, isAdmin]);

  const load = async () => {
    setLoading(true);
    await supabase.rpc("mark_overdue_receivables");
    const fromIso = isoDate(range.from);
    const toIso = isoDate(range.to);

    const [trRes, partRes, ipRes] = await Promise.all([
      supabase.from("transports")
        .select("id, code, client_name, vehicle_plate, origin_city, destination_city, status, partner_id, partner_quoted_amount, cost_pickup, cost_boarding, cost_other, created_at")
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString())
        .order("created_at", { ascending: false }),
      supabase.from("partners").select("id, name"),
      supabase.from("transports").select("id", { count: "exact", head: true }).in("status", ["aguardando_coleta", "coletado_aguardando_embarque", "veiculo_patio_aguardando_retirada"]),
    ]);
    setTransports((trRes.data ?? []) as Transport[]);
    setPartners((partRes.data ?? []) as Partner[]);
    setInProgressCount(ipRes.count ?? 0);

    if (showValues) {
      const [recRes, payRes, docRes] = await Promise.all([
        supabase.from("receivables").select("id, client_name, amount, status, due_date, paid_at, transport_id"),
        supabase.from("payables").select("id, amount, expense_date, category")
          .gte("expense_date", fromIso).lte("expense_date", toIso),
        supabase.from("documents").select("id, doc_type, total_amount, created_at, accepted_at, client_name")
          .gte("created_at", range.from.toISOString()).lte("created_at", range.to.toISOString()),
      ]);
      setReceivables((recRes.data ?? []) as Receivable[]);
      setPayables((payRes.data ?? []) as Payable[]);
      setDocs((docRes.data ?? []) as Doc[]);
    } else {
      setReceivables([]); setPayables([]); setDocs([]);
    }
    setLoading(false);
  };

  // Derivations
  const partnerById = useMemo(() => Object.fromEntries(partners.map((p) => [p.id, p.name])), [partners]);

  const revenueInRange = useMemo(() =>
    receivables.filter(r => r.paid_at && r.paid_at >= isoDate(range.from) && r.paid_at <= isoDate(range.to))
      .reduce((s, r) => s + Number(r.amount), 0), [receivables, range]);
  const pendingTotal = useMemo(() =>
    receivables.filter(r => ["pending", "partial", "overdue"].includes(r.status))
      .reduce((s, r) => s + Number(r.amount), 0), [receivables]);
  const overdueCount = useMemo(() => receivables.filter(r => r.status === "overdue").length, [receivables]);
  const expensesTotal = useMemo(() => payables.reduce((s, p) => s + Number(p.amount), 0), [payables]);
  const partnerCost = useMemo(() => transports.reduce((s, t) => s + Number(t.partner_quoted_amount ?? 0), 0), [transports]);
  const operationalCost = useMemo(() => transports.reduce(
    (s, t) => s + Number(t.cost_pickup ?? 0) + Number(t.cost_boarding ?? 0) + Number(t.cost_other ?? 0), 0,
  ), [transports]);
  const grossMargin = revenueInRange - expensesTotal - partnerCost - operationalCost;
  const ticketAvg = transports.length ? revenueInRange / transports.length : 0;

  // Funil orçamentos
  const budgets = docs.filter(d => d.doc_type === "budget");
  const acceptedBudgets = budgets.filter(d => d.accepted_at);
  const conversion = budgets.length ? (acceptedBudgets.length / budgets.length) * 100 : 0;
  const quotedTotal = budgets.reduce((s, d) => s + Number(d.total_amount ?? 0), 0);
  const closedTotal = acceptedBudgets.reduce((s, d) => s + Number(d.total_amount ?? 0), 0);

  // Margin per transport
  const marginRows = useMemo(() => {
    return transports.map((t) => {
      const rev = receivables.filter(r => r.transport_id === t.id).reduce((s, r) => s + Number(r.amount), 0);
      const costPickup = Number(t.cost_pickup ?? 0);
      const costBoarding = Number(t.cost_boarding ?? 0);
      const costOther = Number(t.cost_other ?? 0);
      const partnerCost = Number(t.partner_quoted_amount ?? 0);
      const cost = costPickup + costBoarding + costOther + partnerCost;
      const margin = rev - cost;
      const pct = rev > 0 ? (margin / rev) * 100 : 0;
      return {
        id: t.id, code: t.code, client: t.client_name,
        partner: t.partner_id ? partnerById[t.partner_id] ?? "—" : "—",
        revenue: rev, costPickup, costBoarding, costOther, partnerCost, cost, margin, pct,
      };
    });
  }, [transports, receivables, partnerById]);

  // Daily series (revenue x expenses)
  const dailySeries = useMemo(() => {
    const days: { date: string; label: string; revenue: number; expenses: number }[] = [];
    const start = new Date(range.from); start.setHours(0, 0, 0, 0);
    const end = new Date(range.to); end.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
    for (let i = 0; i < total; i++) {
      const d = new Date(start.getTime() + i * dayMs);
      days.push({ date: isoDate(d), label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), revenue: 0, expenses: 0 });
    }
    const idx: Record<string, number> = {};
    days.forEach((d, i) => (idx[d.date] = i));
    receivables.forEach(r => {
      if (r.paid_at && idx[r.paid_at] !== undefined) days[idx[r.paid_at]].revenue += Number(r.amount);
    });
    payables.forEach(p => {
      if (idx[p.expense_date] !== undefined) days[idx[p.expense_date]].expenses += Number(p.amount);
    });
    return days;
  }, [receivables, payables, range]);

  // Top clients (revenue)
  const topClients = useMemo(() => {
    const map = new Map<string, number>();
    receivables.filter(r => r.paid_at && r.paid_at >= isoDate(range.from) && r.paid_at <= isoDate(range.to))
      .forEach(r => map.set(r.client_name, (map.get(r.client_name) ?? 0) + Number(r.amount)));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 5);
  }, [receivables, range]);

  // Status pie
  const statusPie = useMemo(() => {
    const counts: Record<string, number> = {};
    transports.forEach(t => (counts[t.status] = (counts[t.status] ?? 0) + 1));
    const labels: Record<string, string> = transportStatusLabel;
    const colors: Record<string, string> = {
      aguardando_coleta: "#eab308",
      coletado_aguardando_embarque: "#3b82f6",
      veiculo_patio_aguardando_retirada: "#f97316",
      finalizado: "#10b981",
      cancelled: "#6b7280",
    };
    return Object.entries(counts).map(([k, v]) => ({ name: labels[k] ?? k, value: v, fill: colors[k] ?? "#888" }));
  }, [transports]);

  // Export rows
  const marginExport = useMemo(() => ({
    columns: ["Código", "Cliente", "Cobrado (R$)", "Custo coleta (R$)", "Custo embarque (R$)", "Outros custos (R$)", "Parceiro", "Custo parceiro (R$)", "Custo total (R$)", "Lucro real (R$)", "Margem %"],
    rows: marginRows.map(r => [
      r.code, r.client, r.revenue.toFixed(2),
      r.costPickup.toFixed(2), r.costBoarding.toFixed(2), r.costOther.toFixed(2),
      r.partner, r.partnerCost.toFixed(2),
      r.cost.toFixed(2), r.margin.toFixed(2), `${r.pct.toFixed(1)}%`,
    ]),
  }), [marginRows]);

  const summary = showValues ? [
    { label: "Receita", value: brl(revenueInRange) },
    { label: "Despesas", value: brl(expensesTotal) },
    { label: "Custo parceiros", value: brl(partnerCost) },
    { label: "Custo operacional", value: brl(operationalCost) },
    { label: "Margem", value: brl(grossMargin) },
    { label: "Transportes", value: String(transports.length) },
    { label: "Conversão orçamentos", value: `${conversion.toFixed(0)}%` },
  ] : [
    { label: "Transportes", value: String(transports.length) },
  ];

  return (
    <AppLayout
      actions={
        <div className="flex gap-2">
          <ExportMenu
            filename={`dashboard-${isoDate(range.from)}_${isoDate(range.to)}`}
            title="Dashboard"
            subtitle={range.label}
            columns={marginExport.columns}
            rows={marginExport.rows}
            summary={summary}
            orientation="landscape"
          />
          <Button asChild size="sm" variant="outline">
            <Link to="/documents"><FileText className="h-4 w-4 mr-1" /> Orçamento</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/transports"><Plus className="h-4 w-4 mr-1" /> Transporte</Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Brand header */}
        <div className="flex items-center gap-4">
          <BrandLogo size="lg" />
          <div className="min-w-0">
            <h1 className="text-display text-3xl text-foreground leading-tight">Painel</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
              Gestão de Transporte de Veículos
            </p>
          </div>
        </div>
        {/* Period filter */}
        <Card className="p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Período:</span>
          {([
            ["today", "Hoje"], ["7d", "7d"], ["month", "Mês"],
            ["lastMonth", "Mês anterior"], ["90d", "90d"], ["custom", "Personalizado"],
          ] as [Preset, string][]).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setPreset(k)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${preset === k
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {lbl}
            </button>
          ))}
          {preset === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 w-40" />
              <span className="text-xs text-muted-foreground">até</span>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 w-40" />
            </div>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{range.label}</span>
        </Card>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Em andamento" value={String(inProgressCount)} icon={Truck} tone="default" to="/transports" />
          {showValues && <>
            <Kpi label="Receita no período" value={brl(revenueInRange)} icon={TrendingUp} tone="success" loading={loading} />
            <Kpi label="Despesas" value={brl(expensesTotal)} icon={TrendingDown} tone="danger" loading={loading} />
            <Kpi label="Custo parceiros" value={brl(partnerCost)} icon={Handshake} tone="default" loading={loading} to="/partners" />
            <Kpi label="Custo operacional" value={brl(operationalCost)} icon={Wrench} tone="default" loading={loading} />
            <Kpi label="Margem bruta" value={brl(grossMargin)} icon={Target} tone={grossMargin >= 0 ? "success" : "danger"} loading={loading} />
            <Kpi label="A receber" value={brl(pendingTotal)} icon={Wallet} tone="default" loading={loading} to="/financial" search={{ tab: "receivables" }} />
            <Kpi label="Vencidos" value={String(overdueCount)} icon={AlertTriangle} tone={overdueCount > 0 ? "danger" : "default"} loading={loading} to="/collections" />
            <Kpi label="Ticket médio" value={brl(ticketAvg)} icon={Percent} tone="default" loading={loading} />
          </>}
        </div>

        {/* Funil de orçamentos */}
        {showValues && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-display text-xl">Funil de orçamentos</h2>
              <span className="text-xs text-muted-foreground">{range.label}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <FunnelStat label="Enviados" value={String(budgets.length)} />
              <FunnelStat label="Aceitos" value={String(acceptedBudgets.length)} tone="success" />
              <FunnelStat label="Pendentes" value={String(budgets.length - acceptedBudgets.length)} />
              <FunnelStat label="Conversão" value={`${conversion.toFixed(1)}%`} tone={conversion >= 50 ? "success" : "default"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 mt-4 text-sm">
              <div className="p-3 rounded bg-muted/40">
                <div className="text-xs text-muted-foreground">Valor cotado</div>
                <div className="text-display text-2xl mt-1">{brl(quotedTotal)}</div>
              </div>
              <div className="p-3 rounded bg-muted/40">
                <div className="text-xs text-muted-foreground">Valor fechado</div>
                <div className="text-display text-2xl mt-1 text-success">{brl(closedTotal)}</div>
              </div>
            </div>
          </Card>
        )}

        {/* Charts */}
        {showValues && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="text-display text-lg mb-3">Receita vs Despesas</h2>
              <div className="h-72">
                {loading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailySeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.04 255)" />
                      <XAxis dataKey="label" stroke="oklch(0.7 0.02 255)" fontSize={11} />
                      <YAxis stroke="oklch(0.7 0.02 255)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ background: "oklch(0.22 0.045 255)", border: "1px solid oklch(0.32 0.04 255)", borderRadius: 8 }} formatter={(v) => brl(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="revenue" name="Receita" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="expenses" name="Despesa" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="text-display text-lg mb-3">Status dos transportes</h2>
              <div className="h-72">
                {loading ? <Skeleton className="h-full w-full" /> : statusPie.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPie} dataKey="value" nameKey="name" outerRadius={90} label>
                        {statusPie.map((s, i) => <RCell key={i} fill={s.fill} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        )}

        {showValues && topClients.length > 0 && (
          <Card className="p-5">
            <h2 className="text-display text-lg mb-3">Top 5 clientes (receita)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.04 255)" />
                  <XAxis type="number" stroke="oklch(0.7 0.02 255)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="oklch(0.7 0.02 255)" fontSize={11} width={140} />
                  <Tooltip formatter={(v) => brl(Number(v))} contentStyle={{ background: "oklch(0.22 0.045 255)", border: "1px solid oklch(0.32 0.04 255)", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="oklch(0.78 0.16 70)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Custo x Cobrado */}
        {showValues && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-display text-xl">Custo do frete × Valor cobrado</h2>
              <ExportMenu
                filename={`margem-${isoDate(range.from)}_${isoDate(range.to)}`}
                title="Margem por transporte"
                subtitle={range.label}
                columns={marginExport.columns}
                rows={marginExport.rows}
                orientation="landscape"
              />
            </div>
            {marginRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum transporte no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="px-2 py-2">Código</th>
                      <th className="px-2 py-2">Cliente</th>
                      <th className="px-2 py-2">Parceiro</th>
                      <th className="px-2 py-2 text-right">Cobrado</th>
                      <th className="px-2 py-2 text-right">Custo</th>
                      <th className="px-2 py-2 text-right">Margem</th>
                      <th className="px-2 py-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marginRows.map((r) => (
                      <tr
                        key={r.id}
                        className={`border-b border-border/50 hover:bg-muted/40 cursor-pointer ${r.margin < 0 ? "bg-destructive/10" : ""}`}
                        onClick={() => navigate({ to: "/transports/$id", params: { id: r.id } })}
                      >
                        <td className="px-2 py-2 font-mono text-xs text-primary">{r.code}</td>
                        <td className="px-2 py-2">{r.client}</td>
                        <td className="px-2 py-2 text-muted-foreground text-xs">{r.partner}</td>
                        <td className="px-2 py-2 text-right font-mono">{brl(r.revenue)}</td>
                        <td className="px-2 py-2 text-right font-mono text-muted-foreground">{brl(r.cost)}</td>
                        <td className={`px-2 py-2 text-right font-mono font-semibold ${r.margin < 0 ? "text-destructive" : "text-success"}`}>
                          {brl(r.margin)}
                        </td>
                        <td className={`px-2 py-2 text-right text-xs ${r.margin < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {r.pct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Recent transports */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-display text-xl">Transportes recentes</h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/transports">Ver todos →</Link>
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : transports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum transporte no período.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-2 py-2">Código</th>
                    <th className="px-2 py-2">Cliente</th>
                    <th className="px-2 py-2">Placa</th>
                    <th className="px-2 py-2">Rota</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {transports.slice(0, 10).map((t) => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/40 cursor-pointer"
                      onClick={() => navigate({ to: "/transports/$id", params: { id: t.id } })}>
                      <td className="px-2 py-2 font-mono text-xs text-primary">{t.code}</td>
                      <td className="px-2 py-2">{t.client_name}</td>
                      <td className="px-2 py-2 font-mono uppercase">{t.vehicle_plate}</td>
                      <td className="px-2 py-2 text-muted-foreground text-xs">{t.origin_city} → {t.destination_city}</td>
                      <td className="px-2 py-2"><TransportStatusBadge status={t.status} /></td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{dateBR(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

function Kpi({
  label, value, icon: Icon, tone, to, search, loading,
}: {
  label: string; value: string; icon: any; tone: "default" | "success" | "danger";
  to?: string; search?: Record<string, string>; loading?: boolean;
}) {
  const toneStyles = { default: "text-primary", success: "text-success", danger: "text-destructive" }[tone];
  const inner = (
    <Card className={`p-5 relative overflow-hidden h-full ${to ? "cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 hover:-translate-y-0.5" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          {loading ? <Skeleton className="h-8 w-24 mt-2" /> : <div className={`text-display text-2xl mt-1 ${toneStyles}`}>{value}</div>}
        </div>
        <div className={`h-9 w-9 rounded-md bg-muted flex items-center justify-center ${toneStyles}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
  if (!to) return inner;
  return <Link to={to as any} search={search as any} className="block">{inner}</Link>;
}

function FunnelStat({ label, value, tone }: { label: string; value: string; tone?: "default" | "success" }) {
  const c = tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className="p-3 rounded bg-muted/40">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-display text-2xl mt-1 ${c}`}>{value}</div>
    </div>
  );
}
