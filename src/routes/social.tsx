import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Facebook, MessageCircle, MapPin, Download, Star, Copy, Camera } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";

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
  const [photos, setPhotos] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string[]>([]); // up to 4
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [satisfactionLink, setSatisfactionLink] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: tr }, { data: c }] = await Promise.all([
        supabase
          .from("transports")
          .select("id, code, client_name, vehicle_plate, origin_city, destination_city")
          .eq("status", "delivered")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("company_settings").select("logo_url").maybeSingle(),
      ]);
      setTransports(tr ?? []);
      setLogoUrl(c?.logo_url ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!selected) { setPhotos([]); setChosen([]); return; }
    (async () => {
      const { data } = await supabase
        .from("transport_photos")
        .select("photo_url")
        .eq("transport_id", selected)
        .order("created_at", { ascending: false });
      const urls = (data ?? []).map((p) => p.photo_url);
      setPhotos(urls);
      setChosen(urls.slice(0, 4));
    })();
  }, [selected]);

  const current = transports.find((t) => t.id === selected);

  const togglePhoto = (url: string) => {
    setChosen((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= 4) return [...prev.slice(1), url];
      return [...prev, url];
    });
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `transbh-entrega-${current?.code ?? "card"}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
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

  // Pad chosen to 4 slots (with null for placeholder)
  const slots: (string | null)[] = [0, 1, 2, 3].map((i) => chosen[i] ?? null);

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
          Escolha o transporte e selecione até 4 fotos para a colagem.
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

            {selected && (
              <div>
                <Label>Fotos ({chosen.length}/4 selecionadas)</Label>
                {photos.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-2">
                    Este transporte não tem fotos — adicione em Transportes.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {photos.map((url) => {
                      const idx = chosen.indexOf(url);
                      const active = idx >= 0;
                      return (
                        <button
                          key={url}
                          type="button"
                          onClick={() => togglePhoto(url)}
                          className={`relative aspect-square rounded overflow-hidden border-2 transition ${
                            active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {active && (
                            <div className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                              {idx + 1}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <Button onClick={downloadCard} disabled={!current} className="w-full">
              <Download className="h-4 w-4 mr-1" /> Baixar imagem
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg">
            <div
              ref={cardRef}
              className="w-full aspect-square relative"
              style={{ background: "#0b0b0b" }}
            >
              {/* Colagem 2x2 */}
              <div
                style={{
                  position: "absolute", inset: 0,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gridTemplateRows: "1fr 1fr",
                  gap: "4px",
                  background: "white",
                }}
              >
                {slots.map((url, i) => (
                  <div key={i} style={{ overflow: "hidden", background: "#1a1a1a", position: "relative" }}>
                    {url ? (
                      <img
                        src={url}
                        alt=""
                        crossOrigin="anonymous"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        color: "#555", gap: 6,
                      }}>
                        <Camera size={36} />
                        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2 }}>sem foto</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Logo - canto superior direito (fundo transparente, maior) */}
              <div style={{
                position: "absolute", top: -8, right: -8,
              }}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    crossOrigin="anonymous"
                    style={{
                      height: 200, width: "auto", display: "block", objectFit: "contain",
                      filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.55))",
                    }}
                  />
                ) : (
                  <div style={{
                    fontFamily: "Bebas Neue", fontSize: 52, lineHeight: 1,
                    color: "white", letterSpacing: 2,
                    textShadow: "0 3px 8px rgba(0,0,0,0.6)",
                  }}>
                    TransBH
                  </div>
                )}
              </div>

              {/* Carimbo - canto inferior direito (menor) */}
              <div style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%) rotate(-12deg)",
                border: "3px double #1f5f3a",
                borderRadius: 8,
                padding: "7px 14px",
                background: "rgba(255, 252, 240, 0.98)",
                color: "#1f5f3a",
                fontFamily: "Bebas Neue, Impact, sans-serif",
                fontSize: 26,
                lineHeight: 1,
                letterSpacing: 2,
                textAlign: "center",
                boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                width: 220,
              }}>
                <div style={{ fontSize: 9, letterSpacing: 4, marginBottom: 3 }}>★ ★ ★</div>
                ENTREGUE<br />COM SUCESSO
                <div style={{ fontSize: 9, letterSpacing: 4, marginTop: 3 }}>★ ★ ★</div>
              </div>

              {/* Rodapé com info */}
              {current && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))",
                  color: "white",
                  padding: "24px 20px 14px 20px",
                  fontSize: 14,
                }}>
                  <div style={{ fontWeight: 600 }}>
                    {current.origin_city} → {current.destination_city}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", opacity: 0.8, marginTop: 2 }}>
                    {current.vehicle_plate} · {current.code}
                  </div>
                </div>
              )}
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
