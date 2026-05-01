import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { Plus, Search, Loader2, X, Upload, MapPin, Send, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

type TransportsSearch = { status?: string };

export const Route = createFileRoute("/transports/")({
  validateSearch: (s: Record<string, unknown>): TransportsSearch => ({
    status: typeof s.status === "string" ? s.status : undefined,
  }),
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
  current_location: string | null;
  location_updated_at: string | null;
  created_at: string;
}

interface ExistingPhoto {
  id: string;
  photo_url: string;
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
  current_location: "",
  location_note: "",
};

function TransportsPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const initialSearch = Route.useSearch();
  const [items, setItems] = useState<Transport[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialSearch.status ?? "all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transport | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  // Multi-photo state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [extraPhotoUrls, setExtraPhotoUrls] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

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

  const resetPhotoState = () => {
    setPendingFiles([]);
    setExtraPhotoUrls([]);
    setExistingPhotos([]);
    setUploadProgress(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    resetPhotoState();
    setOpen(true);
  };

  const openEdit = async (t: Transport) => {
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
      current_location: t.current_location ?? "",
      location_note: "",
    });
    setPendingFiles([]);
    setExtraPhotoUrls([]);
    setUploadProgress(null);

    // Load existing gallery
    const { data, error } = await supabase
      .from("transport_photos")
      .select("id, photo_url")
      .eq("transport_id", t.id)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      setExistingPhotos([]);
    } else {
      setExistingPhotos(data ?? []);
    }
    setOpen(true);
  };

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeExtra = (url: string) => {
    setExtraPhotoUrls((prev) => prev.filter((u) => u !== url));
    if (form.photo_url === url) {
      setForm((f) => ({ ...f, photo_url: "" }));
    }
  };

  const removeExisting = async (photo: ExistingPhoto) => {
    if (!confirm("Remover esta foto?")) return;
    const { error } = await supabase.from("transport_photos").delete().eq("id", photo.id);
    if (error) return toast.error(error.message);
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    if (form.photo_url === photo.photo_url) {
      setForm((f) => ({ ...f, photo_url: "" }));
    }
    toast.success("Foto removida.");
  };

  const uploadPending = async (): Promise<string[]> => {
    if (pendingFiles.length === 0) return [];
    const total = pendingFiles.length;
    setUploadProgress({ done: 0, total });
    const uploaded: string[] = [];
    let failed = 0;

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${user?.id ?? "anon"}/${Date.now()}-${i}-${safeName}`;
      const { error } = await supabase.storage.from("transport-photos").upload(path, file);
      if (error) {
        failed++;
      } else {
        const { data } = supabase.storage.from("transport-photos").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setUploadProgress({ done: i + 1, total });
    }

    if (failed > 0) {
      toast.error(`${failed} de ${total} upload(s) falharam.`);
    }
    setPendingFiles([]);
    setUploadProgress(null);
    return uploaded;
  };

  const buildWhatsAppMessage = (t: { code: string; vehicle_plate: string; client_name: string; estimated_delivery: string | null }, location: string) => {
    const eta = t.estimated_delivery ? `Previsão de entrega: ${dateBR(t.estimated_delivery)}.` : "";
    return `Olá ${t.client_name}, atualização do transporte ${t.code} (${t.vehicle_plate}): seu veículo está em *${location}*. ${eta} — TransBH`;
  };

  const sendWhatsApp = (phone: string | null, message: string) => {
    const digits = (phone ?? "").replace(/\D/g, "");
    if (!digits) {
      toast.error("Cliente sem telefone cadastrado para WhatsApp.");
      return false;
    }
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  };

  const save = async (notifyWhatsApp = false) => {
    if (!form.vehicle_brand && !form.vehicle_model) {
      return toast.error("Informe ao menos a marca ou o modelo do veículo.");
    }
    if (!form.vehicle_plate || !form.client_name || !form.origin_city || !form.destination_city) {
      return toast.error("Preencha placa, cliente, origem e destino.");
    }
    if (notifyWhatsApp && !form.current_location.trim()) {
      return toast.error("Preencha a localização atual antes de notificar o cliente.");
    }
    setBusy(true);

    // 1. Upload new files first
    let newlyUploaded: string[] = [];
    try {
      newlyUploaded = await uploadPending();
    } catch (err: any) {
      setBusy(false);
      return toast.error(err?.message ?? "Erro no upload de fotos.");
    }
    const allExtras = [...extraPhotoUrls, ...newlyUploaded];

    // 2. Determine cover photo
    const cover =
      form.photo_url ||
      existingPhotos[0]?.photo_url ||
      allExtras[0] ||
      "";

    // Detect location change to bump location_updated_at
    const trimmedLocation = form.current_location.trim();
    const prevLocation = (editing?.current_location ?? "").trim();
    const locationChanged = trimmedLocation !== prevLocation;

    // Strip non-column field location_note before sending to DB
    const { location_note, ...formForDb } = form;

    const payload = {
      ...formForDb,
      photo_url: cover || null,
      current_location: trimmedLocation || null,
      location_updated_at: locationChanged && trimmedLocation
        ? new Date().toISOString()
        : editing?.location_updated_at ?? null,
      vehicle_year: form.vehicle_year ? Number(form.vehicle_year) : null,
      estimated_delivery: form.estimated_delivery || null,
      vehicle_type: form.vehicle_type as any,
      status: form.status as any,
      created_by: user?.id ?? null,
    };

    // 3. Save transport
    let transportId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("transports").update(payload).eq("id", editing.id);
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
    } else {
      const { data, error } = await supabase
        .from("transports")
        .insert(payload)
        .select("id")
        .single();
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
      transportId = data.id;
    }

    // 4. Insert new photo rows in transport_photos
    if (transportId && allExtras.length > 0) {
      const rows = allExtras.map((url) => ({ transport_id: transportId!, photo_url: url }));
      const { error: photoErr } = await supabase.from("transport_photos").insert(rows);
      if (photoErr) {
        toast.error(`Transporte salvo, mas falhou ao registrar fotos: ${photoErr.message}`);
      }
    }

    // 5. Insert location history row when location changed
    if (transportId && locationChanged && trimmedLocation) {
      const { error: locErr } = await supabase.from("transport_location_updates").insert({
        transport_id: transportId,
        location: trimmedLocation,
        note: location_note?.trim() || null,
        created_by: user?.id ?? null,
      });
      if (locErr) {
        toast.error(`Localização não pôde ser registrada no histórico: ${locErr.message}`);
      }
    }

    setBusy(false);
    toast.success(editing ? "Transporte atualizado." : "Transporte criado.");

    // 6. Notify client via WhatsApp if requested
    if (notifyWhatsApp && transportId && trimmedLocation) {
      const code = editing?.code ?? form.vehicle_plate;
      sendWhatsApp(form.client_phone, buildWhatsAppMessage(
        { code, vehicle_plate: form.vehicle_plate, client_name: form.client_name, estimated_delivery: form.estimated_delivery || null },
        trimmedLocation,
      ));
    }

    setOpen(false);
    setExtraPhotoUrls([]);

    if (!editing && form.client_name) {
      // Após criar, vai direto para as cobranças do cliente
      navigate({
        to: "/financial/clients/$name",
        params: { name: encodeURIComponent(form.client_name) },
      });
      return;
    }
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
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/transports/$id" params={{ id: t.id }}>Detalhes</Link>
                      </Button>
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

          <div className="space-y-5">
            {/* Identificação do veículo */}
            <section className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">
                Identificação do veículo
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Marca *">
                  <Input
                    value={form.vehicle_brand}
                    onChange={(e) => setForm({ ...form, vehicle_brand: e.target.value })}
                    placeholder="Ex.: Honda"
                  />
                </Field>
                <Field label="Modelo *">
                  <Input
                    value={form.vehicle_model}
                    onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
                    placeholder="Ex.: Civic"
                  />
                </Field>
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
                <Field label="Ano">
                  <Input
                    type="number"
                    value={form.vehicle_year}
                    onChange={(e) => setForm({ ...form, vehicle_year: e.target.value })}
                  />
                </Field>
                <Field label="Cor">
                  <Input value={form.vehicle_color} onChange={(e) => setForm({ ...form, vehicle_color: e.target.value })} />
                </Field>
              </div>
            </section>

            {/* Cliente + Rota + Logística + Observações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-4">
              {/* Rastreio / Localização */}
              <section className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Rastreio / Localização atual
                  </div>
                  {editing?.location_updated_at && (
                    <span className="text-[11px] text-muted-foreground">
                      Última atualização: {new Date(editing.location_updated_at).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
                <Field label="Onde o veículo está agora">
                  <Input
                    value={form.current_location}
                    onChange={(e) => setForm({ ...form, current_location: e.target.value })}
                    placeholder="Ex.: BR-381, km 412 — Betim/MG"
                  />
                </Field>
                <Field label="Comentário do motorista (opcional)">
                  <Textarea
                    rows={2}
                    value={form.location_note}
                    onChange={(e) => setForm({ ...form, location_note: e.target.value })}
                    placeholder="Ex.: parada técnica de 30min, retomando viagem em seguida."
                  />
                </Field>
                <p className="text-[11px] text-muted-foreground">
                  Ao salvar com uma nova localização, o histórico é registrado automaticamente.
                  Use o botão <strong>"Salvar e notificar"</strong> abaixo para enviar a atualização ao cliente via WhatsApp.
                </p>
              </section>

              <Field label="Observações">
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>

              <Field label="Fotos do veículo (selecione várias de uma vez)">
                <PhotoManager
                  existing={existingPhotos}
                  extras={extraPhotoUrls}
                  pending={pendingFiles}
                  cover={form.photo_url}
                  onSetCover={(url) => setForm((f) => ({ ...f, photo_url: url }))}
                  onRemoveExisting={removeExisting}
                  onRemoveExtra={removeExtra}
                  onRemovePending={removePending}
                  onFilesSelected={onFilesSelected}
                  disabled={busy}
                />
                {uploadProgress && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Enviando {uploadProgress.done} de {uploadProgress.total}…
                  </p>
                )}
              </Field>
            </div>

          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
            <Button
              variant="secondary"
              onClick={() => save(true)}
              disabled={busy || !form.current_location.trim() || !form.client_phone}
              title={
                !form.current_location.trim()
                  ? "Preencha a localização atual"
                  : !form.client_phone
                  ? "Cliente sem telefone cadastrado"
                  : "Salva e abre WhatsApp do cliente com a atualização"
              }
            >
              <Send className="h-4 w-4 mr-1" />
              Salvar e notificar cliente
            </Button>
            <Button onClick={() => save(false)} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {uploadProgress ? `Enviando ${uploadProgress.done}/${uploadProgress.total}…` : "Salvando…"}
                </>
              ) : pendingFiles.length > 0 ? (
                `Salvar e enviar ${pendingFiles.length} foto(s)`
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function PhotoManager({
  existing,
  extras,
  pending,
  cover,
  onSetCover,
  onRemoveExisting,
  onRemoveExtra,
  onRemovePending,
  onFilesSelected,
  disabled,
}: {
  existing: ExistingPhoto[];
  extras: string[];
  pending: File[];
  cover: string;
  onSetCover: (url: string) => void;
  onRemoveExisting: (p: ExistingPhoto) => void;
  onRemoveExtra: (url: string) => void;
  onRemovePending: (idx: number) => void;
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  // Object URLs for pending file previews
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = pending.map((f) => URL.createObjectURL(f));
    setPendingUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pending]);

  const totalCount = existing.length + extras.length + pending.length;

  return (
    <div className="space-y-3">
      {totalCount > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {existing.map((p) => (
            <PhotoTile
              key={`ex-${p.id}`}
              src={p.photo_url}
              isCover={cover === p.photo_url}
              onSetCover={() => onSetCover(p.photo_url)}
              onRemove={() => onRemoveExisting(p)}
              label="Salva"
            />
          ))}
          {extras.map((url) => (
            <PhotoTile
              key={`extra-${url}`}
              src={url}
              isCover={cover === url}
              onSetCover={() => onSetCover(url)}
              onRemove={() => onRemoveExtra(url)}
              label="Pronta"
            />
          ))}
          {pending.map((file, idx) => (
            <PhotoTile
              key={`p-${idx}-${file.name}`}
              src={pendingUrls[idx] ?? ""}
              isCover={false}
              onRemove={() => onRemovePending(idx)}
              label={`${(file.size / 1024).toFixed(0)} KB`}
              pending
            />
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={onFilesSelected}
          disabled={disabled}
          className="hidden"
        />
        <span className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent transition-colors">
          <Upload className="h-4 w-4" />
          Adicionar foto(s)
        </span>
        <span className="text-xs text-muted-foreground">
          {totalCount === 0 ? "Nenhuma foto adicionada" : `${totalCount} foto(s) no total`}
        </span>
      </label>
    </div>
  );
}

function PhotoTile({
  src,
  isCover,
  onSetCover,
  onRemove,
  label,
  pending,
}: {
  src: string;
  isCover: boolean;
  onSetCover?: () => void;
  onRemove: () => void;
  label?: string;
  pending?: boolean;
}) {
  return (
    <div className="relative group rounded-md overflow-hidden border border-border bg-muted aspect-square">
      {src ? (
        <img src={src} alt="foto veículo" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">…</div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-background/90 hover:bg-destructive hover:text-destructive-foreground rounded-full p-1 shadow"
        title="Remover"
      >
        <X className="h-3 w-3" />
      </button>
      {isCover && (
        <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded">
          Capa
        </span>
      )}
      {!isCover && onSetCover && !pending && (
        <button
          type="button"
          onClick={onSetCover}
          className="absolute bottom-1 left-1 bg-background/90 hover:bg-primary hover:text-primary-foreground text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Capa
        </button>
      )}
      {label && (
        <span className="absolute bottom-1 right-1 bg-background/90 text-[10px] px-1.5 py-0.5 rounded">
          {label}
        </span>
      )}
    </div>
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
