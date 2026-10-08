import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vistoria/")({
  head: () => ({
    meta: [{ title: "Acessar vistoria — TransBH" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: VistoriaAccessPage,
});

function VistoriaAccessPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanPlate = plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (cleanCode.length < 6 || cleanPlate.length < 7) {
      return toast.error("Informe o código de 6 caracteres e a placa do veículo.");
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("find_vistoria_token", { _code: cleanCode, _plate: cleanPlate });
    setBusy(false);
    if (error) return toast.error("Não foi possível consultar agora. Tente novamente.");
    if (!data) return toast.error("Código ou placa incorretos, ou vistoria já finalizada/expirada.");
    navigate({ to: "/vistoria/$token", params: { token: data } });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-6">
        <div className="flex justify-center mb-6">
          <BrandLogo size="md" />
        </div>
        <Card className="p-6 space-y-5">
          <div className="space-y-1 text-center">
            <Lock className="h-7 w-7 mx-auto text-primary" />
            <h1 className="text-lg font-semibold">Vistoria por acionamento</h1>
            <p className="text-sm text-muted-foreground">
              Informe o código recebido e a placa do veículo para iniciar a vistoria.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="v-code">Código de acesso</Label>
              <Input
                id="v-code"
                className="uppercase tracking-widest text-center font-mono text-lg"
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-plate">Placa do veículo</Label>
              <Input
                id="v-plate"
                className="uppercase text-center font-mono text-lg"
                maxLength={8}
                autoComplete="off"
                autoCapitalize="characters"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Acessar vistoria"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
