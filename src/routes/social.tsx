import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Facebook, MessageCircle, MapPin, Download, Star, Copy } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";

export const Route = createFileRoute("/social")({
  component: () => (
    <AuthGate>
      <SocialPage />
    </AuthGate>
  ),
});

function SocialPage() {
  const [transports, setTransports] = useState<{ id: string; code: string; client_name: string; vehicle_plate: string; origin_city: string; destination_city: string }[]>([]);
  const [selected, setSelected] = useState<string>("");
  const cardRef = useRef<HTMLDivElement>(null);
  const [satisfactionLink, setSatisfactionLink] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("transports")
        .select("id, code, client_name, vehicle_plate, origin_city, destination_city")
        .eq("status", "delivered")
        .order("created_at", { ascending: false })
        .limit(20);
      setTransports(data ?? []);
    })();
  }, []);

  const current = transports.find((t) => t.id === selected);

  const downloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `transbh-entrega-${current?.code ?? "card"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      toast.error("Falha ao gerar imagem.");
    }
  };

  const generateSatisfactionLink = () => {
    const base = window.location.origin;
    const params = new URLSearchParams({ ref: current?.code ?? "", client: current?.client_name ?? "" });
    const link = `${base}/feedback?${params.toString()}`;
    setSatisfactionLink(link);
    void navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  return (
    <AppLayout title="Social & Marketing">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-display text-xl mb-3">Redes Sociais</h2>
          <div className="grid grid-cols-2 gap-3">
            <SocialLink href="https://instagram.com/TransBH" icon={Instagram} label="Instagram" color="bg-pink-500/15 text-pink-400" />
            <SocialLink href="https://facebook.com/TransBH" icon={Facebook} label="Facebook" color="bg-blue-500/15 text-blue-400" />
            <SocialLink href="https://wa.me/" icon={MessageCircle} label="WhatsApp Business" color="bg-green-500/15 text-green-400" />
            <SocialLink href="https://business.google.com" icon={MapPin} label="Google Business" color="bg-amber-500/15 text-amber-400" />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-display text-xl mb-3">Link de Satisfação</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Gere um link para o cliente avaliar o serviço após a entrega.
          </p>
          <div className="space-y-2">
            <Label>Selecionar entrega</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Escolher transporte entregue" /></SelectTrigger>
              <SelectContent>
                {transports.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.code} — {t.client_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generateSatisfactionLink} disabled={!selected} className="w-full mt-2">
              <Star className="h-4 w-4 mr-1" /> Gerar e copiar link
            </Button>
            {satisfactionLink && (
              <div className="flex items-center gap-2 mt-2 p-2 rounded bg-muted text-xs break-all">
                <span className="flex-1">{satisfactionLink}</span>
                <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(satisfactionLink); toast.success("Copiado"); }}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5 mt-4">
        <h2 className="text-display text-xl mb-3">Card de Entrega Concluída</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Selecione um transporte entregue e gere uma imagem para postar nas redes.
        </p>
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div>
            <Label>Transporte</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Escolher entrega" /></SelectTrigger>
              <SelectContent>
                {transports.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.code} — {t.client_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={downloadCard} disabled={!current} className="w-full mt-3">
              <Download className="h-4 w-4 mr-1" /> Baixar imagem
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg">
            <div
              ref={cardRef}
              className="w-full aspect-square relative"
              style={{
                background: "linear-gradient(135deg, oklch(0.18 0.04 255) 0%, oklch(0.22 0.045 255) 100%)",
                color: "white",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontFamily: "Bebas Neue", fontSize: 48, color: "oklch(0.78 0.16 70)", letterSpacing: 2 }}>
                  TransBH
                </div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 3, opacity: 0.6, marginTop: -6 }}>
                  Transporte de Veículos
                </div>
              </div>
              <div>
                <div style={{ fontSize: 48 }}>🚗</div>
                <div style={{ fontFamily: "Bebas Neue", fontSize: 36, lineHeight: 1.1, marginTop: 8 }}>
                  ENTREGA REALIZADA<br />COM SUCESSO!
                </div>
                {current && (
                  <div style={{ fontSize: 16, marginTop: 16, opacity: 0.85 }}>
                    {current.origin_city} → {current.destination_city}
                  </div>
                )}
                {current && (
                  <div style={{ fontSize: 12, marginTop: 4, fontFamily: "monospace", opacity: 0.55 }}>
                    {current.vehicle_plate} · {current.code}
                  </div>
                )}
              </div>
              <div style={{ borderTop: "1px solid oklch(0.32 0.04 255)", paddingTop: 12, fontSize: 11, opacity: 0.6 }}>
                @TransBH · transporte com confiança
              </div>
            </div>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}

function SocialLink({ href, icon: Icon, label, color }: { href: string; icon: any; label: string; color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`p-4 rounded-lg ${color} flex items-center gap-3 hover:scale-[1.02] transition-transform`}>
      <Icon className="h-6 w-6" />
      <span className="font-medium">{label}</span>
    </a>
  );
}
