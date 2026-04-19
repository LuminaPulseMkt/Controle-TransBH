import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/format";
import { MessageCircle, Mail, CheckCircle, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/collections")({
  component: () => (
    <AuthGate adminOnly>
      <CollectionsPage />
    </AuthGate>
  ),
});

interface Overdue {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  amount: number;
  due_date: string;
  transport_id: string | null;
  transport_code?: string;
}

function CollectionsPage() {
  const [items, setItems] = useState<Overdue[] | null>(null);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteFor, setNoteFor] = useState<Overdue | null>(null);
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    await supabase.rpc("mark_overdue_receivables");
    const { data } = await supabase
      .from("receivables")
      .select("*, transports(code)")
      .eq("status", "overdue")
      .order("due_date", { ascending: true });
    const mapped = (data ?? []).map((r: any) => ({
      ...r,
      transport_code: r.transports?.code ?? null,
    }));
    setItems(mapped);

    const { data: tpl } = await supabase.from("message_templates").select("key, body");
    const map: Record<string, string> = {};
    tpl?.forEach((t) => (map[t.key] = t.body));
    setTemplates(map);
  };
  useEffect(() => { void load(); }, []);

  const interpolate = (tpl: string, r: Overdue) => {
    const days = Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000);
    return tpl
      .replaceAll("{client_name}", r.client_name)
      .replaceAll("{amount}", brl(r.amount).replace("R$", "").trim())
      .replaceAll("{transport_code}", r.transport_code ?? "—")
      .replaceAll("{days_overdue}", String(days));
  };

  const sendWhatsApp = (r: Overdue) => {
    const phone = (r.client_phone ?? "").replace(/\D/g, "");
    if (!phone) return toast.error("Cliente sem telefone cadastrado.");
    const msg = encodeURIComponent(interpolate(templates.collection_whatsapp ?? "", r));
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const sendEmail = (r: Overdue) => {
    if (!r.client_email) return toast.error("Cliente sem e-mail cadastrado.");
    const subject = encodeURIComponent(`Cobrança — ${r.transport_code ?? ""}`);
    const body = encodeURIComponent(interpolate(templates.collection_email ?? "", r));
    window.location.href = `mailto:${r.client_email}?subject=${subject}&body=${body}`;
  };

  const markNegotiated = async (r: Overdue) => {
    const { error } = await supabase.from("receivables").update({ status: "negotiated" }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Marcado como negociado.");
    void load();
  };

  const openNote = (r: Overdue) => {
    setNoteFor(r);
    setNoteText("");
    setNoteOpen(true);
  };

  const saveNote = async () => {
    if (!noteFor || !noteText.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("collection_notes").insert({
      receivable_id: noteFor.id,
      note: noteText.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Nota salva.");
    setNoteOpen(false);
  };

  return (
    <AppLayout title="Cobrança de Devedores">
      {!items ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="h-10 w-10 text-success mx-auto mb-3" />
          <h2 className="text-display text-2xl">Sem devedores no momento 🎉</h2>
          <p className="text-muted-foreground text-sm mt-1">Tudo em dia.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((r) => {
            const days = Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000);
            return (
              <Card key={r.id} className="p-4 border-l-4 border-l-destructive">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">{r.client_name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-destructive/15 text-destructive font-medium">
                        {days} dias vencido
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {r.transport_code && <span className="font-mono mr-3">{r.transport_code}</span>}
                      <span>Venc: {dateBR(r.due_date)}</span>
                      {r.client_phone && <span className="ml-3">📱 {r.client_phone}</span>}
                    </div>
                    <div className="text-display text-2xl text-destructive mt-1">{brl(r.amount)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => sendWhatsApp(r)}>
                      <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendEmail(r)}>
                      <Mail className="h-4 w-4 mr-1" /> E-mail
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openNote(r)}>
                      <FileText className="h-4 w-4 mr-1" /> Nota
                    </Button>
                    <Button size="sm" onClick={() => markNegotiated(r)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Negociado
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-display text-2xl">Nova nota</DialogTitle></DialogHeader>
          <Textarea rows={5} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Detalhes da tentativa de cobrança ou follow-up..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancelar</Button>
            <Button onClick={saveNote} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
