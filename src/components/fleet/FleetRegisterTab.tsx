import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
import { FLEET_KIND_LABEL, num, type FleetKind, type FleetVehicle } from "@/lib/fleet-types";
import { toast } from "sonner";

interface Form {
  id: string | null;
  kind: FleetKind;
  plate: string;
  model: string;
  year: string;
  capacity: string;
  driver_name: string;
  daily_rate: string;
  notes: string;
  is_active: boolean;
}

const blank = (kind: FleetKind): Form => ({
  id: null, kind, plate: "", model: "", year: "", capacity: "", driver_name: "", daily_rate: "", notes: "", is_active: true,
});

const fromVehicle = (v: FleetVehicle): Form => ({
  id: v.id,
  kind: v.kind,
  plate: v.plate,
  model: v.model ?? "",
  year: v.year != null ? String(v.year) : "",
  capacity: v.capacity ?? "",
  driver_name: v.driver_name ?? "",
  daily_rate: v.daily_rate != null ? String(v.daily_rate) : "",
  notes: v.notes ?? "",
  is_active: v.is_active,
});

export function FleetRegisterTab({ fleet, onChanged }: { fleet: FleetVehicle[]; onChanged: () => void }) {
  const { can, user } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const canEdit = can("transports.edit");

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const save = async () => {
    if (!form) return;
    const plate = form.plate.trim().toUpperCase();
    if (plate.length < 6) return toast.error("Informe a placa.");
    const payload = {
      kind: form.kind,
      plate,
      model: form.model.trim() || null,
      year: form.year.trim() ? parseInt(form.year, 10) || null : null,
      capacity: form.kind === "carreta" ? form.capacity.trim() || null : null,
      driver_name: form.driver_name.trim() || null,
      daily_rate: form.kind === "guincho" && form.daily_rate.trim() ? num(form.daily_rate) : null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };
    setSaving(true);
    const q = form.id
      ? supabase.from("fleet_vehicles").update(payload).eq("id", form.id).select("id")
      : supabase.from("fleet_vehicles").insert({ ...payload, created_by: user?.id ?? null }).select("id");
    const { data, error } = await q;
    setSaving(false);
    if (error) {
      return toast.error(error.code === "23505" ? "Já existe um veículo com essa placa neste tipo." : error.message);
    }
    if (!data || data.length === 0) return toast.error("Não foi possível salvar: sem permissão.");
    toast.success(form.id ? "Cadastro atualizado." : `${FLEET_KIND_LABEL[form.kind]} cadastrado.`);
    setForm(null);
    onChanged();
  };

  const remove = async (v: FleetVehicle) => {
    if (!confirm(`Excluir ${FLEET_KIND_LABEL[v.kind].toLowerCase()} ${v.plate}? As planilhas existentes são mantidas.`)) return;
    const { data, error } = await supabase.from("fleet_vehicles").delete().eq("id", v.id).select("id");
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) return toast.error("Sem permissão para excluir.");
    toast.success("Cadastro excluído.");
    onChanged();
  };

  const section = (kind: FleetKind, title: string) => {
    const list = fleet.filter((f) => f.kind === kind);
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
          {canEdit && (
            <Button size="sm" onClick={() => setForm(blank(kind))}>
              <Plus className="h-4 w-4 mr-1" /> Cadastrar {FLEET_KIND_LABEL[kind].toLowerCase()}
            </Button>
          )}
        </div>
        {list.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhum {FLEET_KIND_LABEL[kind].toLowerCase()} cadastrado.
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => (
              <Card key={v.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono font-semibold">{v.plate}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {[v.model, v.year].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  {!v.is_active && <Badge variant="secondary">Inativo</Badge>}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {v.driver_name && <div>Motorista: {v.driver_name}</div>}
                  {kind === "carreta" && v.capacity && <div>Capacidade: {v.capacity}</div>}
                  {kind === "guincho" && v.daily_rate != null && <div>Diária: {brl(v.daily_rate)}</div>}
                  {v.notes && <div className="line-clamp-2">{v.notes}</div>}
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setForm(fromVehicle(v))}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    {can("transports.delete") && (
                      <Button size="sm" variant="ghost" onClick={() => remove(v)} aria-label="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-8">
      {section("carreta", "Carretas")}
      {section("guincho", "Guinchos")}

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-lg">
          {form && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {form.id ? "Editar" : "Cadastrar"} {FLEET_KIND_LABEL[form.kind].toLowerCase()}
                </DialogTitle>
                <DialogDescription>
                  {form.kind === "guincho"
                    ? "Guinchos são cobrados por dia: informe a diária padrão."
                    : "Carretas (cegonhas) usadas nas viagens."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Placa</Label>
                  <Input className="uppercase" maxLength={8} value={form.plate} onChange={(e) => set({ plate: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input value={form.model} onChange={(e) => set({ model: e.target.value })} />
                </div>
                <div>
                  <Label>Ano</Label>
                  <Input inputMode="numeric" maxLength={4} value={form.year} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "") })} />
                </div>
                <div>
                  <Label>Motorista padrão</Label>
                  <Input value={form.driver_name} onChange={(e) => set({ driver_name: e.target.value })} />
                </div>
                {form.kind === "carreta" ? (
                  <div className="sm:col-span-2">
                    <Label>Capacidade (vagas)</Label>
                    <Input placeholder="Ex.: 9 veículos" value={form.capacity} onChange={(e) => set({ capacity: e.target.value })} />
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <Label>Valor da diária (R$)</Label>
                    <Input inputMode="decimal" value={form.daily_rate} onChange={(e) => set({ daily_rate: e.target.value })} />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
                </div>
                <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                  <Checkbox checked={form.is_active} onCheckedChange={(v) => set({ is_active: !!v })} />
                  Ativo
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Salvar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
