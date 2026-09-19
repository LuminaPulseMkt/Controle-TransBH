import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Search = { ref?: string; client?: string };

export const Route = createFileRoute("/feedback")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ref: typeof s.ref === "string" ? s.ref : undefined,
    client: typeof s.client === "string" ? s.client : undefined,
  }),
  component: FeedbackPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="p-6 max-w-md text-center">
        <p className="text-destructive">Erro: {error.message}</p>
      </Card>
    </div>
  ),
});

function FeedbackPage() {
  const { ref, client } = useSearch({ from: "/feedback" });
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_company_info").maybeSingle();
      setReviewUrl(data?.google_review_url ?? null);
      setLogoUrl(data?.logo_url ?? null);
    })();
  }, []);

  const submit = async () => {
    if (!rating) return toast.error("Selecione uma nota.");
    setBusy(true);
    const { error } = await supabase.from("transport_feedback").insert({
      transport_code: ref ?? null,
      client_name: client ?? null,
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="p-6 max-w-md w-full">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-14 mx-auto mb-4 object-contain" />
        ) : (
          <div className="text-display text-3xl text-primary text-center mb-4">TransBH</div>
        )}

        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-14 w-14 mx-auto text-green-500 mb-3" />
            <h2 className="text-xl font-semibold">Obrigado pela avaliação!</h2>
            {rating >= 4 && reviewUrl ? (
              <p className="text-sm text-muted-foreground mt-2">Redirecionando para o Google Reviews…</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Seu retorno é muito importante para nós.</p>
            )}
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-center">Como foi a sua entrega?</h2>
            {client && <p className="text-sm text-muted-foreground text-center mt-1">Olá, {client}!</p>}
            {ref && <p className="text-xs text-muted-foreground text-center font-mono">{ref}</p>}

            <div className="flex justify-center gap-1 my-5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${n} estrelas`}
                >
                  <Star
                    className={`h-9 w-9 ${
                      (hover || rating) >= n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>

            <Label>Comentário (opcional)</Label>
            <Textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte-nos sobre sua experiência…"
              className="mt-1"
            />

            <Button onClick={submit} disabled={busy || !rating} className="w-full mt-4">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar avaliação"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
