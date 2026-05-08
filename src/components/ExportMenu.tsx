import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { exportCSV, exportPDF, type Cell } from "@/lib/exporters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  filename: string;
  title: string;
  subtitle?: string;
  columns: string[];
  rows: Cell[][];
  summary?: { label: string; value: string }[];
  orientation?: "portrait" | "landscape";
  disabled?: boolean;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
}

type CompanyInfo = { name: string | null; logo_url: string | null };
let cachedCompany: CompanyInfo | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

async function getCompany(): Promise<CompanyInfo> {
  if (cachedCompany && Date.now() - cachedAt < CACHE_TTL_MS) return cachedCompany;
  const { data } = await supabase
    .from("company_settings")
    .select("name,logo_url")
    .maybeSingle();
  cachedCompany = data ?? { name: null, logo_url: null };
  cachedAt = Date.now();
  return cachedCompany;
}

export function ExportMenu({
  filename,
  title,
  subtitle,
  columns,
  rows,
  summary,
  orientation,
  disabled,
  size = "sm",
  variant = "outline",
}: Props) {
  const [busy, setBusy] = useState(false);

  const handleCSV = () => {
    if (!rows.length) return toast.message("Nada para exportar.");
    exportCSV(filename, columns, rows);
  };

  const handlePDF = async () => {
    if (!rows.length) return toast.message("Nada para exportar.");
    setBusy(true);
    try {
      const company = await getCompany();
      await exportPDF({ filename, title, subtitle, columns, rows, company, summary, orientation });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} disabled={disabled || busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePDF}>
          <FileText className="h-4 w-4 mr-2" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV (Excel)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
