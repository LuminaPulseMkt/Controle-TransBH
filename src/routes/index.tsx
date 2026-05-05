import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TransportStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, dateBR, daysBetween } from "@/lib/format";
import { Truck, Wallet, AlertTriangle, FileText, Plus, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthGate>
      <DashboardPage />
    </AuthGate>
  ),
});

interface Stats {
  inProgress: number;
  pendingReceivables: number;
  overdueCount: number;
  monthly: { month: string; revenue: number; expenses: number }[];
  recentTransports: any[];
}

function DashboardPage() {
  const { isAdmin, can } = useAuth();
  const showValues = can("values.view");
  const [stats, setStats] = useState<Stats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void loadStats();
  }, [isAdmin]);

  const loadStats = async () => {
    // Mark overdue first
    await supabase.rpc("mark_overdue_receivables");

    const [{ count: inProgress }, recentRes] = await Promise.all([
      supabase
        .from("transports")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "in_transit"]),
      supabase
        .from("transports")
        .select("id, code, client_name, vehicle_plate, origin_city, destination_city, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    let pendingReceivables = 0;
    let overdueCount = 0;
    let monthly: Stats["monthly"] = [];

    if (isAdmin) {
      const { data: rec } = await supabase
        .from("receivables")
        .select("amount, status, due_date");
      pendingReceivables =
        rec?.filter((r) => r.status === "pending" || r.status === "overdue")
          .reduce((s, r) => s + Number(r.amount), 0) ?? 0;
      overdueCount = rec?.filter((r) => r.status === "overdue").length ?? 0;

      // Monthly revenue/expenses for last 6 months
      const now = new Date();
      const months: Stats["monthly"] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          month: d.toLocaleDateString("pt-BR", { month: "short" }),
          revenue: 0,
          expenses: 0,
        });
      }
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

      const [{ data: paid }, { data: pay }] = await Promise.all([
        supabase
          .from("receivables")
          .select("amount, paid_at")
          .eq("status", "paid")
          .gte("paid_at", sixMonthsAgo.slice(0, 10)),
        supabase
          .from("payables")
          .select("amount, expense_date")
          .gte("expense_date", sixMonthsAgo.slice(0, 10)),
      ]);

      paid?.forEach((r) => {
        if (!r.paid_at) return;
        const d = new Date(r.paid_at);
        const idx = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()) + 5;
        if (idx >= 0 && idx < 6) months[idx].revenue += Number(r.amount);
      });
      pay?.forEach((p) => {
        const d = new Date(p.expense_date);
        const idx = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()) + 5;
        if (idx >= 0 && idx < 6) months[idx].expenses += Number(p.amount);
      });
      monthly = months;
    }

    setStats({
      inProgress: inProgress ?? 0,
      pendingReceivables,
      overdueCount,
      monthly,
      recentTransports: recentRes.data ?? [],
    });
  };

  return (
    <AppLayout
      title="Dashboard"
      actions={
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/documents">
              <FileText className="h-4 w-4 mr-1" /> Novo Orçamento
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/transports">
              <Plus className="h-4 w-4 mr-1" /> Novo Transporte
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Em andamento"
            value={stats ? String(stats.inProgress) : null}
            icon={Truck}
            tone="default"
            to="/transports"
            search={{ status: "in_transit" }}
          />
          {showValues && (
            <>
              <KpiCard
                label="A receber"
                value={stats ? brl(stats.pendingReceivables) : null}
                icon={Wallet}
                tone="default"
                to="/financial"
                search={{ tab: "receivables", status: "pending" }}
              />
              <KpiCard
                label="Vencidos"
                value={stats ? String(stats.overdueCount) : null}
                icon={AlertTriangle}
                tone={stats && stats.overdueCount > 0 ? "danger" : "default"}
                to="/collections"
              />
              <KpiCard
                label="Receita do mês"
                value={
                  stats
                    ? brl(stats.monthly[stats.monthly.length - 1]?.revenue ?? 0)
                    : null
                }
                icon={TrendingUp}
                tone="success"
                to="/financial"
                search={{ tab: "reports" }}
              />
            </>
          )}
        </div>

        {/* Chart */}
        {isAdmin && (
          <Card
            className="p-5 cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 hover:-translate-y-0.5"
            onClick={() => navigate({ to: "/financial", search: { tab: "reports" } as any })}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-display text-xl">Receita vs Despesas</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
                <span className="text-xs text-primary font-medium">Ver detalhes →</span>
              </div>
            </div>
            <div className="h-72">
              {stats ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.04 255)" />
                    <XAxis dataKey="month" stroke="oklch(0.7 0.02 255)" fontSize={12} />
                    <YAxis
                      stroke="oklch(0.7 0.02 255)"
                      fontSize={12}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.22 0.045 255)",
                        border: "1px solid oklch(0.32 0.04 255)",
                        borderRadius: 8,
                        color: "oklch(0.97 0.01 255)",
                      }}
                      formatter={(v) => brl(Number(v))}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Receita" fill="oklch(0.78 0.16 70)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Despesa" fill="oklch(0.62 0.22 25)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-full w-full" />
              )}
            </div>
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
          {stats ? (
            stats.recentTransports.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum transporte registrado ainda.
              </p>
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
                    {stats.recentTransports.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => navigate({ to: "/transports/$id", params: { id: t.id } })}
                      >
                        <td className="px-2 py-2 font-mono text-xs text-primary">{t.code}</td>
                        <td className="px-2 py-2">
                          {isAdmin ? (
                            <Link
                              to="/financial/clients/$name"
                              params={{ name: encodeURIComponent(t.client_name) }}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-primary hover:underline"
                            >
                              {t.client_name}
                            </Link>
                          ) : (
                            t.client_name
                          )}
                        </td>
                        <td className="px-2 py-2 font-mono uppercase">{t.vehicle_plate}</td>
                        <td className="px-2 py-2 text-muted-foreground text-xs">
                          {t.origin_city} → {t.destination_city}
                        </td>
                        <td className="px-2 py-2"><TransportStatusBadge status={t.status} /></td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">{dateBR(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  to,
  search,
}: {
  label: string;
  value: string | null;
  icon: any;
  tone: "default" | "success" | "danger";
  to?: string;
  search?: Record<string, string>;
}) {
  const toneStyles = {
    default: "text-primary",
    success: "text-success",
    danger: "text-destructive",
  }[tone];

  const inner = (
    <Card
      className={`p-5 relative overflow-hidden h-full ${
        to ? "cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 hover:-translate-y-0.5" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          {value === null ? (
            <Skeleton className="h-8 w-24 mt-2" />
          ) : (
            <div className={`text-display text-3xl mt-1 ${toneStyles}`}>{value}</div>
          )}
        </div>
        <div className={`h-9 w-9 rounded-md bg-muted flex items-center justify-center ${toneStyles}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );

  if (!to) return inner;

  return (
    <Link to={to as any} search={search as any} className="block">
      {inner}
    </Link>
  );
}

// avoid unused import warning
void daysBetween;
