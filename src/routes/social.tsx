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
import logoTransbh from "@/assets/transbh-logo.jpeg";

export const Route = createFileRoute("/social")({
  component: () => (
    <AuthGate>
      <SocialPage />
    </AuthGate>
  ),
});

type Transport = {
  id: string; code: string; client_name: string; vehicle_plate: string;
  origin_city: string; destination_city: string;
};

function SocialPage() {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [photos, setPhotos] = useState<{ id: string; photo_url: string }[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string>("");
  const [companyLogo, setCompanyLogo] = useState<string>(logoTransbh);
  const cardRef = useRef<HTMLDivElement>(null);
  const [satisfactionLink, setSatisfactionLink] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase
          .from("transports")
          .select("id, code, client_name, vehicle_plate, origin_city, destination_city")
          .eq("status", "delivered")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("company_settings").select("logo_url").maybeSingle(),
      ]);
      setTransports(t ?? []);
      if (c?.logo_url) setCompanyLogo(c.logo_url);
    })();
  }, []);

  useEffect(() => {
    if (!selected) { setPhotos([]); setSelectedPhoto(""); return; }
    (async () => {
      const { data } = await supabase
        .from("transport_photos")
        .select("id, photo_url")
        .eq("transport_id", selected)
        .order("created_at", { ascending: false });
      setPhotos(data ?? []);
      setSelectedPhoto(data?.[0]?.photo_url ?? "");
    })();
  }, [selected]);

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
          Selecione um transporte entregue, escolha a foto de fundo e gere a imagem.
        </p>
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div className="space-y-3">
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
            </div>

            {photos.length > 0 ? (
              <div>
                <Label>Foto de fundo</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {photos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPhoto(p.photo_url)}
                      className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                        selectedPhoto === p.photo_url ? "border-primary scale-95" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={p.photo_url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                    </button>
                  ))}
                </div>
              </div>
            ) : selected ? (
              <p className="text-xs text-muted-foreground">Este transporte não tem fotos cadastradas. Adicione fotos na página do transporte.</p>
            ) : null}

            <Button onClick={downloadCard} disabled={!current} className="w-full">
              <Download className="h-4 w-4 mr-1" /> Baixar imagem
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg">
            <div
              ref={cardRef}
              className="w-full aspect-square relative bg-black"
              style={{ color: "white" }}
            >
              {/* Background photo */}
              {selectedPhoto ? (
                <img
                  src={selectedPhoto}
                  alt=""
                  crossOrigin="anonymous"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, oklch(0.18 0.04 255) 0%, oklch(0.22 0.045 255) 100%)",
                  }}
                />
              )}

              {/* Dark gradient overlay for legibility */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.85) 100%)",
                }}
              />

              {/* Logo top-left */}
              <img
                src={companyLogo}
                alt="TransBH"
                crossOrigin="anonymous"
                style={{
                  position: "absolute",
                  top: 24,
                  left: 24,
                  height: 72,
                  width: 72,
                  objectFit: "contain",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.95)",
                  padding: 6,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                }}
              />

              {/* Bottom info */}
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  right: 24,
                  bottom: 24,
                }}
              >
                <div style={{ fontFamily: "Bebas Neue", fontSize: 36, lineHeight: 1.1, letterSpacing: 1 }}>
                  ENTREGA REALIZADA<br />COM SUCESSO!
                </div>
                {current && (
                  <div style={{ fontSize: 16, marginTop: 10, opacity: 0.95 }}>
                    {current.origin_city} → {current.destination_city}
                  </div>
                )}
                {current && (
                  <div style={{ fontSize: 12, marginTop: 4, fontFamily: "monospace", opacity: 0.75 }}>
                    {current.vehicle_plate} · {current.code}
                  </div>
                )}
              </div>

              {/* Green stamp bottom-right */}
              <div
                style={{
                  position: "absolute",
                  bottom: 28,
                  right: 24,
                  transform: "rotate(-12deg)",
                  border: "4px double #1f7a3a",
                  color: "#1f7a3a",
                  background: "rgba(255,255,255,0.92)",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontFamily: "Bebas Neue, sans-serif",
                  fontSize: 22,
                  letterSpacing: 2,
                  fontWeight: 700,
                  textAlign: "center",
                  lineHeight: 1.1,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                  textShadow: "0 0 1px rgba(31,122,58,0.3)",
                }}
              >
                ENTREGUE<br />COM SUCESSO
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

void Input;
