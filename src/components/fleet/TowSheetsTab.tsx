import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarPlus, Download, FileSpreadsheet, Loader2, MessageCircle, Pencil, Plus, Save, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCompanyInfo } from "@/lib/use-company-info";
import { dateBR } from "@/lib/format";
import { exportCSV } from "@/lib/exporters";
import { emptyExpense, type ExpenseRow } from "@/lib/trip-sheet-types";
import {
  brlText, emptyTowRow, emptyTowSheet, fleetLabel,
  type FleetVehicle, type TowRow, type TowSheetData,
} from "@/lib/fleet-types";
import { exportTowSheetPDF, towSheetTotals } from "@/lib/tow-sheet-pdf";
import { toast } from "sonner";

interface SheetRow extends TowSheetData {
  id: string;
  created_at: string;
}

const db = () => supabase as unknown as { from: (t: string) => any };

export function TowSheetsTab({ fleet }: { fleet: FleetVehicle[] }) {
  const { user } = useAuth();
  const company = useCompanyInfo();
  const [items, setItems] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SheetRow | null>(null);
  const [creating, setCreating] = useState(false);

  const guinchos = useMemo(() => fleet.filter((f) => f.kind === "guincho"), [fleet]);
  const labelOf = (s: TowSheetData) => {
    const v = fleet.find((f) => f.id === s.fleet_vehicle_id);
    return v ? fleetLabel(v) : "";
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await db()
      .from("tow_sheets")
      .select("*")
      .order("period_start", { ascending: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setItems((data ?? []) as SheetRow[]);
  };

  useEffect(() => { void load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir esta planilha de guincho?")) return;
    const { data, error } = await db().from("tow_sheets").delete().eq("id", id).select("id");
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) return toast.error("Sem permissão para excluir esta planilha.");
    toast.success("Planilha excluída.");
    setItems((xs) => xs.filter((x) => x.id !== id));
  };

  const pdf = async (s: SheetRow) => {
    try {
      await exportTowSheetPDF(s, labelOf(s), company);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const csv = (s: SheetRow) => {
    const rows: (string | number)[][] = [...s.rows]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => [dateBR(r.date), r.cliente, r.local, r.servico, r.veiculos, r.valor, r.pago ? "SIM" : "NÃO", r.recebido_por]);
    if (s.expenses.length) {
      rows.push([]);
      rows.push(["DESPESAS", "Descrição", "Pago por", "Valor"]);
      s.expenses.forEach((e) => rows.push(["", e.description, e.paid_by ?? "", e.value]));
    }
    exportCSV(`guincho-${s.period_start}.csv`, ["Data", "Cliente", "Local", "Serviço", "Veículos", "Diária", "Pago", "Recebido por"], rows);
  };

  const whatsapp = async (s: SheetRow) => {
    await pdf(s);
    const t = towSheetTotals(s);
    const text = `Guincho ${labelOf(s) || s.title} — ${dateBR(s.period_start)}${s.period_end ? ` a ${dateBR(s.period_end)}` : ""}\n${t.days} diária(s) · ${brlText(t.total)}\n(PDF baixado no seu dispositivo — anexe na conversa)`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            Guinchos são cobrados por <b>dia</b>: cada linha é uma diária, não uma viagem.
          </p>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova planilha de guincho
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Nenhuma planilha de guincho criada ainda.
          </Card>
        )}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => {
            const t = towSheetTotals(s);
            return (
              <Card key={s.id} className="p-4 space-y-3">
                <div>
                  <div className="font-medium truncate">{s.title}</div>
                  <div className="text-xs text-primary truncate">{labelOf(s) || "Sem guincho vinculado"}</div>
                  <div className="text-xs text-muted-foreground">
                    {dateBR(s.period_start)}{s.period_end ? ` a ${dateBR(s.period_end)}` : ""} · {t.days} dia(s) · {brlText(t.total)}
                  </div>
                  {t.pending > 0 && <div className="text-xs text-amber-600">A pagar: {brlText(t.pending)}</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => pdf(s)}>
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => csv(s)}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => whatsapp(s)}>
                    <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)} aria-label="Excluir planilha">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {(creating || editing) && (
        <TowSheetEditor
          guinchos={guinchos}
          initial={editing ?? emptyTowSheet()}
          existingId={editing?.id ?? null}
          userId={user?.id ?? ""}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); void load(); }}
        />
      )}
    </>
  );
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function TowSheetEditor({
  guinchos, initial, existingId, userId, onClose, onSaved,
}: {
  guinchos: FleetVehicle[];
  initial: TowSheetData;
  existingId: string | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<TowSheetData>(initial);
  const [saving, setSaving] = useState(false);

  const vehicle = guinchos.find((g) => g.id === data.fleet_vehicle_id) ?? null;
  const rate = vehicle?.daily_rate != null ? String(vehicle.daily_rate) : "";

  const update = <K extends keyof TowSheetData>(k: K, v: TowSheetData[K]) => setData((d) => ({ ...d, [k]: v }));
  const updateRow = (id: string, patch: Partial<TowRow>) =>
    setData((d) => ({ ...d, rows: d.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const removeRow = (id: string) => setData((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== id) }));

  const addDay = () =>
    setData((d) => {
      const last = [...d.rows].sort((a, b) => a.date.localeCompare(b.date)).pop();
      const date = last ? addDays(last.date, 1) : d.period_start;
      return { ...d, rows: [...d.rows, emptyTowRow(date, rate)] };
    });

  const fillPeriod = () => {
    if (!data.period_end || data.period_end < data.period_start) {
      return toast.error("Informe o período (início e fim) para gerar os dias.");
    }
    const existing = new Set(data.rows.map((r) => r.date));
    const added: TowRow[] = [];
    for (let day = data.period_start; day <= data.period_end && added.length < 62; day = addDays(day, 1)) {
      if (!existing.has(day)) added.push(emptyTowRow(day, rate));
    }
    setData((d) => ({ ...d, rows: [...d.rows, ...added] }));
    toast.success(`${added.length} dia(s) adicionado(s).`);
  };

  const onPickVehicle = (id: string) => {
    const g = guinchos.find((x) => x.id === id) ?? null;
    setData((d) => ({
      ...d,
      fleet_vehicle_id: g ? g.id : null,
      driver_name: g?.driver_name && !d.driver_name ? g.driver_name : d.driver_name,
    }));
  };

  const addExpense = () => setData((d) => ({ ...d, expenses: [...d.expenses, emptyExpense()] }));
  const updateExpense = (id: string, patch: Partial<ExpenseRow>) =>
    setData((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const removeExpense = (id: string) => setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }));

  const totals = towSheetTotals(data);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const payload = {
      title: data.title || "Planilha de Guincho",
      fleet_vehicle_id: data.fleet_vehicle_id || null,
      driver_name: data.driver_name || null,
      period_start: data.period_start,
      period_end: data.period_end || null,
      phone: data.phone || null,
      rows: data.rows,
      expenses: data.expenses,
    };
    const q = existingId
      ? db().from("tow_sheets").update(payload).eq("id", existingId).select("id")
      : db().from("tow_sheets").insert({ ...payload, created_by: userId }).select("id");
    const { data: saved, error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    if (!saved || saved.length === 0) return toast.error("Não foi possível salvar: sem permissão.");
    toast.success(existingId ? "Planilha atualizada." : "Planilha criada.");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingId ? "Editar planilha de guincho" : "Nova planilha de guincho"}</DialogTitle>
          <DialogDescription>Uma linha por dia trabalhado, com o valor da diária.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Label>Guincho</Label>
            <Select value={data.fleet_vehicle_id ?? undefined} onValueChange={onPickVehicle}>
              <SelectTrigger>
                <SelectValue placeholder={guinchos.length ? "Selecione" : "Cadastre um guincho na aba Cadastro"} />
              </SelectTrigger>
              <SelectContent>
                {guinchos
                  .filter((g) => g.is_active || g.id === data.fleet_vehicle_id)
                  .map((g) => <SelectItem key={g.id} value={g.id}>{fleetLabel(g)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motorista</Label>
            <Input value={data.driver_name} onChange={(e) => update("driver_name", e.target.value)} />
          </div>
          <div>
            <Label>Início</Label>
            <Input type="date" value={data.period_start} onChange={(e) => update("period_start", e.target.value)} />
          </div>
          <div>
            <Label>Fim</Label>
            <Input type="date" value={data.period_end} onChange={(e) => update("period_end", e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={data.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div className="md:col-span-3 lg:col-span-6">
            <Label>Título</Label>
            <Input value={data.title} onChange={(e) => update("title", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-primary">Diárias</h3>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={fillPeriod}>
                <CalendarPlus className="h-4 w-4 mr-1" /> Gerar dias do período
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={addDay}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar dia
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto border border-border rounded-md">
            <table className="w-full text-xs min-w-[1000px]">
              <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Data</th>
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Local</th>
                  <th className="text-left p-2">Serviço</th>
                  <th className="text-left p-2">Veículos</th>
                  <th className="text-left p-2">Diária</th>
                  <th className="text-center p-2 w-16">Pago</th>
                  <th className="text-left p-2">Recebido por</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr><td colSpan={9} className="p-3 text-center text-muted-foreground">Nenhum dia lançado</td></tr>
                )}
                {[...data.rows].sort((a, b) => a.date.localeCompare(b.date)).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-1"><Input type="date" className="h-8 text-xs" value={r.date} onChange={(e) => updateRow(r.id, { date: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 text-xs" value={r.cliente} onChange={(e) => updateRow(r.id, { cliente: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 text-xs" value={r.local} onChange={(e) => updateRow(r.id, { local: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 text-xs" value={r.servico} onChange={(e) => updateRow(r.id, { servico: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 text-xs" value={r.veiculos} onChange={(e) => updateRow(r.id, { veiculos: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 text-xs w-24" inputMode="decimal" value={r.valor} onChange={(e) => updateRow(r.id, { valor: e.target.value })} /></td>
                    <td className="p-1 text-center"><Checkbox checked={r.pago} onCheckedChange={(v) => updateRow(r.id, { pago: !!v })} /></td>
                    <td className="p-1"><Input className="h-8 text-xs" value={r.recebido_por} onChange={(e) => updateRow(r.id, { recebido_por: e.target.value })} /></td>
                    <td className="p-1 text-right">
                      <Button size="sm" variant="ghost" onClick={() => removeRow(r.id)} aria-label="Remover dia">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary uppercase text-sm">Despesas</h3>
              <Button type="button" size="sm" variant="outline" onClick={addExpense}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar despesa
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.expenses.map((e) => (
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
                    <Input className="h-8 text-xs" inputMode="decimal" value={e.value} onChange={(ev) => updateExpense(e.id, { value: ev.target.value })} />
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removeExpense(e.id)} aria-label="Remover despesa">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg flex flex-col items-end space-y-1">
            <div className="text-sm">Dias trabalhados: <span className="font-semibold">{totals.days}</span></div>
            <div className="text-sm">Total de diárias: <span className="font-semibold">{brlText(totals.total)}</span></div>
            <div className="text-sm">
              Já pago: <span className="font-semibold">{brlText(totals.paid)}</span> · A pagar:{" "}
              <span className="font-semibold">{brlText(totals.pending)}</span>
            </div>
            <div className="text-sm">Total despesas: <span className="font-semibold">{brlText(totals.expenses)}</span></div>
            <div className="text-lg font-bold text-primary mt-2">VALOR LIVRE: {brlText(totals.net)}</div>
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
