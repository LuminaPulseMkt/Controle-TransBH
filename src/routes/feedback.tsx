import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/transbh-logo.jpeg";

export const Route = createFileRoute("/feedback")({
  component: FeedbackPage,
});

function FeedbackPage() {
  const { ref, client } = useMemo(() => {
    if (typeof window === "undefined") return { ref: undefined, client: undefined };
    const p = new URLSearchParams(window.location.search);
    return { ref: p.get("ref") ?? undefined, client: p.get("client") ?? undefined };
  }, []);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState(client ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("google_review_url")
        .maybeSingle();
      setReviewUrl(data?.google_review_url ?? null);
    })();
  }, []);

  const submit = async () => {
    if (rating < 1) return toast.error("Selecione uma avaliação.");
    setBusy(true);
    const { error } = await supabase.from("transport_feedback").insert({
      transport_code: ref ?? null,
      client_name: name || null,
      rating,
      comment: comment || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(true);

    if (rating >= 4 && reviewUrl) {
      setTimeout(() => { window.location.href = reviewUrl; }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex flex-col items-center mb-4">
          <img src={logo} alt="TransBH" className="h-16 w-16 rounded object-contain mb-2" />
          <h1 className="text-display text-2xl">Como foi sua entrega?</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Sua opinião nos ajuda a melhorar.
          </p>
        </div>

        {done ? (
          <div className="text-center py-6 space-y-2">
            <div className="text-5xl">🙏</div>
            <h2 className="text-display text-xl">Obrigado pela avaliação!</h2>
            {rating >= 4 && reviewUrl && (
              <p className="text-sm text-muted-foreground">Redirecionando ao Google...</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="p-1"
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      n <= (hover || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>

            <div>
              <Label>Seu nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <Label>Comentário (opcional)</Label>
              <Textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos sobre sua experiência..."
              />
            </div>

            {ref && (
              <p className="text-xs text-muted-foreground">Transporte: {ref}</p>
            )}

            <Button onClick={submit} disabled={busy} className="w-full">
              {busy ? "Enviando..." : "Enviar avaliação"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
