import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Eraser, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadVistoriaFile } from "@/lib/vistoria-upload";

interface Props {
  token: string;
  value: string | null;
  onChange: (url: string | null) => void;
  name?: string;
}

export function VistoriaSignature({ token, value, onChange, name = "assinatura-cliente" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    if (value) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
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
    ctx.lineWidth = 2.5;
  }, [value]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
    setHasInk(false);
    onChange(null);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar a assinatura."))), "image/png"),
      );
      const url = await uploadVistoriaFile(token, name, blob, "image/png");
      onChange(url);
      toast.success("Assinatura salva.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="border border-input rounded-md bg-white p-2">
          <img src={value} alt="Assinatura" className="h-28 mx-auto object-contain" />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="w-full h-44 border border-input rounded-md bg-white touch-none"
          onPointerDown={(e) => {
            e.preventDefault();
            drawing.current = true;
            last.current = pos(e);
            canvasRef.current?.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drawing.current || !last.current) return;
            const ctx = canvasRef.current!.getContext("2d")!;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(last.current.x, last.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            last.current = p;
            setHasInk(true);
          }}
          onPointerUp={() => { drawing.current = false; last.current = null; }}
          onPointerCancel={() => { drawing.current = false; last.current = null; }}
        />
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={clear}>
          <Eraser className="h-3.5 w-3.5 mr-1" /> Limpar
        </Button>
        {!value && (
          <Button type="button" size="sm" onClick={save} disabled={busy || !hasInk}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            Confirmar assinatura
          </Button>
        )}
      </div>
    </div>
  );
}
