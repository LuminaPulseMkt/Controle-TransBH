import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
import { Plus, Pencil, Trash2, MessageCircle, Handshake } from "lucide-react";
import { toast } from "sonner";
import { ExportMenu } from "@/components/ExportMenu";

export const Route = createFileRoute("/partners")({
  component: () => (
    <AuthGate requirePermission="partners.view">
      <PartnersPage />
    </AuthGate>
  ),
});

interface Partner {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  document: string | null;
  base_city: string | null;
  routes: string | null;
  default_amount: number;
  pricing_notes: string | null;
  notes: string | null;
  is_active: boolean;
}

const empty: Partial<Partner> = {
  name: "", phone: "", whatsapp: "", document: "",
  base_city: "", routes: "", default_amount: 0,
  pricing_notes: "", notes: "", is_active: true,
};

/** Normaliza para sempre exibir +55 e máscara BR. Vazio fica vazio. */
function withBR55(input: string): string {
  let digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) digits = digits.slice(2);
  digits = digits.slice(0, 11); // DDD (2) + número (até 9)
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  let out = "+55";
  if (ddd) out += ` (${ddd}`;
  if (ddd.length === 2) out += ")";
  if (rest.length <= 4) {
    if (rest) out += ` ${rest}`;
  } else if (rest.length <= 8) {
    out += ` ${rest.slice(0, 4)}-${rest.slice(4)}`;
  } else {
    out += ` ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }
  return out;
}

/** Devolve string normalizada para salvar, ou null se só tiver DDI. */
function phoneForSave(input: string | null | undefined): string | null {
  const digits = (input || "").replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (!local) return null;
  return withBR55(input || "");
}

function PartnersPage() {
  const { can, user } = useAuth();
  const canManage = can("partners.manage");
  const showValues = can("values.view");
  const [list, setList] = useState<Partner[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Partner>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("name", { ascending: true });
    if (error) toast.error(error.message);
    setList((data ?? []) as Partner[]);
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => { setEditing(empty); setOpen(true); };
  const openEdit = (p: Partner) => { setEditing(p); setOpen(true); };

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Nome é obrigatório.");
    setSaving(true);
    const payload = {
      name: editing.name!.trim(),
      phone: editing.phone || null,
      whatsapp: editing.whatsapp || null,
      document: editing.document || null,
      base_city: editing.base_city || null,
      routes: editing.routes || null,
      default_amount: Number(editing.default_amount ?? 0) || 0,
      pricing_notes: editing.pricing_notes || null,
      notes: editing.notes || null,
      is_active: editing.is_active ?? true,
    };
    const res = editing.id
      ? await supabase.from("partners").update(payload).eq("id", editing.id)
      : await supabase.from("partners").insert({ ...payload, created_by: user?.id ?? null });
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Parceiro salvo.");
    setOpen(false);
    void load();
  };

  const toggleActive = async (p: Partner) => {
    const { error } = await supabase
      .from("partners").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    void load();
  };

  const remove = async (p: Partner) => {
    if (!confirm(`Excluir parceiro "${p.name}"?`)) return;
    const { error } = await supabase.from("partners").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído.");
    void load();
  };

  const sendWa = (p: Partner) => {
    const digits = (p.whatsapp || p.phone || "").replace(/\D/g, "");
    if (!digits) return toast.error("Sem WhatsApp/telefone cadastrado.");
    const text = encodeURIComponent(`Olá ${p.name}, tudo bem? Tenho uma cotação de transporte para você.`);
    window.open(`https://wa.me/${digits}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <AppLayout
      title="Parceiros"
      actions={
        <div className="flex gap-2">
          <ExportMenu
            filename={`parceiros-${new Date().toISOString().slice(0,10)}`}
            title="Parceiros (motoristas)"
            columns={showValues
              ? ["Nome", "WhatsApp", "Cidade base", "Rotas", "Valor médio (R$)", "Ativo"]
              : ["Nome", "WhatsApp", "Cidade base", "Rotas", "Ativo"]}
            rows={(list ?? []).map((p) => showValues
              ? [p.name, p.whatsapp ?? p.phone ?? "—", p.base_city ?? "—", p.routes ?? "—", Number(p.default_amount).toFixed(2), p.is_active ? "Sim" : "Não"]
              : [p.name, p.whatsapp ?? p.phone ?? "—", p.base_city ?? "—", p.routes ?? "—", p.is_active ? "Sim" : "Não"])}
          />
          {canManage && (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Novo parceiro
            </Button>
          )}
        </div>
      }
    >
      {list === null ? (
        <Card className="p-12 text-center text-muted-foreground">Carregando…</Card>
      ) : list.length === 0 ? (
        <Card className="p-12 text-center">
          <Handshake className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Nenhum parceiro cadastrado.</p>
          {canManage && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Cadastrar primeiro parceiro</Button>}
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <Card key={p.id} className={`p-4 ${!p.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[p.base_city, p.document].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <Badge variant={p.is_active ? "default" : "outline"}>
                  {p.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="text-sm space-y-1 mb-3">
                {(p.whatsapp || p.phone) && (
                  <div className="text-muted-foreground">
                    <span className="text-foreground">{p.whatsapp || p.phone}</span>
                  </div>
                )}
                {p.routes && (
                  <div className="text-xs text-muted-foreground line-clamp-2">Rotas: {p.routes}</div>
                )}
                {showValues && (
                  <div className="text-sm">
                    Valor médio: <span className="font-mono font-semibold">{brl(Number(p.default_amount))}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                <Button size="sm" variant="outline" onClick={() => sendWa(p)}>
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </Button>
                {canManage && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(p)}>
                      {p.is_active ? "Inativar" : "Ativar"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar parceiro" : "Novo parceiro"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Nome *">
              <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefone">
                <Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </Field>
              <Field label="WhatsApp">
                <Input value={editing.whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} placeholder="DDI+DDD+número" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Documento (CPF/CNPJ)">
                <Input value={editing.document ?? ""} onChange={(e) => setEditing({ ...editing, document: e.target.value })} />
              </Field>
              <Field label="Cidade base">
                <Input value={editing.base_city ?? ""} onChange={(e) => setEditing({ ...editing, base_city: e.target.value })} />
              </Field>
            </div>
            <Field label="Rotas que costuma atender">
              <Input value={editing.routes ?? ""} onChange={(e) => setEditing({ ...editing, routes: e.target.value })} placeholder="Ex.: BH → SP, BH → RJ" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor médio (R$)">
                <Input type="number" min={0} step="0.01" value={String(editing.default_amount ?? 0)} onChange={(e) => setEditing({ ...editing, default_amount: Number(e.target.value) })} />
              </Field>
              <Field label="Ativo">
                <div className="h-10 flex items-center">
                  <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                </div>
              </Field>
            </div>
            <Field label="Observações de preço">
              <Textarea rows={2} value={editing.pricing_notes ?? ""} onChange={(e) => setEditing({ ...editing, pricing_notes: e.target.value })} />
            </Field>
            <Field label="Observações gerais">
              <Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
