import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import fallbackLogo from "@/assets/logo-transbh.png";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-7",
  md: "h-12",
  lg: "h-20",
};

let cachedLogo: string | null | undefined = undefined;
const subscribers = new Set<(v: string | null) => void>();

async function loadLogo() {
  if (cachedLogo !== undefined) return;
  cachedLogo = null;
  try {
    const { data } = await supabase
      .from("company_settings")
      .select("logo_url")
      .maybeSingle();
    cachedLogo = data?.logo_url ?? null;
  } catch {
    cachedLogo = null;
  }
  subscribers.forEach((fn) => fn(cachedLogo ?? null));
}

interface Props {
  size?: Size;
  className?: string;
  alt?: string;
}

export function BrandLogo({ size = "md", className, alt = "TransBH" }: Props) {
  const [src, setSrc] = useState<string>(cachedLogo || fallbackLogo);

  useEffect(() => {
    if (cachedLogo !== undefined) {
      setSrc(cachedLogo || fallbackLogo);
    } else {
      const cb = (v: string | null) => setSrc(v || fallbackLogo);
      subscribers.add(cb);
      void loadLogo();
      return () => {
        subscribers.delete(cb);
      };
    }
  }, []);

  return (
    <img
      src={src}
      alt={alt}
      onError={(e) => {
        if (e.currentTarget.src !== fallbackLogo) e.currentTarget.src = fallbackLogo;
      }}
      className={cn(SIZE_CLASS[size], "w-auto object-contain", className)}
    />
  );
}
