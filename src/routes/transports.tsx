import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TransportStatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR, vehicleTypeLabel, transportStatusLabel } from "@/lib/format";
import { Plus, Search, Image as ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/transports")({
  component: () => (
    <AuthGate>
      <TransportsPage />
    </AuthGate>
  ),
});

interface Transport {
  id: string;
  code: string;
  vehicle_plate: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  vehicle_chassis: string | null;
  vehicle_type: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  client_name: string;
  client_document: string | null;
  client_phone: string | null;
  driver_name: string | null;
  estimated_delivery: string | null;
  status: string;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

const emptyForm = {
  vehicle_plate: "",
  vehicle_brand: "",
  vehicle_model: "",
  vehicle_year: "",
  vehicle_color: "",
  vehicle_chassis: "",
  vehicle_type: "car",
  origin_city: "",
  origin_state: "",
  destination_city: "",
  destination_state: "",
  client_name: "",
  client_document: "",
  client_phone: "",
  driver_name: "",
  estimated_delivery: "",
  status: "pending",
  notes: "",
  photo_url: "",
};

function TransportsPage() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<Transport[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transport | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("transports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems(data ?? []);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.vehicle_plate.toLowerCase().includes(q) ||
        t.client_name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.origin_city.toLowerCase().includes(q) ||
        t.destination_city.toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (t: Transport) => {
    setEditing(t);
    setForm({
      vehicle_plate: t.vehicle_plate,
      vehicle_brand: t.vehicle_brand ?? "",
      vehicle_model: t.vehicle_model ?? "",
      vehicle_year: t.vehicle_year?.toString() ?? "",
      vehicle_color: t.vehicle_color ?? "",
      vehicle_chassis: t.vehicle_chassis ?? "",
      vehicle_type: t.vehicle_type,
      origin_city: t.origin_city,
      origin_state: t.origin_state,
      destination_city: t.destination_city,
      destination_state: t.destination_state,
      client_name: t.client_name,
      client_document: t.client_document ?? "",
      client_phone: t.client_phone ?? "",
      driver_name: t.driver_name ?? "",
      estimated_delivery: t.estimated_delivery ?? "",
      status: t.status,
      notes: t.notes ?? "",
      photo_url: t.photo_url ?? "",
    });
    setOpen(true);
  };

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${user?.id}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const { error } = await supabase.storage.from("transport-photos").upload(path, file);
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("transport-photos").getPublicUrl(path);
    setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    setUploading(false);
  };

  const save = async () => {
    if (!form.vehicle_plate || !form.client_name || !form.origin_city || !form.destination_city) {
      return toast.error("Preencha placa, cliente, origem e destino.");
    }
    setBusy(true);
    const payload = {
      ...form,
      vehicle_year: form.vehicle_year ? Number(form.vehicle_year) : null,
      estimated_delivery: form.estimated_delivery || null,
      vehicle_type: form.vehicle_type as any,
      status: form.status as any,
      created_by: user?.id ?? null,
    };
    const { error } = editing
      ? await supabase.from("transports").update(payload).eq("id", editing.id)
      : await supabase.from("transports").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Transporte atualizado." : "Transporte criado.");
    setOpen(false);
    void load();
  };

  const cancelTransport = async (t: Transport) => {
    if (!confirm(`Cancelar transporte ${t.code}?`)) return;
    const { error } = await supabase.from("transports").update({ status: "cancelled" }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Transporte cancelado.");
    void load();
  };

  const removeTransport = async (t: Transport) => {
    if (!confirm(`Remover ${t.code} permanentemente?`)) return;
    const { error } = await supabase.from("transports").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Removido.");
    void load();
  };

  return (
    <AppLayout
      title="Transportes"
      actions={
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo Transporte
        </Button>
      }
    >
      <Card className="p-4 mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por placa, cliente, código…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="in_transit">Em Trânsito</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {!items ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Nenhum transporte encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Veículo</th>
                  <th className="px-4 py-3">Rota</th>
                  <th className="px-4 py-3">Entrega</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
                    <td className="px-4 py-3">
                      <div>{t.client_name}</div>
                      {t.client_phone && (
                        <div className="text-xs text-muted-foreground">{t.client_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono uppercase">{t.vehicle_plate}</div>
                      <div className="text-xs text-muted-foreground">
                        {[t.vehicle_brand, t.vehicle_model].filter(Boolean).join(" ")}
                        {t.vehicle_type && ` · ${vehicleTypeLabel[t.vehicle_type]}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {t.origin_city}/{t.origin_state} →<br />
                      {t.destination_city}/{t.destination_state}
                    </td>
                    <td className="px-4 py-3 text-xs">{dateBR(t.estimated_delivery)}</td>
                    <td className="px-4 py-3"><TransportStatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>Editar</Button>
                      {t.status !== "cancelled" && (
                        <Button variant="ghost" size="sm" onClick={() => cancelTransport(t)}>
                          Cancelar
                        </Button>
                      )}
                      {isAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => removeTransport(t)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-display text-2xl">
              {editing ? `Editar ${editing.code}` : "Novo Transporte"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Placa *">
              <Input
                value={form.vehicle_plate}
                onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })}
                className="uppercase font-mono"
              />
            </Field>
            <Field label="Tipo">
              <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Carro</SelectItem>
                  <SelectItem value="motorcycle">Moto</SelectItem>
                  <SelectItem value="truck">Caminhão</SelectItem>
                  <SelectItem value="machinery">Maquinário</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Marca">
              <Input value={form.vehicle_brand} onChange={(e) => setForm({ ...form, vehicle_brand: e.target.value })} />
            </Field>
            <Field label="Modelo">
              <Input value={form.vehicle_model} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} />
            </Field>
            <Field label="Ano">
              <Input type="number" value={form.vehicle_year} onChange={(e) => setForm({ ...form, vehicle_year: e.target.value })} />
            </Field>
            <Field label="Cor">
              <Input value={form.vehicle_color} onChange={(e) => setForm({ ...form, vehicle_color: e.target.value })} />
            </Field>
            <Field label="Chassi" full>
              <Input value={form.vehicle_chassis} onChange={(e) => setForm({ ...form, vehicle_chassis: e.target.value })} />
            </Field>

            <Field label="Cidade origem *">
              <Input value={form.origin_city} onChange={(e) => setForm({ ...form, origin_city: e.target.value })} />
            </Field>
            <Field label="UF origem *">
              <Input maxLength={2} value={form.origin_state} onChange={(e) => setForm({ ...form, origin_state: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Cidade destino *">
              <Input value={form.destination_city} onChange={(e) => setForm({ ...form, destination_city: e.target.value })} />
            </Field>
            <Field label="UF destino *">
              <Input maxLength={2} value={form.destination_state} onChange={(e) => setForm({ ...form, destination_state: e.target.value.toUpperCase() })} />
            </Field>

            <Field label="Cliente *">
              <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </Field>
            <Field label="CPF/CNPJ">
              <Input value={form.client_document} onChange={(e) => setForm({ ...form, client_document: e.target.value })} />
            </Field>
            <Field label="Telefone">
              <Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} />
            </Field>
            <Field label="Motorista">
              <Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} />
            </Field>

            <Field label="Entrega estimada">
              <Input type="date" value={form.estimated_delivery} onChange={(e) => setForm({ ...form, estimated_delivery: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(transportStatusLabel).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Observações" full>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>

            <Field label="Foto do veículo" full>
              <div className="flex items-center gap-3">
                <Input type="file" accept="image/*" onChange={onPhotoChange} disabled={uploading} />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {form.photo_url && (
                  <a href={form.photo_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> ver
                  </a>
                )}
              </div>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

void brl;
