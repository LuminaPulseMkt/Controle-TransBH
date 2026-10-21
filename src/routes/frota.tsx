import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FleetRegisterTab } from "@/components/fleet/FleetRegisterTab";
import { TowSheetsTab } from "@/components/fleet/TowSheetsTab";
import { TripSheetsTab } from "@/components/fleet/TripSheetsTab";
import { supabase } from "@/integrations/supabase/client";
import type { FleetVehicle } from "@/lib/fleet-types";
import { toast } from "sonner";

export const Route = createFileRoute("/frota")({
  head: () => ({
    meta: [
      { title: "Frota — TransBH" },
      { name: "description", content: "Cadastro de carretas e guinchos, planilhas de viagem (carretas) e de diárias (guinchos)." },
    ],
  }),
  component: () => (
    <AuthGate requirePermission="transports.view">
      <FleetPage />
    </AuthGate>
  ),
});

function FleetPage() {
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("fleet_vehicles")
      .select("id, kind, plate, model, year, capacity, driver_name, daily_rate, notes, is_active")
      .order("plate");
    if (error) return toast.error("Erro ao carregar a frota: " + error.message);
    setFleet((data ?? []) as FleetVehicle[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const carretas = useMemo(() => fleet.filter((f) => f.kind === "carreta"), [fleet]);

  return (
    <AppLayout title="Frota">
      <Tabs defaultValue="carretas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="carretas">Carretas</TabsTrigger>
          <TabsTrigger value="guinchos">Guinchos</TabsTrigger>
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
        </TabsList>
        <TabsContent value="carretas">
          <TripSheetsTab fleet={carretas} />
        </TabsContent>
        <TabsContent value="guinchos">
          <TowSheetsTab fleet={fleet} />
        </TabsContent>
        <TabsContent value="cadastro">
          <FleetRegisterTab fleet={fleet} onChanged={load} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
