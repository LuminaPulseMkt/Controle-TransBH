import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Download, MessageCircle, Pencil, Loader2, Save, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { dateBR } from "@/lib/format";
import {
  emptyRow, emptyTripSheet, emptyExpense, type TripDirection, type TripRow, type TripSheetData, type ExpenseRow
} from "@/lib/trip-sheet-types";
import { exportTripSheetPDF } from "@/lib/trip-sheet-pdf";
import { exportCSV } from "@/lib/exporters";

function exportTripSheetCSV(s: TripSheetData) {
  const columns = ["Direção", "Veículo", "Placa", "Empresa", "Origem", "Destino", "Pátio", "Valor", "Pago", "Recebido Por"];
  const rows: (string | number)[][] = (s.rows ?? []).map((r) => [
    r.direction === "ida" ? "IDA" : "VOLTA",
    r.veiculo, r.placa, r.empresa, r.origem, r.destino, r.patio, r.valor, r.pago ? "SIM" : "NÃO", r.recebido_por,
  ]);
  if ((s.expenses ?? []).length) {
    rows.push([]);
    rows.push(["DESPESAS", "Descrição", "Pago por", "Valor"]);
    (s.expenses ?? []).forEach((e) => rows.push(["", e.description, e.paid_by ?? "", e.value]));
  }
  const safeDate = s.sheet_date || "planilha";
  exportCSV(`planilha-${safeDate}.csv`, columns, rows);
}

export const Route = createFileRoute("/planilhas")({
  head: () => ({
    meta: [
      { title: "Planilhas de Viagem — TransBH" },
      { name: "description", content: "Gerencie planilhas de viagem (IDA/VOLTA) da frota, exporte em PDF e compartilhe via WhatsApp." },
      { property: "og:title", content: "Planilhas de Viagem — TransBH" },
      { property: "og:description", content: "Planilhas de IDA e VOLTA organizadas por data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate requirePermission="transports.view">
      <TripSheetsPage />
    </AuthGate>
  ),
});

interface SheetRow extends TripSheetData {
  id: string;
  created_at: string;
  updated_at: string;
}

function TripSheetsPage() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<{ name?: string | null; logo_url?: string | null } | null>(null);
  const [editing, setEditing] = useState<SheetRow | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("trip_sheets")
      .select("*")
      .order("sheet_date", { ascending: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setItems((data ?? []) as SheetRow[]);
  };

  useEffect(() => {
    void load();
    supabase.from("company_settings").select("name, logo_url").maybeSingle()
      .then(({ data }) => setCompany(data ?? null));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, SheetRow[]>();
    for (const it of items) {
      const key = it.sheet_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  const remove = async (id: string) => {
    if (!confirm("Excluir esta planilha?")) return;
    const { error } = await (supabase as any).from("trip_sheets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Planilha excluída.");
    setItems((xs) => xs.filter((x) => x.id !== id));
  };

  const shareWhatsApp = async (s: SheetRow) => {
    try {
      await exportTripSheetPDF(s, company);
      const text = `Planilha de Viagem — ${dateBR(s.sheet_date)}\n(PDF baixado no seu dispositivo — anexe na conversa)`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const downloadPdf = async (s: SheetRow) => {
    try {
      await exportTripSheetPDF(s, company);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppLayout
      title="Planilhas de Viagem"
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova planilha
        </Button>
      }
    >
      <div className="space-y-6">
        {loading && (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!loading && grouped.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Nenhuma planilha criada ainda. Clique em <b>Nova planilha</b> para começar.
          </Card>
        )}
        {grouped.map(([date, sheets]) => (
          <section key={date} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {dateBR(date)}
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {sheets.map((s) => {
                const ida = (s.rows ?? []).filter((r) => r.direction === "ida").length;
                const volta = (s.rows ?? []).filter((r) => r.direction === "volta").length;
                return (
                  <Card key={s.id} className="p-4 space-y-3">
                    <div>
                      <div className="font-medium truncate">{s.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {ida} IDA · {volta} VOLTA
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(s)}>
                        <Download className="h-4 w-4 mr-1" /> PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => exportTripSheetCSV(s)}>
                        <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => shareWhatsApp(s)}>
                        <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                      </Button>
                      {(isAdmin || s.id) && (
                        <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {(creating || editing) && (
        <TripSheetEditor
          initial={editing || emptyTripSheet()}
          existingId={editing?.id ?? null}
          userId={user?.id ?? ""}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); void load(); }}
        />
      )}
    </AppLayout>
  );
}

function TripSheetEditor({
  initial, existingId, userId, onClose, onSaved,
}: {
  initial: TripSheetData;
  existingId: string | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<TripSheetData>(initial);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof TripSheetData>(k: K, v: TripSheetData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const updateRow = (idx: number, patch: Partial<TripRow>) =>
    setData((d) => ({ ...d, rows: d.rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));

  const addRow = (direction: TripDirection) =>
    setData((d) => ({ ...d, rows: [...d.rows, emptyRow(direction)] }));

  const removeRow = (idx: number) =>
    setData((d) => ({ ...d, rows: d.rows.filter((_, i) => i !== idx) }));

  const addExpense = () =>
    setData((d) => ({ ...d, expenses: [...(d.expenses || []), emptyExpense()] }));

  const removeExpense = (id: string) =>
    setData((d) => ({ ...d, expenses: (d.expenses || []).filter(e => e.id !== id) }));

  const updateExpense = (id: string, patch: Partial<ExpenseRow>) =>
    setData((d) => ({ ...d, expenses: (d.expenses || []).map(e => e.id === id ? { ...e, ...patch } : e) }));

  const totals = useMemo(() => {
    const received = data.rows.reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);
    const spent = (data.expenses || []).reduce((acc, e) => acc + (parseFloat(e.value) || 0), 0);
    
    // Total per payer
    const spentByPayer: Record<string, number> = {};
    (data.expenses || []).forEach(e => {
      const payer = (e.paid_by || "Não informado").trim();
      const val = parseFloat(e.value) || 0;
      spentByPayer[payer] = (spentByPayer[payer] || 0) + val;
    });

    return { received, spent, net: received - spent, spentByPayer };
  }, [data.rows, data.expenses]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const payload = {
      title: data.title || "Planilha de Viagem",
      sheet_date: data.sheet_date,
      return_date: data.return_date || null,
      phone: data.phone || null,
      rows: data.rows as unknown as Record<string, unknown>[],
      expenses: (data.expenses || []) as unknown as Record<string, unknown>[],
    };
    const q = existingId
      ? (supabase as any).from("trip_sheets").update(payload).eq("id", existingId)
      : (supabase as any).from("trip_sheets").insert({ ...payload, created_by: userId });
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(existingId ? "Planilha atualizada." : "Planilha criada.");
    onSaved();
  };

  const renderSection = (label: "IDA" | "VOLTA", direction: TripDirection) => {
    const rows = data.rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.direction === direction);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-primary">{label}</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => addRow(direction)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar linha
          </Button>
        </div>
        <div className="overflow-x-auto border border-border rounded-md">
          <table className="w-full text-xs min-w-[1000px]">
            <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Veículo</th>
                <th className="text-left p-2">Placa</th>
                <th className="text-left p-2">Empresa</th>
                <th className="text-left p-2">Origem</th>
                <th className="text-left p-2">Destino</th>
                <th className="text-left p-2">Pátio</th>
                <th className="text-left p-2">Valor</th>
                <th className="text-center p-2 w-16">Pago</th>
                <th className="text-left p-2">Recebido por</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={10} className="p-3 text-center text-muted-foreground">Nenhuma linha</td></tr>
              )}
              {rows.map(({ r, i }) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-1"><Input className="h-8 text-xs" value={r.veiculo} onChange={(e) => updateRow(i, { veiculo: e.target.value })} /></td>
                  <td className="p-1"><Input className="h-8 text-xs" value={r.placa} onChange={(e) => updateRow(i, { placa: e.target.value })} /></td>
                  <td className="p-1"><Input className="h-8 text-xs" value={r.empresa} onChange={(e) => updateRow(i, { empresa: e.target.value })} /></td>
                  <td className="p-1"><Input className="h-8 text-xs" value={r.origem} onChange={(e) => updateRow(i, { origem: e.target.value })} /></td>
                  <td className="p-1"><Input className="h-8 text-xs" value={r.destino} onChange={(e) => updateRow(i, { destino: e.target.value })} /></td>
                  <td className="p-1"><Input className="h-8 text-xs" value={r.patio} onChange={(e) => updateRow(i, { patio: e.target.value })} /></td>
                  <td className="p-1"><Input className="h-8 text-xs" value={r.valor} onChange={(e) => updateRow(i, { valor: e.target.value })} /></td>
                  <td className="p-1 text-center">
                    <Checkbox checked={r.pago} onCheckedChange={(v) => updateRow(i, { pago: !!v })} />
                  </td>
                  <td className="p-1"><Input className="h-8 text-xs" value={r.recebido_por} onChange={(e) => updateRow(i, { recebido_por: e.target.value })} /></td>
                  <td className="p-1 text-right">
                    <Button size="sm" variant="ghost" onClick={() => removeRow(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingId ? "Editar planilha" : "Nova planilha"}</DialogTitle>
          <DialogDescription>Preencha as linhas de IDA e VOLTA da viagem e as despesas.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Título</Label>
            <Input value={data.title} onChange={(e) => update("title", e.target.value)} />
          </div>
          <div>
            <Label>Data Ida</Label>
            <Input type="date" value={data.sheet_date} onChange={(e) => update("sheet_date", e.target.value)} />
          </div>
          <div>
            <Label>Data Volta</Label>
            <Input type="date" value={data.return_date} onChange={(e) => update("return_date", e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={data.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
        </div>

        <div className="space-y-6 mt-4">
          {renderSection("IDA", "ida")}
          {renderSection("VOLTA", "volta")}

          {/* Expenses Section */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary uppercase text-sm">Despesas</h3>
              <Button type="button" size="sm" variant="outline" onClick={addExpense}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar despesa
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(data.expenses || []).map((e) => (
                <div key={e.id} className="flex gap-2 items-end border p-2 rounded-md">
                  <div className="flex-1">
                    <Label className="text-[10px] uppercase">Descrição</Label>
                    <Input className="h-8 text-xs" value={e.description} onChange={(ev) => updateExpense(e.id, { description: ev.target.value })} />
                  </div>
                  <div className="w-28">
                    <Label className="text-[10px] uppercase">Pago por</Label>
                    <Input className="h-8 text-xs" value={e.paid_by ?? ""} onChange={(ev) => updateExpense(e.id, { paid_by: ev.target.value })} />
                  </div>
                  <div className="w-24">
                    <Label className="text-[10px] uppercase">Valor</Label>
                    <Input className="h-8 text-xs" value={e.value} onChange={(ev) => updateExpense(e.id, { value: ev.target.value })} />
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removeExpense(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-muted/50 p-4 rounded-lg flex flex-col items-end space-y-1">
            <div className="text-sm">Total Recebido: <span className="font-semibold">R$ {totals.received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div className="text-sm">Total Despesas: <span className="font-semibold">R$ {totals.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            
            {Object.keys(totals.spentByPayer).length > 0 && (
              <div className="mt-2 text-[10px] text-right text-muted-foreground uppercase border-t pt-1 w-full max-w-[200px]">
                <div className="font-semibold mb-1">Despesas por pagador:</div>
                {Object.entries(totals.spentByPayer).map(([payer, val]) => (
                  <div key={payer}>{payer}: R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                ))}
              </div>
            )}

            <div className="text-lg font-bold text-primary mt-2">VALOR TOTAL LIVRE: R$ {totals.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}