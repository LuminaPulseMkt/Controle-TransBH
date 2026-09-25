import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, ClipboardCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checklists/historico")({
  component: () => (
    <AuthGate requirePermission="transports.view">
      <HistoryPage />
    </AuthGate>
  ),
});

interface Row {
  id: string;
  client_name: string | null;
  plate: string | null;
  model: string | null;
  checklist_date: string | null;
  created_at: string;
  transport_id: string | null;
}

function HistoryPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicle_checklists")
      .select("id, client_name, plate, model, checklist_date, created_at, transport_id")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows(data ?? []);
  };

  useEffect(() => { void load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir este checklist?")) return;
    const { error } = await supabase.from("vehicle_checklists").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Checklist excluído.");
    load();
  };

  const filtered = rows.filter((r) => {
    const s = q.toLowerCase();
    return !s || [r.client_name, r.plate, r.model].some((v) => (v ?? "").toLowerCase().includes(s));
  });

  return (
    <AppLayout
      title="Histórico de checklists"
      actions={
        <Button variant="outline" asChild>
          <Link to="/checklists"><ArrowLeft className="h-4 w-4 mr-1" /> Novo checklist</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <Input placeholder="Buscar por cliente, placa ou modelo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Placa</th>
                <th className="text-left p-3">Modelo</th>
                <th className="text-left p-3">Transporte</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhum checklist salvo.
                </td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3">{r.checklist_date ?? "—"}</td>
                  <td className="p-3">{r.client_name || "—"}</td>
                  <td className="p-3 font-mono">{r.plate || "—"}</td>
                  <td className="p-3">{r.model || "—"}</td>
                  <td className="p-3">
                    {r.transport_id ? (
                      <Link to="/transports/$id" params={{ id: r.transport_id }} className="text-primary hover:underline">
                        Ver transporte
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/checklists/$id" params={{ id: r.id }}>Abrir</Link>
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </AppLayout>
  );
}
