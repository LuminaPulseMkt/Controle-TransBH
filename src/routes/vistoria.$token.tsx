import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { VistoriaReport } from "@/components/vistoria/VistoriaReport";
import { VistoriaSignature } from "@/components/vistoria/VistoriaSignature";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Lock, RefreshCw, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadVistoriaPhoto } from "@/lib/vistoria-upload";
import { exportVistoriaPDF } from "@/lib/vistoria-pdf";
import {
  FUEL_STEPS, PART_STATES, TIRE_BRANDS, TIRE_SLOTS, TIRE_STATES, VISTORIA_DOCUMENTS, VISTORIA_KIND_LABEL,
  VISTORIA_PARTS, VISTORIA_PHOTOS, formatCpf, normalizeVistoriaData, validateChecks, validateClient,
  validateDriver, validateGeneral, validatePhotos,
  type PartState, type PhotoSlot, type VistoriaData, type VistoriaPayload,
} from "@/lib/vistoria-types";

export const Route = createFileRoute("/vistoria/$token")({
  head: () => ({
    meta: [{ title: "Vistoria do veículo — TransBH" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: VistoriaPage,
});

const STEPS = ["Motorista", "Geral", "Questionário", "Fotos", "Documentos", "Cliente", "Revisão"] as const;
const LAST = STEPS.length - 1;

function VistoriaPage() {
  const { token } = Route.useParams();
  const [payload, setPayload] = useState<VistoriaPayload | null>(null);
  const [data, setData] = useState<VistoriaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [company, setCompany] = useState<{ name: string | null; logo_url: string | null } | null>(null);
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: res, error }, { data: comp }] = await Promise.all([
        supabase.rpc("get_vistoria_by_token", { _token: token }),
        supabase.rpc("get_public_company_info").maybeSingle(),
      ]);
      if (!active) return;
      if (error || !res) {
        setNotFound(true);
      } else {
        const p = res as unknown as VistoriaPayload;
        setPayload(p);
        setData(normalizeVistoriaData(p.data));
        setCompany(comp ? { name: comp.name, logo_url: comp.logo_url } : null);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [token]);

  const update = useCallback((fn: (d: VistoriaData) => VistoriaData) => {
    dirty.current = true;
    setData((prev) => (prev ? fn(prev) : prev));
  }, []);

  // Salvamento automático (rascunho) — o link pode ser retomado depois.
  useEffect(() => {
    if (!data || !dirty.current || payload?.status === "finalizada") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.rpc("save_vistoria_by_token", {
        _token: token,
        _data: data as never,
        _finalize: false,
      });
      if (error) console.error("autosave", error.message);
      else dirty.current = false;
    }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [data, token, payload?.status]);

  if (loading) {
    return (
      <Shell>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full mt-4" />
      </Shell>
    );
  }

  if (notFound || !payload || !data) {
    return (
      <Shell>
        <Card className="p-8 text-center space-y-2">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <h1 className="text-lg font-semibold">Link de vistoria inválido</h1>
          <p className="text-sm text-muted-foreground">Confira o link recebido ou solicite um novo à TransBH.</p>
        </Card>
      </Shell>
    );
  }

  if (payload.expired) {
    return (
      <Shell>
        <Card className="p-8 text-center space-y-2">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <h1 className="text-lg font-semibold">Este link expirou</h1>
          <p className="text-sm text-muted-foreground">Solicite um novo link de vistoria à TransBH.</p>
        </Card>
      </Shell>
    );
  }

  const t = payload.transport;
  const vehicleName = [t.vehicle_brand, t.vehicle_model].filter(Boolean).join(" ") || "Veículo";
  const kindLabel = VISTORIA_KIND_LABEL[payload.kind];

  if (payload.status === "finalizada") {
    return (
      <Shell>
        <Card className="p-6 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600" />
          <h1 className="text-lg font-semibold">Vistoria de {kindLabel.toLowerCase()} finalizada</h1>
          <p className="text-sm text-muted-foreground">
            {vehicleName} · {t.vehicle_plate}
          </p>
          <Button onClick={() => exportVistoriaPDF({ kind: payload.kind, data, transport: t, finishedAt: payload.finished_at, company })}>
            <Download className="h-4 w-4 mr-1" /> Baixar PDF
          </Button>
        </Card>
        <div className="mt-4">
          <VistoriaReport data={data} transport={t} />
        </div>
      </Shell>
    );
  }

  const step = Math.min(data.step ?? 0, LAST);
  const goTo = (n: number) => {
    update((d) => ({ ...d, step: n }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validators: (((d: VistoriaData) => string | null) | null)[] = [
    validateDriver, validateGeneral, validateChecks, validatePhotos, null, validateClient, null,
  ];

  const next = () => {
    const err = validators[step]?.(data) ?? null;
    if (err) return toast.error(err);
    goTo(step + 1);
  };

  const finalize = async () => {
    for (const v of validators) {
      const err = v?.(data) ?? null;
      if (err) return toast.error(err);
    }
    setFinalizing(true);
    const { error } = await supabase.rpc("save_vistoria_by_token", {
      _token: token,
      _data: data as never,
      _finalize: true,
    });
    setFinalizing(false);
    if (error) return toast.error("Não foi possível finalizar: " + error.message);
    dirty.current = false;
    setPayload({ ...payload, status: "finalizada", finished_at: new Date().toISOString() });
    toast.success("Vistoria finalizada!");
    window.scrollTo({ top: 0 });
  };

  return (
    <Shell>
      <Card className="p-4 mb-4 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Lock className="h-3.5 w-3.5" /> Vistoria de {kindLabel.toLowerCase()} por acionamento
        </div>
        <p className="mt-1 font-semibold">{vehicleName} · {t.vehicle_plate}</p>
        <p className="text-xs text-muted-foreground">
          Cliente: {t.client_name}{t.vehicle_color ? ` · ${t.vehicle_color}` : ""}
        </p>
      </Card>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Etapa {step + 1} de {STEPS.length}</span>
          <span className="font-medium text-foreground">{STEPS[step]}</span>
        </div>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
      </div>

      {step === 0 && <StepDriver data={data} update={update} />}
      {step === 1 && <StepGeneral data={data} update={update} />}
      {step === 2 && <StepChecks data={data} update={update} />}
      {step === 3 && <StepPhotos token={token} data={data} update={update} />}
      {step === 4 && <StepDocuments token={token} data={data} update={update} />}
      {step === 5 && <StepClient token={token} data={data} update={update} defaultName={t.client_name} />}
      {step === 6 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Revise todas as informações antes de finalizar.</p>
          <VistoriaReport data={data} transport={t} />
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex gap-3">
        {step > 0 && (
          <Button type="button" variant="outline" className="flex-1" onClick={() => goTo(step - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> {step === LAST ? "Voltar para edição" : "Voltar"}
          </Button>
        )}
        {step < LAST ? (
          <Button type="button" className="flex-1" onClick={next}>
            Próximo <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button type="button" className="flex-1" onClick={finalize} disabled={finalizing}>
            {finalizing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Finalizar vistoria
          </Button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-lg px-4 pt-4 pb-6">
        <div className="flex justify-center mb-4">
          <BrandLogo size="md" />
        </div>
        {children}
      </div>
    </div>
  );
}

type Update = (fn: (d: VistoriaData) => VistoriaData) => void;
interface StepProps { data: VistoriaData; update: Update }

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {[true, false].map((opt) => (
          <Button
            key={String(opt)}
            type="button"
            variant={value === opt ? "default" : "outline"}
            onClick={() => onChange(opt)}
          >
            {opt ? "Sim" : "Não"}
          </Button>
        ))}
      </div>
    </div>
  );
}

function StepDriver({ data, update }: StepProps) {
  const d = data.driver;
  const set = (patch: Partial<typeof d>) => update((x) => ({ ...x, driver: { ...x.driver, ...patch } }));
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Identificação do motorista</h2>
        <p className="text-sm text-muted-foreground">Quem está realizando esta vistoria.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-cpf">CPF</Label>
        <Input id="d-cpf" inputMode="numeric" placeholder="000.000.000-00" value={d.cpf} onChange={(e) => set({ cpf: formatCpf(e.target.value) })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-name">Nome completo</Label>
        <Input id="d-name" value={d.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-plate">Placa do guincho / cegonha</Label>
        <Input id="d-plate" className="uppercase" maxLength={8} value={d.tow_plate} onChange={(e) => set({ tow_plate: e.target.value.toUpperCase() })} />
      </div>
    </div>
  );
}

function StepGeneral({ data, update }: StepProps) {
  const g = data.general;
  const set = (patch: Partial<typeof g>) => update((x) => ({ ...x, general: { ...x.general, ...patch } }));
  const setTire = (key: string, patch: Partial<{ state: string; brand: string }>) =>
    update((x) => ({
      ...x,
      general: {
        ...x.general,
        tires: { ...x.general.tires, [key]: { ...(x.general.tires[key] ?? { state: "", brand: "" }), ...patch } },
      },
    }));
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Informações gerais</h2>
      <YesNo label="Houve acesso ao interior do veículo?" value={g.interior_access} onChange={(v) => set({ interior_access: v })} />
      <YesNo label="O veículo está funcionando?" value={g.vehicle_working} onChange={(v) => set({ vehicle_working: v })} />
      <YesNo label="O CRLV foi apresentado?" value={g.crlv_present} onChange={(v) => set({ crlv_present: v })} />
      <div className="space-y-1.5">
        <Label htmlFor="g-km">Quilometragem (KM)</Label>
        <Input id="g-km" inputMode="numeric" value={g.km} onChange={(e) => set({ km: e.target.value.replace(/\D/g, "") })} />
      </div>
      <div className="space-y-2">
        <Label>Nível de combustível: <span className="font-semibold">{FUEL_STEPS[g.fuel]}</span></Label>
        <Slider min={0} max={FUEL_STEPS.length - 1} step={1} value={[g.fuel]} onValueChange={(v) => set({ fuel: v[0] })} />
        <div className="flex justify-between text-xs text-muted-foreground">
          {FUEL_STEPS.map((f) => <span key={f}>{f}</span>)}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-notes">Observação inicial</Label>
        <Textarea id="g-notes" rows={3} value={g.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
      <div className="space-y-3">
        <Label>Pneus (opcional)</Label>
        {TIRE_SLOTS.map((s) => (
          <div key={s.key} className="grid grid-cols-[1fr_1fr] gap-2 items-center">
            <span className="col-span-2 text-xs text-muted-foreground">{s.label}</span>
            <Select value={g.tires[s.key]?.state || undefined} onValueChange={(v) => setTire(s.key, { state: v })}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>{TIRE_STATES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={g.tires[s.key]?.brand || undefined} onValueChange={(v) => setTire(s.key, { brand: v })}>
              <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>{TIRE_BRANDS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepChecks({ data, update }: StepProps) {
  const done = VISTORIA_PARTS.filter((p) => data.checks[p.key]).length;
  const setAll = (state: PartState) =>
    update((x) => ({ ...x, checks: Object.fromEntries(VISTORIA_PARTS.map((p) => [p.key, x.checks[p.key] ?? state])) }));
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Questionário</h2>
          <p className="text-sm text-muted-foreground">{done} de {VISTORIA_PARTS.length} respondidos</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setAll("bom")}>
          Restante como “Bom”
        </Button>
      </div>
      {VISTORIA_PARTS.map((p) => (
        <div key={p.key} className="space-y-1.5">
          <Label>{p.label}</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {PART_STATES.map((s) => (
              <Button
                key={s.value}
                type="button"
                size="sm"
                variant={data.checks[p.key] === s.value ? (s.value === "danificado" ? "destructive" : "default") : "outline"}
                className="px-1 text-xs"
                onClick={() => update((x) => ({ ...x, checks: { ...x.checks, [p.key]: s.value } }))}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotoTile({
  token, slot, url, onChange,
}: { token: string; slot: PhotoSlot; url: string | undefined; onChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadVistoriaPhoto(token, slot.key, file));
    } catch (err) {
      toast.error("Falha ao enviar a foto: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <button
        type="button"
        onClick={() => !url && inputRef.current?.click()}
        disabled={busy}
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden rounded-lg border-2 flex items-center justify-center",
          url ? "border-emerald-500" : slot.required ? "border-dashed border-primary/60 bg-primary/5" : "border-dashed border-border bg-muted/40",
        )}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : url ? (
          <img src={url} alt={slot.label} className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-7 w-7 text-muted-foreground" />
        )}
      </button>
      <p className="text-xs font-medium leading-tight">
        {slot.label}{slot.required && !url && <span className="text-destructive"> *</span>}
      </p>
      {url && (
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" className="h-7 flex-1 px-1 text-xs" onClick={() => inputRef.current?.click()} disabled={busy}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refazer
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => onChange(null)} disabled={busy} aria-label="Excluir foto">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function StepPhotos({ token, data, update }: StepProps & { token: string }) {
  const required = VISTORIA_PHOTOS.filter((p) => p.required);
  const done = required.filter((p) => data.photos[p.key]).length;
  const extraInput = useRef<HTMLInputElement | null>(null);
  const [extraBusy, setExtraBusy] = useState(false);

  const addExtra = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setExtraBusy(true);
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadVistoriaPhoto(token, "avaria", f));
      update((x) => ({ ...x, extra_photos: [...x.extra_photos, ...urls] }));
    } catch (err) {
      toast.error("Falha ao enviar a foto: " + (err as Error).message);
    } finally {
      setExtraBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Fotos do veículo</h2>
        <p className="text-sm text-muted-foreground">
          {done} de {required.length} fotos obrigatórias. Toque no quadro para abrir a câmera.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {VISTORIA_PHOTOS.map((slot) => (
          <PhotoTile
            key={slot.key}
            token={token}
            slot={slot}
            url={data.photos[slot.key]}
            onChange={(url) =>
              update((x) => {
                const photos = { ...x.photos };
                if (url) photos[slot.key] = url;
                else delete photos[slot.key];
                return { ...x, photos };
              })
            }
          />
        ))}
      </div>
      <div className="space-y-2">
        <Label>Avarias adicionais (opcional)</Label>
        <div className="flex flex-wrap gap-2">
          {data.extra_photos.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
              <img src={url} alt="Avaria" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Excluir foto"
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                onClick={() => update((x) => ({ ...x, extra_photos: x.extra_photos.filter((u) => u !== url) }))}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <input ref={extraInput} type="file" accept="image/*" multiple className="hidden" onChange={addExtra} />
        <Button type="button" variant="outline" size="sm" onClick={() => extraInput.current?.click()} disabled={extraBusy}>
          {extraBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
          Adicionar foto de avaria
        </Button>
      </div>
    </div>
  );
}

function StepDocuments({ token, data, update }: StepProps & { token: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Documentos</h2>
        <p className="text-sm text-muted-foreground">Opcional. Fotografe os documentos, se disponíveis.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {VISTORIA_DOCUMENTS.map((slot) => (
          <PhotoTile
            key={slot.key}
            token={token}
            slot={slot}
            url={data.documents[slot.key]}
            onChange={(url) =>
              update((x) => {
                const documents = { ...x.documents };
                if (url) documents[slot.key] = url;
                else delete documents[slot.key];
                return { ...x, documents };
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function StepClient({ token, data, update, defaultName }: StepProps & { token: string; defaultName: string }) {
  const c = data.client;
  const set = (patch: Partial<typeof c>) => update((x) => ({ ...x, client: { ...x.client, ...patch } }));
  useEffect(() => {
    if (!c.name && defaultName) set({ name: defaultName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Informações do cliente</h2>
        <p className="text-sm text-muted-foreground">O cliente confirma que o estado do veículo foi registrado.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-cpf">CPF</Label>
        <Input id="c-cpf" inputMode="numeric" placeholder="000.000.000-00" value={c.cpf} onChange={(e) => set({ cpf: formatCpf(e.target.value) })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-name">Nome completo</Label>
        <Input id="c-name" value={c.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-email">E-mail</Label>
        <Input id="c-email" type="email" value={c.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <Label>Assinatura do cliente</Label>
        <VistoriaSignature token={token} value={c.signature_url} onChange={(url) => set({ signature_url: url })} />
      </div>
    </div>
  );
}
