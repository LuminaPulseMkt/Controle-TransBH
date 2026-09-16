import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;

interface Props {
  /** Token público do documento — usado como pasta de upload. */
  token: string;
  label?: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

/**
 * Versão anônima do SignaturePad: permite que o cliente assine o documento
 * diretamente pelo link público, sem necessidade de login.
 */
export function PublicSignaturePad({ token, label = "Assinatura do contratante", value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
  }, [value]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setHasInk(true);
  };

  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasInk(false);
    onChange(null);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível gerar a imagem."))), "image/png"),
      );
      const path = `${token}/${Date.now()}.png`;
      const { error } = await supabase.storage
        .from("contract-signatures")
        .upload(path, blob, { contentType: "image/png", upsert: true });
      if (error) throw error;

      const { data, error: signErr } = await supabase.storage
        .from("contract-signatures")
        .createSignedUrl(path, TEN_YEARS_IN_SECONDS);
      if (signErr || !data?.signedUrl) throw signErr ?? new Error("Não foi possível gerar o link da assinatura.");

      onChange(data.signedUrl);
      toast.success("Assinatura registrada.");
    } catch (e) {
      toast.error((e as Error).message || "Erro ao salvar a assinatura.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {value && <span className="text-xs text-emerald-600">✓ Assinado</span>}
      </div>
      {value ? (
        <div className="border border-input rounded-md bg-white p-2">
          <img src={value} alt={label} className="h-24 mx-auto object-contain" />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="w-full h-32 border border-input rounded-md bg-white touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={clear} disabled={busy}>
          <Eraser className="h-3.5 w-3.5 mr-1" /> Limpar
        </Button>
        {!value && (
          <Button type="button" size="sm" onClick={save} disabled={busy || !hasInk}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            Salvar assinatura
          </Button>
        )}
      </div>
    </div>
  );
}
