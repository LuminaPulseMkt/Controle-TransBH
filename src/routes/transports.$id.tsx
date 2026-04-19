import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  Truck, Package, XCircle, Clock, ImagePlus,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/transports/$id")({
  component: () => (
    <AuthGate>
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
  created_at: string;
  updated_at: string;
}

interface Photo { id: string; photo_url: string; caption: string | null; created_at: string; }
interface Receivable {
  id: string; client_name: string; amount: number; due_date: string;
  status: string; description: string | null; paid_at: string | null;
}

function TransportDetailPage() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const [transport, setTransport] = useState<Transport | null | "missing">(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const load = async () => {
    const [t, p, r] = await Promise.all([
      supabase.from("transports").select("*").eq("id", id).maybeSingle(),
      supabase.from("transport_photos").select("*").eq("transport_id", id).order("created_at", { ascending: true }),
      supabase.from("receivables").select("*").eq("transport_id", id).order("due_date", { ascending: true }),
    ]);
    if (!t.data) { setTransport("missing"); return; }
    setTransport(t.data as Transport);
    setPhotos((p.data ?? []) as Photo[]);
    setReceivables((r.data ?? []) as Receivable[]);
  };

  useEffect(() => { void load(); }, [id]);

  const updateStatus = async (status: string) => {
    if (!transport || transport === "missing") return;
    const { error } = await supabase.from("transports").update({ status }).eq("id", transport.id);
    if (error) return toast.error(error.message);
    toast.success(`Status: ${transportStatusLabel[status] ?? status}`);
    void load();
  };

  const uploadPhoto = async () => {
    if (!pendingFile) return toast.error("Selecione uma imagem.");
    if (!transport || transport === "missing") return;
    setUploading(true);
    const path = `${user?.id}/${transport.id}/${Date.now()}-${pendingFile.name.replace(/\s+/g, "_")}`;
    const up = await supabase.storage.from("transport-photos").upload(path, pendingFile);
    if (up.error) { toast.error(up.error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("transport-photos").getPublicUrl(path);
    const { error } = await supabase.from("transport_photos").insert({
      transport_id: transport.id, photo_url: data.publicUrl, caption: caption || null,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Foto adicionada.");
    setPendingFile(null); setCaption("");
    void load();
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

            <div className="border-t border-border/50 pt-4 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Adicionar foto</Label>
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <Input type="file" accept="image/*" onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)} />
                <Input placeholder="Legenda (opcional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
                <Button onClick={uploadPhoto} disabled={uploading || !pendingFile}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ImagePlus className="h-4 w-4 mr-1" /> Enviar</>}
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
