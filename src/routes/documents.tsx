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
import { Plus, Download, Loader2, FileText, MessageCircle, Sparkles, FileCheck2, Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { DOCUMENT_TEMPLATES, type DocTemplate } from "@/lib/document-templates";

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
}

function DocumentsPage() {
  const { isAdmin, user } = useAuth();
  const [items, setItems] = useState<Document[] | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"template" | "form">("template");
  const [docType, setDocType] = useState<"budget" | "contract">("budget");
  const [filter, setFilter] = useState<"all" | "budget" | "contract">("all");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    title: "",
    client_name: "",
    client_document: "",
    client_phone: "",
    client_email: "",
    template: "standard",
    origin: "",
    destination: "",
    vehicle: "",
    service_value: "",
    insurance: "",
    extra: "",
    notes: "",
  });

  const load = async () => {
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Document[]);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (filter === "all") return items;
    return items.filter((i) => i.doc_type === filter);
  }, [items, filter]);

  const total = useMemo(() => {
    const s = (Number(form.service_value) || 0) + (Number(form.insurance) || 0) + (Number(form.extra) || 0);
    return s;
  }, [form]);

  const openNew = (type: "budget" | "contract") => {
    setDocType(type);
    setForm({ ...form, title: type === "budget" ? "Orçamento" : "Contrato de Transporte" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.client_name) return toast.error("Cliente é obrigatório.");
    setBusy(true);
    const body = {
      origin: form.origin,
      destination: form.destination,
      vehicle: form.vehicle,
      service_value: Number(form.service_value) || 0,
      insurance: Number(form.insurance) || 0,
      extra: Number(form.extra) || 0,
      notes: form.notes,
    };
    const { error } = await supabase.from("documents").insert({
      doc_type: docType,
      template: docType === "contract" ? (form.template as any) : null,
      title: form.title || (docType === "budget" ? "Orçamento" : "Contrato"),
      client_name: form.client_name,
      client_document: form.client_document || null,
      client_phone: form.client_phone || null,
      client_email: form.client_email || null,
      body,
      total_amount: total,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Documento criado.");
    setOpen(false);
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

    y += 5;
    doc.setFontSize(12);
    doc.text("Detalhes do Serviço", 14, y); y += 6;
    doc.setFontSize(10);
    if (d.body?.vehicle) { doc.text(`Veículo: ${d.body.vehicle}`, 14, y); y += 5; }
    if (d.body?.origin) { doc.text(`Origem: ${d.body.origin}`, 14, y); y += 5; }
    if (d.body?.destination) { doc.text(`Destino: ${d.body.destination}`, 14, y); y += 5; }

    y += 5;
    doc.setFontSize(12);
    doc.text("Valores", 14, y); y += 6;
    doc.setFontSize(10);
    doc.text(`Frete: ${brl(d.body?.service_value ?? 0)}`, 14, y); y += 5;
    if (d.body?.insurance) { doc.text(`Seguro: ${brl(d.body.insurance)}`, 14, y); y += 5; }
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
    const msg = encodeURIComponent(
      `Olá ${d.client_name}! Segue o ${d.doc_type === "budget" ? "orçamento" : "contrato"} no valor de ${brl(d.total_amount ?? 0)}. — TransBH`,
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
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="budget">Orçamentos</TabsTrigger>
          <TabsTrigger value="contract">Contratos</TabsTrigger>
        </TabsList>
        <TabsContent value={filter} />
      </Tabs>

      {!items ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhum documento ainda.</Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((d) => (
            <Card key={d.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{d.title}</h3>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-muted">
                      {d.doc_type === "budget" ? "Orçamento" : "Contrato"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {d.client_name} · {dateBR(d.created_at)} · {brl(d.total_amount ?? 0)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => exportPDF(d)}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => shareWhatsApp(d)}>
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-display text-2xl">
              Novo {docType === "budget" ? "Orçamento" : "Contrato"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            {docType === "contract" && (
              <div className="md:col-span-2">
                <Label>Modelo</Label>
                <Select value={form.template} onValueChange={(v) => setForm({ ...form, template: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Padrão</SelectItem>
                    <SelectItem value="fragile">Veículo Frágil</SelectItem>
                    <SelectItem value="express">Entrega Expressa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <div>
              <Label>Veículo</Label>
              <Input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="Honda Civic 2020 — ABC1D23" />
            </div>
            <div></div>
            <div>
              <Label>Origem</Label>
              <Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Belo Horizonte/MG" />
            </div>
            <div>
              <Label>Destino</Label>
              <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="São Paulo/SP" />
            </div>
            <div>
              <Label>Frete</Label>
              <Input type="number" step="0.01" value={form.service_value} onChange={(e) => setForm({ ...form, service_value: e.target.value })} />
            </div>
            <div>
              <Label>Seguro</Label>
              <Input type="number" step="0.01" value={form.insurance} onChange={(e) => setForm({ ...form, insurance: e.target.value })} />
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
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
