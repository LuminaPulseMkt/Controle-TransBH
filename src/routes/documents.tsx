import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, dateBR, vehicleTypeLabel } from "@/lib/format";

import { publicDocUrl } from "@/lib/public-url";
import { Plus, Download, Loader2, FileText, MessageCircle, Sparkles, FileCheck2, Zap, ShieldCheck, Pencil, Trash2, Eye, ChevronDown, User, CheckCircle2, Car, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateContractAssets } from "@/lib/generate-contract-assets.functions";

import { DOCUMENT_TEMPLATES, dbRowToTemplate, type DocTemplate, type DBTemplateRow } from "@/lib/document-templates";
import { CustomTemplateDialog } from "@/components/CustomTemplateDialog";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { sendWhatsAppManual } from "@/lib/whatsapp.functions";
import { renderFromDb } from "@/lib/message-templates";
import { ExportMenu } from "@/components/ExportMenu";

type VehicleType = "motorcycle" | "sedan" | "hatch" | "caminhonete" | "suv";
interface VehicleForm {
  description: string;
  plate: string;
  color: string;
  type: VehicleType;
  value: string;
  market_value: string;
}
const emptyVehicle = (): VehicleForm => ({ description: "", plate: "", color: "", type: "sedan", value: "", market_value: "" });

function bodyToVehicles(body: any): VehicleForm[] {
  if (Array.isArray(body?.vehicles) && body.vehicles.length > 0) {
    return body.vehicles.map((v: any) => ({
      description: v.description ?? "",
      plate: v.plate ?? "",
      color: v.color ?? "",
      type: (v.type ?? "sedan") as VehicleType,
      value: v.value != null ? String(v.value) : "",
      market_value: v.market_value != null ? String(v.market_value) : "",
    }));
  }
  if (body?.vehicle || body?.vehicle_plate) {
    return [{
      description: body.vehicle ?? "",
      plate: body.vehicle_plate ?? "",
      color: body.vehicle_color ?? "",
      type: "sedan",
      value: body.service_value != null ? String(body.service_value) : "",
      market_value: "",
    }];
  }
  return [emptyVehicle()];
}

const TEMPLATE_ICONS: Record<string, typeof Sparkles> = {
  standard: FileCheck2,
  fragile: ShieldCheck,
  express: Zap,
};

export const Route = createFileRoute("/documents")({
  component: () => (
    <AuthGate requirePermission="documents.view">
      <DocumentsPage />
    </AuthGate>
  ),
});

interface Document {
  id: string;
  doc_type: "budget" | "contract";
  template: string | null;
  title: string;
  client_name: string;
  client_document: string | null;
  client_phone: string | null;
  client_email: string | null;
  total_amount: number | null;
  body: any;
  created_at: string;
  public_token: string | null;
  accepted_at: string | null;
  accepted_contract_id: string | null;
  generated_at: string | null;
  generated_receivable_id: string | null;
  generated_transport_ids: string[] | null;
}

function DocumentsPage() {
  const { isAdmin, user, can } = useAuth();
  const canEditDocs = can("documents.edit");
  const [items, setItems] = useState<Document[] | null>(null);
  const [customTemplates, setCustomTemplates] = useState<DocTemplate[]>([]);
  const [company, setCompany] = useState<{ name: string | null; logo_url: string | null; cnpj: string | null; address: string | null; phone: string | null; whatsapp: string | null; email: string | null; website: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"template" | "form">("template");
  const [docType, setDocType] = useState<"budget" | "contract">("budget");
  const [filter, setFilter] = useState<"all" | "budget" | "contract">("all");
  const [busy, setBusy] = useState(false);
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<DocTemplate | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewDraft, setPreviewDraft] = useState<any | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [groupByClient, setGroupByClient] = useState(true);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
  const [deletingDocBusy, setDeletingDocBusy] = useState(false);
  const [openClients, setOpenClients] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    title: "",
    client_name: "",
    client_document: "",
    client_phone: "",
    client_email: "",
    client_address: "",
    template: "standard",
    origin: "",
    destination: "",
    pickup_value: "",
    delivery_value: "",
    extra: "",
    notes: "",
  });
  const [vehicles, setVehicles] = useState<VehicleForm[]>([emptyVehicle()]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const generateFn = useServerFn(generateContractAssets);

  const load = async () => {
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Document[]);
  };
  const loadTemplates = async () => {
    const { data } = await supabase
      .from("document_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setCustomTemplates(((data ?? []) as unknown as DBTemplateRow[]).map(dbRowToTemplate));
  };
  const loadCompany = async () => {
    const { data } = await supabase.from("company_settings").select("name,logo_url,cnpj,address,phone,whatsapp,email,website").maybeSingle();
    setCompany((data as any) ?? null);
  };
  useEffect(() => { void load(); void loadTemplates(); void loadCompany(); }, []);

  const allTemplates = useMemo(
    () => [...DOCUMENT_TEMPLATES, ...customTemplates],
    [customTemplates],
  );

  const deleteTemplate = async (id: string) => {
    if (!confirm("Excluir este modelo personalizado?")) return;
    const { error } = await supabase.from("document_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Modelo excluído.");
    void loadTemplates();
  };

  const requestDeleteDoc = (d: Document) => {
    if (d.doc_type === "budget" && d.accepted_at) {
      toast.error("Este orçamento já foi aceito e gerou um contrato. Exclua o contrato vinculado primeiro.");
      return;
    }
    setDeletingDoc(d);
  };

  const confirmDeleteDoc = async () => {
    const d = deletingDoc;
    if (!d) return;
    setDeletingDocBusy(true);
    try {
      // Se for um contrato gerado a partir de um orçamento aceito, libera o orçamento
      if (d.doc_type === "contract") {
        await supabase
          .from("documents")
          .update({ accepted_at: null, accepted_contract_id: null })
          .eq("accepted_contract_id", d.id);
      }
      const { error } = await supabase.from("documents").delete().eq("id", d.id);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`${d.doc_type === "budget" ? "Orçamento" : "Contrato"} excluído.`);
        setDeletingDoc(null);
        void load();
      }
    } finally {
      setDeletingDocBusy(false);
    }
  };

  const filtered = useMemo(() => {
    if (!items) return [];
    if (filter === "all") return items;
    return items.filter((i) => i.doc_type === filter);
  }, [items, filter]);

  // Agrupa documentos por cliente (chave = nome normalizado)
  // O total ignora contratos gerados a partir de aceites de orçamento
  // (mesmo dinheiro do orçamento — somar dobraria o valor).
  const groupedByClient = useMemo(() => {
    const linkedContractIds = new Set<string>(
      filtered
        .map((d) => d.accepted_contract_id)
        .filter((v): v is string => !!v),
    );
    const map = new Map<string, { name: string; docs: Document[]; total: number }>();
    for (const d of filtered) {
      const key = d.client_name.trim().toLowerCase();
      const isLinkedContract = d.doc_type === "contract" && linkedContractIds.has(d.id);
      const addAmount = isLinkedContract ? 0 : Number(d.total_amount ?? 0);
      const existing = map.get(key);
      if (existing) {
        existing.docs.push(d);
        existing.total += addAmount;
      } else {
        map.set(key, { name: d.client_name, docs: [d], total: addAmount });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [filtered]);

  const toggleClient = (key: string) =>
    setOpenClients((prev) => ({ ...prev, [key]: !prev[key] }));

  const vehiclesTotal = useMemo(
    () => vehicles.reduce((s, v) => s + (Number(v.value) || 0), 0),
    [vehicles],
  );
  const total = useMemo(() => {
    return vehiclesTotal
      + (Number(form.extra) || 0)
      + (Number(form.pickup_value) || 0)
      + (Number(form.delivery_value) || 0);
  }, [form, vehiclesTotal]);

  const openNew = (type: "budget" | "contract") => {
    setDocType(type);
    setEditingDoc(null);
    setStep("template");
    setVehicles([emptyVehicle()]);
    setOpen(true);
  };

  const openEdit = (d: Document) => {
    setDocType(d.doc_type);
    setEditingDoc(d);
    setForm({
      title: d.title ?? "",
      client_name: d.client_name ?? "",
      client_document: d.client_document ?? "",
      client_phone: d.client_phone ?? "",
      client_email: d.client_email ?? "",
      client_address: d.body?.client_address ?? "",
      template: (d.template as string) ?? "standard",
      origin: d.body?.origin ?? "",
      destination: d.body?.destination ?? "",
      pickup_value: d.body?.pickup_value != null ? String(d.body.pickup_value) : "",
      delivery_value: d.body?.delivery_value != null ? String(d.body.delivery_value) : "",
      extra: d.body?.extra != null ? String(d.body.extra) : "",
      notes: d.body?.notes ?? "",
    });
    setVehicles(bodyToVehicles(d.body));
    setStep("form");
    setOpen(true);
  };

  const pickTemplate = (tpl: DocTemplate) => {
    setForm({
      ...form,
      title: tpl.defaults.title,
      template: tpl.templateKey,
      extra: tpl.defaults.extra,
      notes: tpl.defaults.notes,
    });
    setVehicles((prev) =>
      prev.length === 1 && !prev[0].value
        ? [{ ...prev[0], value: tpl.defaults.service_value ?? "" }]
        : prev,
    );
    setStep("form");
  };

  const startBlank = () => {
    setForm({
      ...form,
      title: docType === "budget" ? "Orçamento" : "Contrato de Transporte",
      template: "standard",
      extra: "",
      notes: "",
    });
    setVehicles([emptyVehicle()]);
    setStep("form");
  };

  const save = async () => {
    if (!form.client_name) return toast.error("Cliente é obrigatório.");
    if (vehicles.length === 0) return toast.error("Adicione pelo menos um veículo.");
    setBusy(true);
    const vehiclesPayload = vehicles.map((v) => ({
      description: v.description,
      plate: v.plate.toUpperCase(),
      color: v.color,
      type: v.type,
      value: Number(v.value) || 0,
      market_value: v.market_value !== "" ? Number(v.market_value) || 0 : null,
    }));
    const single = vehiclesPayload.length === 1 ? vehiclesPayload[0] : null;
    const body: Record<string, any> = {
      origin: form.origin,
      destination: form.destination,
      pickup_value: Number(form.pickup_value) || 0,
      delivery_value: Number(form.delivery_value) || 0,
      client_address: form.client_address || null,
      vehicles: vehiclesPayload,
      // legacy mirror (compat com PDFs / dialogs antigos)
      vehicle: single?.description ?? "",
      vehicle_plate: single?.plate ?? "",
      vehicle_color: single?.color ?? "",
      service_value: vehiclesTotal,
      extra: Number(form.extra) || 0,
      notes: form.notes,
    };
    const payload = {
      template: docType === "contract" ? (form.template as any) : null,
      title: form.title || (docType === "budget" ? "Orçamento" : "Contrato"),
      client_name: form.client_name,
      client_document: form.client_document || null,
      client_phone: form.client_phone || null,
      client_email: form.client_email || null,
      body,
      total_amount: total,
    };
    let createdToken: string | null = null;
    if (editingDoc) {
      const { error } = await supabase.from("documents").update(payload).eq("id", editingDoc.id);
      setBusy(false);
      if (error) return toast.error(error.message);
    } else {
      const { data: inserted, error } = await supabase
        .from("documents")
        .insert({
          ...payload,
          doc_type: docType,
          created_by: user?.id ?? null,
        })
        .select("public_token")
        .single();
      setBusy(false);
      if (error) return toast.error(error.message);
      createdToken = inserted?.public_token ?? null;
    }
    toast.success(editingDoc ? "Documento atualizado." : "Documento criado.");

    // Auto-send WhatsApp on new budget creation
    if (!editingDoc && docType === "budget" && form.client_phone && createdToken) {
      const link = publicDocUrl(createdToken);
      const vars = {
        client_name: form.client_name,
        title: payload.title,
        link,
        company_name: company?.name ?? "TransBH",
      };
      const fallback = `Olá {client_name}! Segue o link do seu orçamento {company_name}: {link}`;
      renderFromDb("wa_budget_created", vars, fallback)
        .then((text) => sendWhatsAppManual({ data: { phone: form.client_phone, text } }))
        .then((r) => {
          if (r?.ok) toast.success("WhatsApp enviado ao cliente.");
          else if (r?.error) toast.message("WhatsApp não enviado", { description: r.error });
        })
        .catch(() => {
          /* silencioso — não bloqueia criação */
        });
    }

    setOpen(false);
    setEditingDoc(null);
    void load();
  };

  const exportPDF = async (d: Document) => {
    const { exportDocumentPdf } = await import("@/lib/document-pdf");
    await exportDocumentPdf(d, company);
  };

  const shareWhatsApp = async (d: Document) => {
    const phone = (d.client_phone ?? "").replace(/\D/g, "");
    const link = d.public_token ? publicDocUrl(d.public_token) : "";
    const vars = {
      client_name: d.client_name,
      title: d.title,
      amount: Number(d.total_amount ?? 0),
      link,
      company_name: company?.name ?? "TransBH",
    };
    const fallback = `Olá {client_name}! Segue seu documento {company_name} no valor de {amount}.\n{link}`;
    const text = await renderFromDb("wa_budget_created", vars, fallback);

    if (!phone) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      return;
    }

    const t = toast.loading("Enviando WhatsApp...");
    try {
      const r = await sendWhatsAppManual({ data: { phone, text } });
      toast.dismiss(t);
      if (r?.ok) {
        toast.success("Mensagem enviada via WhatsApp.");
      } else {
        toast.error(r?.error ?? "Falha ao enviar. Abrindo WhatsApp Web...");
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.dismiss(t);
      toast.error("Falha ao enviar. Abrindo WhatsApp Web...");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }
  };

  const generateAssets = async (d: Document) => {
    if (d.doc_type !== "contract") return;
    if (d.generated_at) {
      toast.info("Transporte e cobrança já foram gerados para este contrato.");
      return;
    }
    setGeneratingId(d.id);
    try {
      const res = await generateFn({ data: { contract_id: d.id } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.already
          ? "Transporte e cobrança já existiam."
          : `Gerados ${res.transport_ids.length} transporte(s) e 1 cobrança.`,
      );
      void load();
    } catch {
      toast.error("Falha ao gerar. Tente novamente.");
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <AppLayout
      title="Contratos & Orçamentos"
      actions={
        <div className="flex gap-2">
          <ExportMenu
            filename={`documentos-${new Date().toISOString().slice(0,10)}`}
            title="Documentos"
            subtitle={filter !== "all" ? (filter === "budget" ? "Orçamentos" : "Contratos") : undefined}
            columns={["Tipo", "Título", "Cliente", "Telefone", "Valor (R$)", "Status", "Criado", "Aceito em"]}
            rows={filtered.map((d) => [
              d.doc_type === "budget" ? "Orçamento" : "Contrato",
              d.title,
              d.client_name,
              d.client_phone ?? "—",
              Number(d.total_amount ?? 0).toFixed(2),
              d.accepted_at ? "Aceito" : "Pendente",
              dateBR(d.created_at),
              d.accepted_at ? dateBR(d.accepted_at) : "—",
            ])}
            orientation="landscape"
          />
          {canEditDocs && (
            <Button size="sm" variant="outline" onClick={() => openNew("budget")}>
              <Plus className="h-4 w-4 mr-1" /> Orçamento
            </Button>
          )}
          {canEditDocs && (
            <Button size="sm" onClick={() => openNew("contract")}>
              <Plus className="h-4 w-4 mr-1" /> Contrato
            </Button>
          )}
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="budget">Orçamentos</TabsTrigger>
            <TabsTrigger value="contract">Contratos</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} />
        </Tabs>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-muted/30">
          <button
            onClick={() => setGroupByClient(true)}
            className={`text-xs px-3 py-1.5 rounded ${groupByClient ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Por cliente
          </button>
          <button
            onClick={() => setGroupByClient(false)}
            className={`text-xs px-3 py-1.5 rounded ${!groupByClient ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Lista
          </button>
        </div>
      </div>

      {!items ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhum documento ainda.</Card>
      ) : groupByClient ? (
        <div className="space-y-3">
          {groupedByClient.map((group) => {
            const key = group.name.trim().toLowerCase();
            const isOpen = openClients[key] ?? true;
            return (
              <Card key={key} className="overflow-hidden">
                <Collapsible open={isOpen} onOpenChange={() => toggleClient(key)}>
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="font-semibold truncate">{group.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {group.docs.length} {group.docs.length === 1 ? "documento" : "documentos"} · Total {brl(group.total)}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border divide-y divide-border">
                      {group.docs.map((d) => (
                        <DocRow
                          key={d.id}
                          d={d}
                          canEdit={canEditDocs}
                          canDelete={canEditDocs}
                          onEdit={() => openEdit(d)}
                          onDelete={() => requestDeleteDoc(d)}
                          onPreview={() => setPreviewDoc(d)}
                          onPDF={() => exportPDF(d)}
                          onWhatsApp={() => shareWhatsApp(d)}
                          onGenerate={() => generateAssets(d)}
                          generating={generatingId === d.id}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((d) => (
            <Card key={d.id} className="p-0 overflow-hidden">
              <DocRow
                d={d}
                canEdit={canEditDocs}
                canDelete={canEditDocs}
                onEdit={() => openEdit(d)}
                onDelete={() => requestDeleteDoc(d)}
                onPreview={() => setPreviewDoc(d)}
                onPDF={() => exportPDF(d)}
                onWhatsApp={() => shareWhatsApp(d)}
                onGenerate={() => generateAssets(d)}
                generating={generatingId === d.id}
              />
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setEditingDoc(null);
          setStep("template");
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-display text-2xl">
              {editingDoc
                ? `Editar ${editingDoc.doc_type === "budget" ? "Orçamento" : "Contrato"}`
                : step === "template" ? "Escolha um modelo" : `Novo ${docType === "budget" ? "Orçamento" : "Contrato"}`}
            </DialogTitle>
            {!editingDoc && step === "template" && (
              <p className="text-sm text-muted-foreground">
                Selecione um modelo pré-pronto. Depois você só preenche os dados do cliente e do veículo.
              </p>
            )}
          </DialogHeader>

          {step === "template" ? (
            <div className="space-y-3">
              {isAdmin && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingTpl(null); setTplDialogOpen(true); }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Novo modelo
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {allTemplates.filter((t) => t.kind === docType).map((tpl) => {
                  const Icon = TEMPLATE_ICONS[tpl.templateKey] ?? Sparkles;
                  return (
                    <div
                      key={tpl.id}
                      className="relative rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors p-4 flex flex-col gap-2"
                    >
                      {tpl.isCustom && isAdmin && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingTpl(tpl); setTplDialogOpen(true); }}
                            className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); void deleteTemplate(tpl.id); }}
                            className="h-6 w-6 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => pickTemplate(tpl)}
                        className="text-left flex flex-col gap-2"
                      >
                        <div className="h-9 w-9 rounded bg-primary/15 text-primary flex items-center justify-center">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="font-semibold leading-tight flex items-center gap-2">
                          {tpl.name}
                          {tpl.isCustom && (
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{tpl.description}</div>
                        <div className="mt-2 text-xs text-primary font-medium">
                          Sugerido: {brl(Number(tpl.defaults.service_value) + Number(tpl.defaults.extra))}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <button
                  onClick={startBlank}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Ou começar do zero (em branco)
                </button>
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {!editingDoc && (
                  <div className="md:col-span-2 flex items-center justify-between gap-2 rounded border border-border bg-muted/30 px-3 py-2">
                    <div className="text-xs text-muted-foreground">
                      Modelo: <span className="text-foreground font-medium">
                        {allTemplates.find((t) => t.kind === docType && t.templateKey === form.template)?.name ?? "Personalizado"}
                      </span>
                    </div>
                    <button onClick={() => setStep("template")} className="text-xs text-primary hover:underline">
                      Trocar modelo
                    </button>
                  </div>
                )}
                <div className="md:col-span-2">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>Cliente *</Label>
                  <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input value={form.client_document} onChange={(e) => setForm({ ...form, client_document: e.target.value })} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Endereço (opcional)</Label>
                  <Input
                    value={form.client_address}
                    onChange={(e) => setForm({ ...form, client_address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade/UF"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Veículos do contrato</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setVehicles((prev) => [...prev, emptyVehicle()])}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Adicionar veículo
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {vehicles.map((v, i) => (
                      <div key={i} className="rounded-md border border-border p-3 space-y-2 bg-muted/20 relative">
                        {vehicles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setVehicles((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-2 right-2 h-6 w-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
                            title="Remover veículo"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="md:col-span-2">
                            <Label className="text-xs">Descrição</Label>
                            <Input
                              value={v.description}
                              onChange={(e) => setVehicles((prev) => prev.map((p, idx) => idx === i ? { ...p, description: e.target.value } : p))}
                              placeholder="Honda Civic 2020"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Placa</Label>
                            <Input
                              value={v.plate}
                              onChange={(e) => setVehicles((prev) => prev.map((p, idx) => idx === i ? { ...p, plate: e.target.value.toUpperCase() } : p))}
                              placeholder="ABC1D23"
                              maxLength={8}
                              className="uppercase font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Tipo</Label>
                            <Select
                              value={v.type}
                              onValueChange={(val) => setVehicles((prev) => prev.map((p, idx) => idx === i ? { ...p, type: val as VehicleType } : p))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(vehicleTypeLabel).map(([k, label]) => (
                                  <SelectItem key={k} value={k}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Cor</Label>
                            <Input
                              value={v.color}
                              onChange={(e) => setVehicles((prev) => prev.map((p, idx) => idx === i ? { ...p, color: e.target.value } : p))}
                              placeholder="Prata"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Valor (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={v.value}
                              onChange={(e) => setVehicles((prev) => prev.map((p, idx) => idx === i ? { ...p, value: e.target.value } : p))}
                              placeholder="0,00"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label className="text-xs">Valor do veículo (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={v.market_value}
                              onChange={(e) => setVehicles((prev) => prev.map((p, idx) => idx === i ? { ...p, market_value: e.target.value } : p))}
                              placeholder="0,00"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Valor de referência do veículo — não soma ao total.</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Origem</Label>
                  <Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Belo Horizonte/MG" />
                </div>
                <div>
                  <Label>Destino</Label>
                  <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="São Paulo/SP" />
                </div>
                <div>
                  <Label>Coleta (R$)</Label>
                  <Input type="number" step="0.01" value={form.pickup_value} onChange={(e) => setForm({ ...form, pickup_value: e.target.value })} placeholder="0,00" />
                </div>
                <div>
                  <Label>Entrega (R$)</Label>
                  <Input type="number" step="0.01" value={form.delivery_value} onChange={(e) => setForm({ ...form, delivery_value: e.target.value })} placeholder="0,00" />
                </div>
                <div>
                  <Label>Frete (soma dos veículos)</Label>
                  <Input value={brl(vehiclesTotal)} readOnly className="font-medium" />
                </div>
                <div>
                  <Label>Adicionais</Label>
                  <Input type="number" step="0.01" value={form.extra} onChange={(e) => setForm({ ...form, extra: e.target.value })} />
                </div>
                <div>
                  <Label>Adicionais</Label>
                  <Input type="number" step="0.01" value={form.extra} onChange={(e) => setForm({ ...form, extra: e.target.value })} />
                </div>
                <div>
                  <Label>Total</Label>
                  <Input value={brl(total)} readOnly className="font-semibold text-primary" />
                </div>
                <div className="md:col-span-2">
                  <Label>Observações / Cláusulas</Label>
                  <Textarea rows={5} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("template")}>Voltar</Button>
                <Button
                  variant="secondary"
                  disabled={!form.client_name || vehicles.length === 0}
                  onClick={() => {
                    const vehiclesPayload = vehicles.map((v) => ({
                      description: v.description,
                      plate: v.plate.toUpperCase(),
                      color: v.color,
                      type: v.type,
                      value: Number(v.value) || 0,
                      market_value: v.market_value !== "" ? Number(v.market_value) || 0 : null,
                    }));
                    const single = vehiclesPayload.length === 1 ? vehiclesPayload[0] : null;
                    setPreviewDraft({
                      id: "draft",
                      doc_type: docType,
                      template: docType === "contract" ? form.template : null,
                      title: form.title || (docType === "budget" ? "Orçamento" : "Contrato"),
                      client_name: form.client_name,
                      client_document: form.client_document || null,
                      client_phone: form.client_phone || null,
                      client_email: form.client_email || null,
                      total_amount: total,
                      created_at: new Date().toISOString(),
                      public_token: null,
                      accepted_at: null,
                      accepted_contract_id: null,
                      generated_at: null,
                      generated_receivable_id: null,
                      generated_transport_ids: null,
                      body: {
                        origin: form.origin,
                        destination: form.destination,
                        pickup_value: Number(form.pickup_value) || 0,
                        delivery_value: Number(form.delivery_value) || 0,
                        client_address: form.client_address || null,
                        vehicles: vehiclesPayload,
                        vehicle: single?.description ?? "",
                        vehicle_plate: single?.plate ?? "",
                        vehicle_color: single?.color ?? "",
                        service_value: vehiclesTotal,
                        extra: Number(form.extra) || 0,
                        notes: form.notes,
                      },
                    });
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />Pré-visualizar
                </Button>
                <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CustomTemplateDialog
        open={tplDialogOpen}
        onOpenChange={setTplDialogOpen}
        kind={docType}
        editing={editingTpl}
        onSaved={loadTemplates}
      />

      <DocumentPreviewDialog
        doc={previewDoc}
        open={!!previewDoc}
        onOpenChange={(v) => !v && setPreviewDoc(null)}
        onExportPDF={exportPDF}
        onShareWhatsApp={shareWhatsApp}
        company={company}
      />

      <DocumentPreviewDialog
        doc={previewDraft}
        open={!!previewDraft}
        onOpenChange={(v) => !v && setPreviewDraft(null)}
        company={company}
      />

      <AlertDialog open={!!deletingDoc} onOpenChange={(v) => !v && !deletingDocBusy && setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {deletingDoc?.doc_type === "budget" ? "orçamento" : "contrato"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingDoc && (
                <>
                  Tem certeza que deseja excluir permanentemente{" "}
                  <strong>{deletingDoc.title}</strong> do cliente{" "}
                  <strong>{deletingDoc.client_name}</strong> ({brl(deletingDoc.total_amount ?? 0)})?
                  <br />
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingDocBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmDeleteDoc(); }}
              disabled={deletingDocBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingDocBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function DocRow({
  d,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onPreview,
  onPDF,
  onWhatsApp,
  onGenerate,
  generating,
}: {
  d: Document;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onPreview: () => void;
  onPDF: () => void;
  onWhatsApp: () => void;
  onGenerate?: () => void;
  generating?: boolean;
}) {
  const isAcceptedBudget = d.doc_type === "budget" && !!d.accepted_at;
  const isContract = d.doc_type === "contract";
  const alreadyGenerated = isContract && !!d.generated_at;
  return (
    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <button onClick={onPreview} className="flex items-start gap-3 min-w-0 text-left flex-1 hover:opacity-80 transition-opacity">
        <div className="h-11 w-11 rounded bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg md:text-xl font-bold text-foreground truncate leading-tight">{d.title}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground/80">
              {d.doc_type === "budget" ? "Orçamento" : "Contrato"}
            </span>
            {d.doc_type === "budget" && d.accepted_at && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Aceito {dateBR(d.accepted_at)}
              </span>
            )}
            {alreadyGenerated && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-primary/15 text-primary">
                <Truck className="h-3 w-3" /> Transporte/cobrança gerados
              </span>
            )}
          </div>
          <div className="text-sm text-foreground/70">
            {dateBR(d.created_at)} · {brl(d.total_amount ?? 0)}
          </div>
        </div>
      </button>
      <div className="flex gap-2 shrink-0 flex-wrap">
        {isContract && onGenerate && !alreadyGenerated && (
          <Button size="sm" onClick={onGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Truck className="h-4 w-4 mr-1" />}
            Gerar transporte e cobrança
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onPreview}>
          <Eye className="h-4 w-4 mr-1" /> Visualizar
        </Button>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            disabled={isAcceptedBudget}
            title={isAcceptedBudget ? "Orçamento já aceito — não pode ser editado" : "Editar documento"}
          >
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onPDF}>
          <Download className="h-4 w-4 mr-1" /> PDF
        </Button>
        <Button size="sm" variant="outline" onClick={onWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
        </Button>
        {canDelete && onDelete && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Excluir documento"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
