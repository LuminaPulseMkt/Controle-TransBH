import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { waLink } from "@/lib/format";
import { VISTORIA_KIND_LABEL, vistoriaMessage, type VistoriaKind } from "@/lib/vistoria-types";
import { Copy, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export interface SendTarget {
  /** Vistoria já existente a reaproveitar; sem ela, um novo link é gerado. */
  existing?: { token: string; access_code: string; kind: VistoriaKind };
  kind?: VistoriaKind;
}

interface Props {
  target: SendTarget | null;
  transport: {
    id: string;
    client_name: string;
    vehicle_plate: string;
    vehicle_brand: string | null;
    vehicle_model: string | null;
  };
  onClose: () => void;
  onCreated: () => void;
}

/** Envia a vistoria (com modelo e placa) para quem vai receber/coletar o veículo. */
export function SendVistoriaDialog({ target, transport, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [kind, setKind] = useState<VistoriaKind>("entrega");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    setKind(target.existing?.kind ?? target.kind ?? "entrega");
    setName("");
    setPhone("");
  }, [target]);

  const vehicle = [transport.vehicle_brand, transport.vehicle_model].filter(Boolean).join(" ");

  // Garante um link: reaproveita o existente ou cria um novo para este destinatário.
  const ensureLink = async () => {
    if (target?.existing) return target.existing;
    const { data, error } = await supabase
      .from("vistorias")
      .insert({ transport_id: transport.id, kind, created_by: user?.id ?? null })
      .select("token, access_code, kind")
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "sem permissão para gerar a vistoria");
    onCreated();
    return data as { token: string; access_code: string; kind: VistoriaKind };
  };

  const buildText = (v: { token: string; access_code: string; kind: VistoriaKind }) =>
    vistoriaMessage({
      clientName: transport.client_name,
      kind: v.kind,
      plate: transport.vehicle_plate,
      token: v.token,
      accessCode: v.access_code,
      vehicle,
      recipientName: name,
    });

  const sendWhatsApp = async () => {
    // Abre a aba antes do await para o navegador não bloquear o pop-up.
    const win = window.open("", "_blank");
    setBusy(true);
    try {
      const v = await ensureLink();
      const text = buildText(v);
      const url = waLink(phone, text) ?? `https://wa.me/?text=${encodeURIComponent(text)}`;
      if (win) win.location.href = url;
      else window.open(url, "_blank", "noopener");
      onClose();
    } catch (e) {
      win?.close();
      toast.error("Não foi possível preparar o envio: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyMessage = async () => {
    setBusy(true);
    try {
      const v = await ensureLink();
      await navigator.clipboard.writeText(buildText(v));
      toast.success("Mensagem copiada.");
    } catch (e) {
      toast.error("Não foi possível copiar: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar vistoria a quem vai receber/coletar</DialogTitle>
          <DialogDescription>
            A mensagem leva o modelo e a placa do veículo ({vehicle || "veículo"} · {transport.vehicle_plate}) e pede para
            a pessoa fazer a vistoria no momento do recebimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!target?.existing && (
            <div className="space-y-1.5">
              <Label>Tipo de vistoria</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["coleta", "entrega"] as VistoriaKind[]).map((k) => (
                  <Button key={k} type="button" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
                    {VISTORIA_KIND_LABEL[k]}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {kind === "entrega" ? "Para quem vai receber o veículo no destino." : "Para quem vai coletar o veículo na origem."}
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="sv-name">Nome de quem vai {kind === "entrega" ? "receber" : "coletar"}</Label>
            <Input id="sv-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sv-phone">WhatsApp</Label>
            <Input id="sv-phone" inputMode="tel" placeholder="(61) 90000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={copyMessage} disabled={busy}>
            <Copy className="h-4 w-4 mr-1" /> Copiar mensagem
          </Button>
          <Button type="button" onClick={sendWhatsApp} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageCircle className="h-4 w-4 mr-1" />}
            Enviar pelo WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
