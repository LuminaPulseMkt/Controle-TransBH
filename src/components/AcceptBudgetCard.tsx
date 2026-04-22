import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, FileSignature, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { acceptBudget } from "@/server/accept-budget.functions";
import { dateBR } from "@/lib/format";

interface Props {
  token: string;
  acceptedAt?: string | null;
  acceptedContractToken?: string | null;
  onAccepted?: (contractToken: string) => void;
}

export function AcceptBudgetCard({ token, acceptedAt, acceptedContractToken, onAccepted }: Props) {
  const acceptFn = useServerFn(acceptBudget);
  const [agree, setAgree] = useState(false);
  const [delivery, setDelivery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ contract_token: string | null; accepted_at: string } | null>(
    acceptedAt
      ? { contract_token: acceptedContractToken ?? null, accepted_at: acceptedAt }
      : null,
  );

  const handleAccept = async () => {
    if (!agree) return toast.error("Você precisa concordar com as condições.");
    setSubmitting(true);
    try {
      const res = await acceptFn({
        data: { token, accepted: true, estimated_delivery: delivery || undefined },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult({ contract_token: res.contract_token, accepted_at: res.accepted_at });
      toast.success(res.already ? "Orçamento já havia sido aceito." : "Orçamento aceito! Contrato gerado.");
      if (res.contract_token && onAccepted) onAccepted(res.contract_token);
    } catch (e) {
      toast.error("Erro ao processar aceite. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-base">Orçamento aceito</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              em {dateBR(result.accepted_at)} · contrato gerado automaticamente
            </div>
          </div>
        </div>
        {result.contract_token && (
          <Link
            to="/d/$token"
            params={{ token: result.contract_token }}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Ver contrato gerado <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <FileSignature className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">Aceitar este orçamento</div>
          <div className="text-xs text-muted-foreground">
            Ao aceitar, geramos automaticamente o contrato e iniciamos o atendimento.
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="delivery" className="text-xs">Data prevista de entrega (opcional)</Label>
        <Input
          id="delivery"
          type="date"
          value={delivery}
          onChange={(e) => setDelivery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={agree}
          onCheckedChange={(c) => setAgree(!!c)}
          className="mt-0.5"
        />
        <span className="text-sm text-foreground/90">
          Li e concordo com as condições deste orçamento.
        </span>
      </label>

      <Button onClick={handleAccept} disabled={!agree || submitting} className="w-full sm:w-auto">
        {submitting ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando…</>
        ) : (
          <>Aceitar orçamento e gerar contrato <ArrowRight className="h-4 w-4 ml-2" /></>
        )}
      </Button>
    </div>
  );
}
