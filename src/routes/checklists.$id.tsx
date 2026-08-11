import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Download, Loader2 } from "lucide-react";
import { ChecklistForm } from "@/components/checklist/ChecklistForm";
import {
  emptyChecklist, type ChecklistData, CHECKLIST_ITEMS, TIRE_POSITIONS, emptyParty,
} from "@/lib/checklist-types";
import { exportChecklistPDF } from "@/lib/checklist-pdf";

export const Route = createFileRoute("/checklists/$id")({
  component: () => (
    <AuthGate requirePermission="transports.view">
      <ChecklistEditorPage />
    </AuthGate>
  ),
});

function ChecklistEditorPage() {
  const { id } = useParams({ from: "/checklists/$id" });
  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<{ name?: string | null; logo_url?: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: row, error }, { data: comp }] = await Promise.all([
        supabase.from("vehicle_checklists").select("*").eq("id", id).maybeSingle(),
        supabase.from("company_settings").select("name, logo_url").maybeSingle(),
      ]);
      setLoading(false);
      if (error) return toast.error(error.message);
      if (!row) return toast.error("Checklist não encontrado.");
      setCompany(comp ?? null);
      const blank = emptyChecklist();
      const items = { ...blank.items, ...(row.items as Record<string, unknown> | null ?? {}) } as ChecklistData["items"];
      // ensure all keys exist
      for (const k of CHECKLIST_ITEMS) if (!(k in items)) items[k] = null;
      const tires = Array.isArray(row.tires) && row.tires.length === 5
        ? (row.tires as unknown as ChecklistData["tires"])
        : TIRE_POSITIONS.map((position, i) => {
            const t = (row.tires as unknown as ChecklistData["tires"] | null)?.[i];
            return t ?? { position, size: "", brand: "", condition: null };
          });
      setData({
        client_name: row.client_name ?? "",
        plate: row.plate ?? "",
        model: row.model ?? "",
        dut: row.dut ?? "",
        chassis: row.chassis ?? "",
        color: row.color ?? "",
        km: row.km ?? "",
        location: row.location ?? "",
        checklist_date: row.checklist_date ?? blank.checklist_date,
        checklist_time: row.checklist_time ?? blank.checklist_time,
        items,
        tires,
        fuel_level: (row.fuel_level as ChecklistData["fuel_level"]) ?? null,
        observations: row.observations ?? "",
        pickup: { ...emptyParty(), ...(row.pickup as Partial<ChecklistData["pickup"]> | null ?? {}) },
        delivery: { ...emptyParty(), ...(row.delivery as Partial<ChecklistData["delivery"]> | null ?? {}) },
      });
    })();
  }, [id]);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase
      .from("vehicle_checklists")
      .update({
        client_name: data.client_name || null,
        plate: data.plate || null,
        model: data.model || null,
        dut: data.dut || null,
        chassis: data.chassis || null,
        color: data.color || null,
        km: data.km || null,
        location: data.location || null,
        checklist_date: data.checklist_date || null,
        checklist_time: data.checklist_time || null,
        items: data.items as unknown as Record<string, string>,
        tires: data.tires as unknown as Record<string, string>[],
        fuel_level: data.fuel_level,
        observations: data.observations || null,
        pickup: data.pickup as unknown as Record<string, string>,
        delivery: data.delivery as unknown as Record<string, string>,
      })
      .eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Checklist salvo.");
  };

  const download = async () => {
    if (!data) return;
    try {
      await exportChecklistPDF(data, company);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppLayout
      title="Checklist"
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/checklists"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
          </Button>
          <Button variant="outline" onClick={download} disabled={!data}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button onClick={save} disabled={saving || !data}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
        </>
      }
    >
      {loading || !data ? (
        <div className="text-center text-muted-foreground py-12">Carregando…</div>
      ) : (
        <ChecklistForm data={data} onChange={setData} checklistId={id} company={company} />
      )}
    </AppLayout>
  );
}
