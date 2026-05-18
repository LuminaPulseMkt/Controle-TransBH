import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Save, Download, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ChecklistForm } from "@/components/checklist/ChecklistForm";
import { emptyChecklist, type ChecklistData } from "@/lib/checklist-types";
import { exportChecklistPDF } from "@/lib/checklist-pdf";

export const Route = createFileRoute("/checklists")({
  component: () => (
    <AuthGate requirePermission="transports.view">
      <NewChecklistPage />
    </AuthGate>
  ),
});

function NewChecklistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ChecklistData>(() => emptyChecklist());
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<{ name?: string | null; logo_url?: string | null } | null>(null);

  // Temporary id used to namespace signature uploads before the row is saved.
  const draftId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    supabase
      .from("company_settings")
      .select("name, logo_url")
      .maybeSingle()
      .then(({ data }) => setCompany(data ?? null));
  }, []);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { data: row, error } = await supabase
      .from("vehicle_checklists")
      .insert({
        created_by: user.id,
        client_name: data.client_name || null,
        plate: data.plate || null,
        model: data.model || null,
        dut: data.dut || null,
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
      .select("id")
      .single();
    setSaving(false);
    if (error || !row) return toast.error(error?.message ?? "Erro ao salvar.");
    toast.success("Checklist salvo.");
    navigate({ to: "/checklists/$id", params: { id: row.id } });
  };

  const download = async () => {
    try {
      await exportChecklistPDF(data, company);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppLayout
      title="Novo checklist"
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/checklists/historico"><History className="h-4 w-4 mr-1" /> Histórico</Link>
          </Button>
          <Button variant="outline" onClick={download}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
        </>
      }
    >
      <ChecklistForm data={data} onChange={setData} checklistId={draftId} company={company} />
    </AppLayout>
  );
}
