import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DocTemplate, DocTemplateKind, TemplateKey } from "@/lib/document-templates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: DocTemplateKind;
  editing?: DocTemplate | null;
  onSaved: () => void;
}

export function CustomTemplateDialog({ open, onOpenChange, kind, editing, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    template_key: "standard" as TemplateKey,
    name: "",
    description: "",
    title: "",
    service_value: "",
    insurance: "",
    extra: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          template_key: editing.templateKey,
          name: editing.name,
          description: editing.description ?? "",
          title: editing.defaults.title,
          service_value: editing.defaults.service_value,
          insurance: editing.defaults.insurance,
          extra: editing.defaults.extra,
          notes: editing.defaults.notes,
        });
      } else {
        setForm({
          template_key: "standard",
          name: "",
          description: "",
          title: "",
          service_value: "",
          insurance: "",
          extra: "",
          notes: "",
        });
      }
    }
  }, [open, editing]);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nome do modelo é obrigatório.");
    if (!form.title.trim()) return toast.error("Título é obrigatório.");
    setBusy(true);
    const payload = {
      kind,
      template_key: form.template_key,
      name: form.name.trim(),
      description: form.description.trim() || null,
      title: form.title.trim(),
      service_value: Number(form.service_value) || 0,
      insurance: Number(form.insurance) || 0,
      extra: Number(form.extra) || 0,
      notes: form.notes,
    };
    const { error } = editing
      ? await supabase.from("document_templates").update(payload).eq("id", editing.id)
      : await supabase.from("document_templates").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Modelo atualizado." : "Modelo criado.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-display text-2xl">
            {editing ? "Editar modelo" : "Novo modelo personalizado"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Tipo: {kind === "budget" ? "Orçamento" : "Contrato"}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Nome do modelo *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Orçamento Caminhonetes 4x4" />
          </div>
          <div className="md:col-span-2">
            <Label>Descrição curta</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Aparece no card de seleção" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.template_key} onValueChange={(v) => setForm({ ...form, template_key: v as TemplateKey })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Padrão</SelectItem>
                <SelectItem value="fragile">Frágil</SelectItem>
                <SelectItem value="express">Expressa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título do documento *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Frete sugerido</Label>
            <Input type="number" step="0.01" value={form.service_value}
              onChange={(e) => setForm({ ...form, service_value: e.target.value })} />
          </div>
          {/* Seguro removido — frete + adicionais são suficientes */}
          <div>
            <Label>Adicionais sugeridos</Label>
            <Input type="number" step="0.01" value={form.extra}
              onChange={(e) => setForm({ ...form, extra: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Observações / Cláusulas</Label>
            <Textarea rows={6} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Texto que aparece nas observações do documento" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Salvar" : "Criar modelo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
