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
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, dateBR } from "@/lib/format";
import { Plus, Download, Loader2, FileText, MessageCircle, Sparkles, FileCheck2, Zap, ShieldCheck, Pencil, Trash2, Eye, ChevronDown, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { DOCUMENT_TEMPLATES, dbRowToTemplate, type DocTemplate, type DBTemplateRow } from "@/lib/document-templates";
import { CustomTemplateDialog } from "@/components/CustomTemplateDialog";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const TEMPLATE_ICONS: Record<string, typeof Sparkles> = {
  standard: FileCheck2,
  fragile: ShieldCheck,
  express: Zap,
};

export const Route = createFileRoute("/documents")({
  component: () => (
    <AuthGate>
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
}

function DocumentsPage() {
  const { isAdmin, user } = useAuth();
  const [items, setItems] = useState<Document[] | null>(null);
  const [customTemplates, setCustomTemplates] = useState<DocTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"template" | "form">("template");
  const [docType, setDocType] = useState<"budget" | "contract">("budget");
  const [filter, setFilter] = useState<"all" | "budget" | "contract">("all");
  const [busy, setBusy] = useState(false);
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<DocTemplate | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [groupByClient, setGroupByClient] = useState(true);
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
    pickup_date: "",
    delivery_date: "",
    vehicle: "",
    vehicle_plate: "",
    vehicle_color: "",
    service_value: "",
    extra: "",
    notes: "",
  });

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
  useEffect(() => { void load(); void loadTemplates(); }, []);

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

  const filtered = useMemo(() => {
    if (!items) return [];
    if (filter === "all") return items;
    return items.filter((i) => i.doc_type === filter);
  }, [items, filter]);

  // Agrupa documentos por cliente (chave = nome normalizado)
  const groupedByClient = useMemo(() => {
    const map = new Map<string, { name: string; docs: Document[]; total: number }>();
    for (const d of filtered) {
      const key = d.client_name.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.docs.push(d);
        existing.total += Number(d.total_amount ?? 0);
      } else {
        map.set(key, { name: d.client_name, docs: [d], total: Number(d.total_amount ?? 0) });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [filtered]);

  const toggleClient = (key: string) =>
    setOpenClients((prev) => ({ ...prev, [key]: !prev[key] }));

  const total = useMemo(() => {
    const s = (Number(form.service_value) || 0) + (Number(form.extra) || 0);
    return s;
  }, [form]);

  const openNew = (type: "budget" | "contract") => {
    setDocType(type);
    setEditingDoc(null);
    setStep("template");
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
      pickup_date: d.body?.pickup_date ?? "",
      delivery_date: d.body?.delivery_date ?? "",
      vehicle: d.body?.vehicle ?? "",
      vehicle_plate: d.body?.vehicle_plate ?? "",
      vehicle_color: d.body?.vehicle_color ?? "",
      service_value: d.body?.service_value != null ? String(d.body.service_value) : "",
      extra: d.body?.extra != null ? String(d.body.extra) : "",
      notes: d.body?.notes ?? "",
    });
    setStep("form");
    setOpen(true);
  };

  const pickTemplate = (tpl: DocTemplate) => {
    setForm({
      ...form,
      title: tpl.defaults.title,
      template: tpl.templateKey,
      service_value: tpl.defaults.service_value,
      extra: tpl.defaults.extra,
      notes: tpl.defaults.notes,
    });
    setStep("form");
  };

  const startBlank = () => {
    setForm({
      ...form,
      title: docType === "budget" ? "Orçamento" : "Contrato de Transporte",
      template: "standard",
      service_value: "",
      extra: "",
      notes: "",
    });
    setStep("form");
  };

  const save = async () => {
    if (!form.client_name) return toast.error("Cliente é obrigatório.");
    setBusy(true);
    const body = {
      origin: form.origin,
      destination: form.destination,
      pickup_date: form.pickup_date || null,
      delivery_date: form.delivery_date || null,
      client_address: form.client_address || null,
      vehicle: form.vehicle,
      vehicle_plate: form.vehicle_plate.toUpperCase(),
      vehicle_color: form.vehicle_color,
      service_value: Number(form.service_value) || 0,
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
    const { error } = editingDoc
      ? await supabase.from("documents").update(payload).eq("id", editingDoc.id)
      : await supabase.from("documents").insert({
          ...payload,
          doc_type: docType,
          created_by: user?.id ?? null,
        });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editingDoc ? "Documento atualizado." : "Documento criado.");
    setOpen(false);
    setEditingDoc(null);
    void load();
  };

  const exportPDF = async (d: Document) => {
    const doc = new jsPDF();
    doc.setFillColor(13, 27, 42);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(24);
    doc.text("TransBH", 14, 20);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(d.doc_type === "budget" ? "ORÇAMENTO" : "CONTRATO DE TRANSPORTE", 200, 20, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(d.title, 14, 45);
    doc.setFontSize(10);
    doc.text(`Data: ${dateBR(d.created_at)}`, 14, 52);

    let y = 65;
    doc.setFontSize(12);
    doc.text("Cliente", 14, y); y += 6;
    doc.setFontSize(10);
    doc.text(`Nome: ${d.client_name}`, 14, y); y += 5;
    if (d.client_document) { doc.text(`Documento: ${d.client_document}`, 14, y); y += 5; }
    if (d.client_phone) { doc.text(`Telefone: ${d.client_phone}`, 14, y); y += 5; }
    if (d.client_email) { doc.text(`E-mail: ${d.client_email}`, 14, y); y += 5; }
    if (d.body?.client_address) { doc.text(`Endereço: ${d.body.client_address}`, 14, y); y += 5; }

    y += 5;
    doc.setFontSize(12);
    doc.text("Detalhes do Serviço", 14, y); y += 6;
    doc.setFontSize(10);
    if (d.body?.vehicle) { doc.text(`Veículo: ${d.body.vehicle}`, 14, y); y += 5; }
    if (d.body?.vehicle_plate) { doc.text(`Placa: ${d.body.vehicle_plate}`, 14, y); y += 5; }
    if (d.body?.vehicle_color) { doc.text(`Cor: ${d.body.vehicle_color}`, 14, y); y += 5; }
    if (d.body?.origin) { doc.text(`Origem: ${d.body.origin}`, 14, y); y += 5; }
    if (d.body?.destination) { doc.text(`Destino: ${d.body.destination}`, 14, y); y += 5; }
    if (d.body?.pickup_date) { doc.text(`Coleta: ${dateBR(d.body.pickup_date)}`, 14, y); y += 5; }
    if (d.body?.delivery_date) { doc.text(`Entrega: ${dateBR(d.body.delivery_date)}`, 14, y); y += 5; }

    y += 5;
    doc.setFontSize(12);
    doc.text("Valores", 14, y); y += 6;
    doc.setFontSize(10);
    doc.text(`Frete: ${brl(d.body?.service_value ?? 0)}`, 14, y); y += 5;
    if (d.body?.extra) { doc.text(`Adicionais: ${brl(d.body.extra)}`, 14, y); y += 5; }
    doc.setFontSize(14);
    doc.setTextColor(245, 158, 11);
    doc.text(`TOTAL: ${brl(d.total_amount ?? 0)}`, 14, y + 5);

    if (d.doc_type === "contract") {
      y += 20;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      const text = "As partes acima identificadas têm, entre si, justo e acertado o presente contrato de transporte de veículo, conforme as condições descritas neste documento. O cumprimento das obrigações regerá as condições do serviço prestado.";
      const split = doc.splitTextToSize(text, 180);
      doc.text(split, 14, y);
      y += split.length * 5 + 20;
      doc.text("____________________________", 14, y);
      doc.text("____________________________", 120, y);
      doc.text("Cliente", 14, y + 5);
      doc.text("TransBH", 120, y + 5);
    }

    doc.save(`${d.doc_type}-${d.client_name.replace(/\s+/g, "_")}-${Date.now()}.pdf`);
  };

  const shareWhatsApp = (d: Document) => {
    const phone = (d.client_phone ?? "").replace(/\D/g, "");
    const link = d.public_token ? `${window.location.origin}/d/${d.public_token}` : "";
    const tipo = d.doc_type === "budget" ? "orçamento" : "contrato";
    const valor = brl(d.total_amount ?? 0);
    const msg = encodeURIComponent(
      `Olá ${d.client_name}! Segue seu ${tipo} TransBH no valor de ${valor}.${link ? `\n${link}` : ""}`,
    );
    if (phone) window.open(`https://wa.me/${phone}?text=${msg}`, "_blank", "noopener,noreferrer");
    else window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  return (
    <AppLayout
      title="Contratos & Orçamentos"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openNew("budget")}>
            <Plus className="h-4 w-4 mr-1" /> Orçamento
          </Button>
          {isAdmin && (
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
                          canEdit={isAdmin}
                          onEdit={() => openEdit(d)}
                          onPreview={() => setPreviewDoc(d)}
                          onPDF={() => exportPDF(d)}
                          onWhatsApp={() => shareWhatsApp(d)}
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
                canEdit={isAdmin}
                onEdit={() => openEdit(d)}
                onPreview={() => setPreviewDoc(d)}
                onPDF={() => exportPDF(d)}
                onWhatsApp={() => shareWhatsApp(d)}
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
                          Sugerido: {brl(Number(tpl.defaults.service_value) + Number(tpl.defaults.insurance) + Number(tpl.defaults.extra))}
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
                <div className="md:col-span-2">
                  <Label>Veículo</Label>
                  <Input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="Honda Civic 2020" />
                </div>
                <div>
                  <Label>Placa</Label>
                  <Input
                    value={form.vehicle_plate}
                    onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })}
                    placeholder="ABC1D23"
                    maxLength={8}
                    className="uppercase font-mono"
                  />
                </div>
                <div>
                  <Label>Cor</Label>
                  <Input value={form.vehicle_color} onChange={(e) => setForm({ ...form, vehicle_color: e.target.value })} placeholder="Prata" />
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
                  <Label>Coleta</Label>
                  <Input type="date" value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} />
                </div>
                <div>
                  <Label>Entrega</Label>
                  <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
                </div>
                <div>
                  <Label>Frete</Label>
                  <Input type="number" step="0.01" value={form.service_value} onChange={(e) => setForm({ ...form, service_value: e.target.value })} />
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
      />
    </AppLayout>
  );
}

function DocRow({
  d,
  canEdit,
  onEdit,
  onPreview,
  onPDF,
  onWhatsApp,
}: {
  d: Document;
  canEdit?: boolean;
  onEdit?: () => void;
  onPreview: () => void;
  onPDF: () => void;
  onWhatsApp: () => void;
}) {
  const isAcceptedBudget = d.doc_type === "budget" && !!d.accepted_at;
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
          </div>
          <div className="text-sm text-foreground/70">
            {dateBR(d.created_at)} · {brl(d.total_amount ?? 0)}
          </div>
        </div>
      </button>
      <div className="flex gap-2 shrink-0">
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
      </div>
    </div>
  );
}
