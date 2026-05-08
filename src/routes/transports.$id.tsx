import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TransportStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, dateBR, vehicleTypeLabel, transportStatusLabel } from "@/lib/format";
import {
  ArrowLeft, Upload, Loader2, Trash2, CheckCircle2,
  Truck, Package, XCircle, Clock, ImagePlus, MapPin, Send,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/transports/$id")({
  component: () => (
    <AuthGate requirePermission="transports.view">
      <TransportDetailPage />
    </AuthGate>
  ),
  notFoundComponent: () => (
    <AppLayout title="Não encontrado">
      <Card className="p-12 text-center">
        <p className="text-muted-foreground mb-4">Transporte não encontrado.</p>
        <Button asChild><Link to="/transports">Voltar</Link></Button>
      </Card>
    </AppLayout>
  ),
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <AppLayout title="Erro">
        <Card className="p-12 text-center">
          <p className="text-destructive mb-4">{error.message}</p>
          <Button onClick={() => router.invalidate()}>Tentar novamente</Button>
        </Card>
      </AppLayout>
    );
  },
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
  partner_id: string | null;
  partner_quoted_amount: number | null;
  partner_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PartnerLite {
  id: string;
  name: string;
  whatsapp: string | null;
  phone: string | null;
  default_amount: number;
}

interface LocationUpdate {
  id: string;
  location: string;
  note: string | null;
  created_at: string;
}

interface Photo { id: string; photo_url: string; caption: string | null; created_at: string; }
interface Receivable {
  id: string; client_name: string; amount: number; due_date: string;
  status: string; description: string | null; paid_at: string | null;
}

function TransportDetailPage() {
  const { id } = Route.useParams();
  const { user, isAdmin, can } = useAuth();
  const showValues = can("values.view");
  const [transport, setTransport] = useState<Transport | null | "missing">(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([]);
  const [partners, setPartners] = useState<PartnerLite[]>([]);
  const [partnerId, setPartnerId] = useState<string>("");
  const [partnerAmount, setPartnerAmount] = useState<string>("");
  const [savingPartner, setSavingPartner] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [newLocationNote, setNewLocationNote] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<Map<File, string>>(new Map());
  const previewUrlsRef = useRef<Map<File, string>>(new Map());

  // Manage preview URLs lifecycle to avoid leaks
  useEffect(() => {
    setPreviewUrls((prev) => {
      const next = new Map<File, string>();
      pendingFiles.forEach((f) => {
        next.set(f, prev.get(f) ?? URL.createObjectURL(f));
      });
      // Revoke removed
      prev.forEach((url, file) => {
        if (!next.has(file)) URL.revokeObjectURL(url);
      });
      previewUrlsRef.current = next;
      return next;
    });
  }, [pendingFiles]);

  // Revoke any remaining URLs on unmount (uses ref to avoid stale closure)
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = new Map();
    };
  }, []);

  const load = async () => {
    const [t, p, r, loc, pa] = await Promise.all([
      supabase.from("transports").select("*").eq("id", id).maybeSingle(),
      supabase.from("transport_photos").select("*").eq("transport_id", id).order("created_at", { ascending: true }),
      supabase.from("receivables").select("*").eq("transport_id", id).order("due_date", { ascending: true }),
      supabase.from("transport_location_updates").select("id, location, note, created_at").eq("transport_id", id).order("created_at", { ascending: false }).limit(20),
      supabase.from("partners").select("id, name, whatsapp, phone, default_amount").eq("is_active", true).order("name"),
    ]);
    if (!t.data) { setTransport("missing"); return; }
    const tr = t.data as Transport;
    setTransport(tr);
    setPhotos((p.data ?? []) as Photo[]);
    setReceivables((r.data ?? []) as Receivable[]);
    setLocationUpdates((loc.data ?? []) as LocationUpdate[]);
    setPartners((pa.data ?? []) as PartnerLite[]);
    setPartnerId(tr.partner_id ?? "");
    setPartnerAmount(tr.partner_quoted_amount != null ? String(tr.partner_quoted_amount) : "");
  };

  useEffect(() => { void load(); }, [id]);

  const updateStatus = async (status: string) => {
    if (!transport || transport === "missing") return;
    const { error } = await supabase.from("transports").update({ status: status as Transport["status"] as never }).eq("id", transport.id);
    if (error) return toast.error(error.message);
    toast.success(`Status: ${transportStatusLabel[status] ?? status}`);
    void load();
  };

  const buildWhatsAppMessage = (location: string) => {
    if (!transport || transport === "missing") return "";
    const eta = transport.estimated_delivery ? `Previsão de entrega: ${dateBR(transport.estimated_delivery)}.` : "";
    return `Olá ${transport.client_name}, atualização do transporte ${transport.code} (${transport.vehicle_plate}): seu veículo está em *${location}*. ${eta} — TransBH`;
  };

  const sendWhatsApp = (location: string) => {
    if (!transport || transport === "missing") return;
    const digits = (transport.client_phone ?? "").replace(/\D/g, "");
    if (!digits) {
      toast.error("Cliente sem telefone cadastrado para WhatsApp.");
      return;
    }
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(buildWhatsAppMessage(location))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const savePartner = async () => {
    if (!transport || transport === "missing") return;
    setSavingPartner(true);
    const amt = partnerAmount.trim() === "" ? null : Number(partnerAmount);
    const { error } = await supabase
      .from("transports")
      .update({
        partner_id: partnerId || null,
        partner_quoted_amount: amt,
      })
      .eq("id", transport.id);
    setSavingPartner(false);
    if (error) return toast.error(error.message);
    toast.success("Parceiro atualizado.");
    void load();
  };

  const sendPartnerWhatsApp = async () => {
    if (!transport || transport === "missing") return;
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) return toast.error("Selecione um parceiro.");
    const digits = (partner.whatsapp || partner.phone || "").replace(/\D/g, "");
    if (!digits) return toast.error("Parceiro sem WhatsApp cadastrado.");
    const t = transport;
    const vehicle = [t.vehicle_brand, t.vehicle_model, t.vehicle_year, t.vehicle_plate].filter(Boolean).join(" ");
    const trackingLink = `${window.location.origin}/transports/${t.id}`;
    const amt = partnerAmount.trim() === "" ? Number(partner.default_amount ?? 0) : Number(partnerAmount);
    const text =
      `Olá ${partner.name}! Tenho um transporte para você:\n\n` +
      `Código: ${t.code}\n` +
      `Cliente: ${t.client_name}\n` +
      `Veículo: ${vehicle}\n` +
      `Rota: ${t.origin_city}/${t.origin_state} → ${t.destination_city}/${t.destination_state}\n` +
      `Valor combinado: ${brl(amt)}\n` +
      (t.notes ? `\nObs: ${t.notes}\n` : "") +
      `\nAcompanhe: ${trackingLink}`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    await supabase
      .from("transports")
      .update({ partner_notified_at: new Date().toISOString(), partner_id: partner.id })
      .eq("id", t.id);
    void load();
  };

  const addLocationUpdate = async (notify: boolean) => {
    if (!transport || transport === "missing") return;
    const trimmed = newLocation.trim();
    if (!trimmed) return toast.error("Informe a localização atual.");
    setSavingLocation(true);

    const nowIso = new Date().toISOString();
    const { error: tErr } = await supabase
      .from("transports")
      .update({ current_location: trimmed, location_updated_at: nowIso })
      .eq("id", transport.id);
    if (tErr) {
      setSavingLocation(false);
      return toast.error(tErr.message);
    }

    const { error: hErr } = await supabase.from("transport_location_updates").insert({
      transport_id: transport.id,
      location: trimmed,
      note: newLocationNote.trim() || null,
      created_by: user?.id ?? null,
    });
    if (hErr) toast.error(`Histórico não registrado: ${hErr.message}`);

    setSavingLocation(false);
    toast.success("Localização atualizada.");
    setNewLocation("");
    setNewLocationNote("");
    if (notify) sendWhatsApp(trimmed);
    void load();
  };

  const uploadPhotos = async () => {
    if (pendingFiles.length === 0) return toast.error("Selecione ao menos uma imagem.");
    if (!transport || transport === "missing") return;
    const t = transport;
    setUploading(true);
    const total = pendingFiles.length;
    setUploadProgress({ done: 0, total });
    let ok = 0;
    let failed = 0;
    let firstErrMessage = "";

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      try {
        const path = `${user?.id}/${t.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/\s+/g, "_")}`;
        const up = await supabase.storage.from("transport-photos").upload(path, file);
        if (up.error) throw new Error(up.error.message);
        const { data } = supabase.storage.from("transport-photos").getPublicUrl(path);
        const { error } = await supabase.from("transport_photos").insert({
          transport_id: t.id, photo_url: data.publicUrl, caption: caption || null,
        });
        if (error) throw new Error(error.message);
        ok += 1;
      } catch (err: any) {
        failed += 1;
        if (!firstErrMessage) firstErrMessage = err?.message ?? "erro desconhecido";
      }
      setUploadProgress({ done: i + 1, total });
    }

    setUploading(false);
    setUploadProgress(null);

    if (failed === 0) {
      toast.success(`${ok} ${ok === 1 ? "foto adicionada" : "fotos adicionadas"}.`);
    } else if (ok === 0) {
      toast.error(`Falha ao enviar ${failed} ${failed === 1 ? "foto" : "fotos"}: ${firstErrMessage}`);
    } else {
      toast.warning(`${ok} enviadas, ${failed} falharam: ${firstErrMessage}`);
    }

    setPendingFiles([]);
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    void load();
  };

  const removePending = (file: File) => {
    setPendingFiles((prev) => prev.filter((f) => f !== file));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const removePhoto = async (photo: Photo) => {
    if (!confirm("Remover foto?")) return;
    const { error } = await supabase.from("transport_photos").delete().eq("id", photo.id);
    if (error) return toast.error(error.message);
    toast.success("Removida.");
    void load();
  };

  if (transport === null) {
    return (
      <AppLayout title="Carregando…">
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
      </AppLayout>
    );
  }

  if (transport === "missing") {
    return (
      <AppLayout title="Não encontrado">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">Transporte não encontrado.</p>
          <Button asChild><Link to="/transports">Voltar</Link></Button>
        </Card>
      </AppLayout>
    );
  }

  const t = transport;
  const totalReceivable = receivables.reduce((s, r) => s + Number(r.amount), 0);
  const paidReceivable = receivables.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <AppLayout
      title={t.code}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/transports"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Veículo</div>
                <h2 className="text-display text-3xl font-mono">{t.vehicle_plate}</h2>
                <div className="text-sm text-muted-foreground mt-1">
                  {[t.vehicle_brand, t.vehicle_model, t.vehicle_year].filter(Boolean).join(" ")}
                  {t.vehicle_color && ` · ${t.vehicle_color}`}
                  {` · ${vehicleTypeLabel[t.vehicle_type] ?? t.vehicle_type}`}
                </div>
              </div>
              <TransportStatusBadge status={t.status} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Info label="Chassi" value={t.vehicle_chassis} mono />
              <Info label="Origem" value={`${t.origin_city}/${t.origin_state}`} />
              <Info label="Destino" value={`${t.destination_city}/${t.destination_state}`} />
              <Info label="Cliente" value={t.client_name} />
              <Info label="CPF/CNPJ" value={t.client_document} />
              <Info label="Telefone" value={t.client_phone} />
              <Info label="Motorista" value={t.driver_name} />
              <Info label="Entrega prevista" value={dateBR(t.estimated_delivery)} />
              <Info label="Criado em" value={dateBR(t.created_at)} />
            </div>

            {t.notes && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Observações</div>
                <p className="text-sm whitespace-pre-wrap">{t.notes}</p>
              </div>
            )}

            {t.status !== "cancelled" && t.status !== "delivered" && (
              <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2">
                {t.status === "pending" && (
                  <Button size="sm" onClick={() => updateStatus("in_transit")}>
                    <Truck className="h-4 w-4 mr-1" /> Iniciar trânsito
                  </Button>
                )}
                {t.status === "in_transit" && (
                  <Button size="sm" onClick={() => updateStatus("delivered")}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar entregue
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => updateStatus("cancelled")}>
                  <XCircle className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            )}
          </Card>

          {/* Tracking / current location */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-display text-xl">Rastreio</h3>
              </div>
              {t.location_updated_at && (
                <span className="text-xs text-muted-foreground">
                  Atualizado em {new Date(t.location_updated_at).toLocaleString("pt-BR")}
                </span>
              )}
            </div>

            {t.current_location ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mb-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Localização atual</div>
                <div className="font-medium">{t.current_location}</div>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => sendWhatsApp(t.current_location ?? "")}
                    disabled={!t.client_phone}
                    title={t.client_phone ? "Abre WhatsApp do cliente" : "Cliente sem telefone cadastrado"}
                  >
                    <Send className="h-4 w-4 mr-1" /> Enviar atualização ao cliente
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-3">Nenhuma localização registrada ainda.</p>
            )}

            <div className="space-y-2 mb-4">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Registrar nova localização</Label>
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Ex.: BR-381, km 412 — Betim/MG"
                disabled={savingLocation}
              />
              <Input
                value={newLocationNote}
                onChange={(e) => setNewLocationNote(e.target.value)}
                placeholder="Comentário do motorista (opcional)"
                disabled={savingLocation}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => addLocationUpdate(false)}
                  disabled={savingLocation || !newLocation.trim()}
                >
                  {savingLocation ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MapPin className="h-4 w-4 mr-1" />}
                  Salvar localização
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => addLocationUpdate(true)}
                  disabled={savingLocation || !newLocation.trim() || !t.client_phone}
                  title={!t.client_phone ? "Cliente sem telefone cadastrado" : "Salva e abre WhatsApp do cliente"}
                >
                  <Send className="h-4 w-4 mr-1" /> Salvar e notificar cliente
                </Button>
              </div>
            </div>

            {locationUpdates.length > 0 && (
              <div className="border-t border-border/50 pt-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Histórico</div>
                <ol className="space-y-2">
                  {locationUpdates.map((u) => (
                    <li key={u.id} className="text-sm border-l-2 border-primary/40 pl-3">
                      <div className="font-medium">{u.location}</div>
                      {u.note && <div className="text-xs text-muted-foreground italic">{u.note}</div>}
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(u.created_at).toLocaleString("pt-BR")}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Card>

          {/* Partner */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Send className="h-5 w-5 text-primary" />
              <h3 className="text-display text-xl">Parceiro responsável</h3>
            </div>
            {partners.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum parceiro ativo cadastrado. <Link to="/partners" className="text-primary underline">Cadastrar agora</Link>.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Parceiro</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={partnerId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setPartnerId(newId);
                        const p = partners.find((x) => x.id === newId);
                        if (p && !partnerAmount) setPartnerAmount(String(p.default_amount ?? ""));
                      }}
                    >
                      <option value="">— Sem parceiro —</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}{showValues ? ` · ${brl(Number(p.default_amount ?? 0))}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {showValues && (
                    <div className="space-y-1">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Valor combinado</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={partnerAmount}
                        onChange={(e) => setPartnerAmount(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={savePartner} disabled={savingPartner}>
                    {savingPartner ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Salvar parceiro
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={sendPartnerWhatsApp}
                    disabled={!partnerId}
                  >
                    <Send className="h-4 w-4 mr-1" /> Enviar via WhatsApp
                  </Button>
                </div>
                {t.partner_notified_at && (
                  <p className="text-xs text-muted-foreground">
                    Parceiro notificado em {new Date(t.partner_notified_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Photo gallery */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-display text-xl">Galeria de Fotos</h3>
              <span className="text-xs text-muted-foreground">{photos.length} {photos.length === 1 ? "foto" : "fotos"}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {t.photo_url && (
                <a href={t.photo_url} target="_blank" rel="noopener noreferrer" className="group block">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted relative">
                    <img src={t.photo_url} alt="Foto principal" className="h-full w-full object-cover" loading="lazy" />
                    <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider bg-primary/90 text-primary-foreground px-1.5 py-0.5 rounded">Principal</span>
                  </div>
                </a>
              )}
              {photos.map((p) => (
                <div key={p.id} className="group relative">
                  <a href={p.photo_url} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={p.photo_url} alt={p.caption ?? ""} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  </a>
                  {p.caption && <div className="text-xs text-muted-foreground mt-1 truncate">{p.caption}</div>}
                  <button
                    onClick={() => removePhoto(p)}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Remover foto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {!t.photo_url && photos.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8 text-sm">
                  Nenhuma foto ainda.
                </div>
              )}
            </div>

            <div className="border-t border-border/50 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Adicionar fotos</Label>
                {pendingFiles.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {pendingFiles.length} {pendingFiles.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}
                  </span>
                )}
              </div>

              {pendingFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {pendingFiles.map((file, idx) => {
                    const url = previewUrls.get(file);
                    return (
                      <div key={`${file.name}-${idx}`} className="relative group rounded-lg border border-border/50 overflow-hidden bg-muted">
                        <div className="aspect-square">
                          {url && <img src={url} alt={file.name} className="h-full w-full object-cover" />}
                        </div>
                        <div className="px-1.5 py-1 text-[10px] leading-tight">
                          <div className="truncate font-medium" title={file.name}>{file.name}</div>
                          <div className="text-muted-foreground">{formatSize(file.size)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePending(file)}
                          disabled={uploading}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 backdrop-blur flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground transition disabled:opacity-50"
                          aria-label="Remover da fila"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0) setPendingFiles((prev) => [...prev, ...files]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                <Input
                  placeholder="Legenda (opcional, aplicada a todas)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={uploading}
                />
                <Button onClick={uploadPhotos} disabled={uploading || pendingFiles.length === 0}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      {uploadProgress ? `${uploadProgress.done}/${uploadProgress.total}` : "Enviando…"}
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4 mr-1" /> Enviar{pendingFiles.length > 0 ? ` (${pendingFiles.length})` : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Receivables */}
          {isAdmin && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-display text-xl">Recebíveis Vinculados</h3>
                <div className="text-sm text-right">
                  <div className="text-muted-foreground text-xs">Total · Pago</div>
                  <div className="font-mono"><span className="text-primary">{brl(totalReceivable)}</span> · <span className="text-success">{brl(paidReceivable)}</span></div>
                </div>
              </div>
              {receivables.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum recebível vinculado a este transporte.</p>
              ) : (
                <div className="space-y-2">
                  {receivables.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.description ?? r.client_name}</div>
                        <div className="text-xs text-muted-foreground">Vence {dateBR(r.due_date)}{r.paid_at && ` · Pago ${dateBR(r.paid_at)}`}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-semibold">{brl(Number(r.amount))}</span>
                        <PaymentStatusBadge status={r.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Timeline column */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-display text-xl mb-4">Linha do Tempo</h3>
            <Timeline transport={t} />
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function Info({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value || "—"}</div>
    </div>
  );
}

function Timeline({ transport }: { transport: Transport }) {
  const steps: { key: string; label: string; date: string | null; icon: any; reached: boolean; cancelled?: boolean }[] = [
    {
      key: "created",
      label: "Transporte criado",
      date: transport.created_at,
      icon: Package,
      reached: true,
    },
    {
      key: "in_transit",
      label: "Em trânsito",
      date: transport.status === "in_transit" || transport.status === "delivered" ? transport.updated_at : null,
      icon: Truck,
      reached: transport.status === "in_transit" || transport.status === "delivered",
    },
    {
      key: "delivered",
      label: "Entregue",
      date: transport.status === "delivered" ? transport.updated_at : null,
      icon: CheckCircle2,
      reached: transport.status === "delivered",
    },
  ];

  if (transport.estimated_delivery && transport.status !== "delivered" && transport.status !== "cancelled") {
    steps.push({
      key: "estimated",
      label: "Entrega prevista",
      date: transport.estimated_delivery,
      icon: Clock,
      reached: false,
    });
  }

  if (transport.status === "cancelled") {
    steps.push({
      key: "cancelled",
      label: "Cancelado",
      date: transport.updated_at,
      icon: XCircle,
      reached: true,
      cancelled: true,
    });
  }

  return (
    <ol className="relative border-l border-border/60 ml-3 space-y-5">
      {steps.map((s) => {
        const Icon = s.icon;
        return (
          <li key={s.key} className="ml-6">
            <span
              className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${
                s.cancelled
                  ? "bg-destructive text-destructive-foreground"
                  : s.reached
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className={`text-sm font-medium ${s.reached ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </div>
            <div className="text-xs text-muted-foreground">{s.date ? dateBR(s.date) : "Pendente"}</div>
          </li>
        );
      })}
    </ol>
  );
}
