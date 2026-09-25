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

type ChecklistsSearch = { transport_id?: string };

export const Route = createFileRoute("/checklists")({
  validateSearch: (s: Record<string, unknown>): ChecklistsSearch => ({
    transport_id: typeof s.transport_id === "string" ? s.transport_id : undefined,
  }),
  component: () => (
    <AuthGate requirePermission="transports.view">
      <NewChecklistPage />
    </AuthGate>
  ),
});

function NewChecklistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { transport_id } = Route.useSearch();
  const [data, setData] = useState<ChecklistData>(() => emptyChecklist());
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<{ name?: string | null; logo_url?: string | null } | null>(null);
  const [linkedTransport, setLinkedTransport] = useState<{ code: string } | null>(null);

  // Temporary id used to namespace signature uploads before the row is saved.
  const draftId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    supabase
      .rpc("get_public_company_info")
      .maybeSingle()
      .then(({ data }) => setCompany(data ?? null));
  }, []);

  useEffect(() => {
    if (!transport_id) return;
    supabase
      .from("transports")
      .select("code, client_name, vehicle_plate, vehicle_brand, vehicle_model, vehicle_chassis, vehicle_color")
      .eq("id", transport_id)
      .maybeSingle()
      .then(({ data: t }) => {
        if (!t) return;
        setLinkedTransport({ code: t.code });
        setData((prev) => ({
          ...prev,
          client_name: t.client_name ?? prev.client_name,
          plate: t.vehicle_plate ?? prev.plate,
          model: [t.vehicle_brand, t.vehicle_model].filter(Boolean).join(" ") || prev.model,
          chassis: t.vehicle_chassis ?? prev.chassis,
          color: t.vehicle_color ?? prev.color,
        }));
      });
  }, [transport_id]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { data: row, error } = await supabase
      .from("vehicle_checklists")
      .insert({
        created_by: user.id,
        transport_id: transport_id || null,
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
        photos: data.photos,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !row) return toast.error(error?.message ?? "Erro ao salvar.");
    if (transport_id) {
      await supabase.from("transport_events").insert({
        transport_id, event_type: "checklist_created",
        description: "Checklist do veículo realizado", created_by: user.id,
      });
    }
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
      {linkedTransport && (
        <div className="max-w-5xl mx-auto mb-3 text-xs text-muted-foreground">
          Vinculado ao transporte <span className="font-medium text-foreground">{linkedTransport.code}</span>
        </div>
      )}
      <ChecklistForm data={data} onChange={setData} checklistId={draftId} company={company} />
    </AppLayout>
  );
}
