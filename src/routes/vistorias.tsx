import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VistoriaViewDialog } from "@/components/vistoria/VistoriaViewDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCompanyInfo } from "@/lib/use-company-info";
import { waLink } from "@/lib/format";
import { exportVistoriaPDF } from "@/lib/vistoria-pdf";
import {
  VISTORIA_KIND_LABEL, VISTORIA_STATUS_LABEL, normalizeVistoriaData, vistoriaLink, vistoriaMessage,
  type VistoriaKind, type VistoriaStatus, type VistoriaTransportInfo,
} from "@/lib/vistoria-types";
import { Copy, Download, ExternalLink, Eye, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vistorias")({
  component: () => (
    <AuthGate requirePermission="transports.view">
      <VistoriasPage />
    </AuthGate>
  ),
});

interface Row {
  id: string;
  token: string;
  access_code: string;
  kind: VistoriaKind;
  status: VistoriaStatus;
  data: unknown;
  expires_at: string;
  finished_at: string | null;
  created_at: string;
  transport_id: string;
  transports: VistoriaTransportInfo | null;
}

const TRANSPORT_FIELDS =
  "code, client_name, client_phone, client_email, client_document, vehicle_plate, vehicle_brand, vehicle_model, vehicle_color, vehicle_year, vehicle_chassis, origin_city, origin_state, destination_city, destination_state";

function VistoriasPage() {
  const { can } = useAuth();
  const company = useCompanyInfo();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"todos" | VistoriaStatus | "expirada">("todos");
  const [kind, setKind] = useState<"todos" | VistoriaKind>("todos");
  const [viewing, setViewing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("vistorias")
      .select(`id, token, access_code, kind, status, data, expires_at, finished_at, created_at, transport_id, transports(${TRANSPORT_FIELDS})`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Erro ao carregar vistorias: " + error.message);
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isExpired = (r: Row) => r.status !== "finalizada" && new Date(r.expires_at) <= new Date();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
    return rows.filter((r) => {
      if (kind !== "todos" && r.kind !== kind) return false;
      if (status === "expirada") {
        if (!isExpired(r)) return false;
      } else if (status !== "todos" && (r.status !== status || isExpired(r))) {
        return false;
      }
      if (!q) return true;
      const t = r.transports;
      const hay = [t?.vehicle_plate, t?.client_name, t?.code, r.access_code, t?.vehicle_model]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "");
      return hay.includes(q);
    });
  }, [rows, search, status, kind]);

  const copy = async (r: Row) => {
    try {
      await navigator.clipboard.writeText(vistoriaLink(r.token));
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Link: " + vistoriaLink(r.token));
    }
  };

  const whatsapp = (r: Row) => {
    const t = r.transports;
    if (!t) return;
    const text = vistoriaMessage({
      clientName: t.client_name,
      kind: r.kind,
      plate: t.vehicle_plate,
      token: r.token,
      accessCode: r.access_code,
    });
    window.open(waLink(t.client_phone, text) ?? `https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const remove = async (r: Row) => {
    if (!window.confirm("Excluir esta vistoria? O link deixará de funcionar.")) return;
    const { data, error } = await supabase.from("vistorias").delete().eq("id", r.id).select("id");
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) return toast.error("Sem permissão para excluir esta vistoria.");
    toast.success("Vistoria excluída.");
    void load();
  };

  const pdf = (r: Row) => {
    if (!r.transports) return;
    return exportVistoriaPDF({
      kind: r.kind,
      data: normalizeVistoriaData(r.data),
      transport: r.transports,
      finishedAt: r.finished_at,
      company: company ? { name: company.name, logo_url: company.logo_url } : null,
    });
  };

  const counts = useMemo(
    () => ({
      abertas: rows.filter((r) => r.status !== "finalizada" && !isExpired(r)).length,
      finalizadas: rows.filter((r) => r.status === "finalizada").length,
    }),
    [rows],
  );

  return (
    <AppLayout title="Vistorias">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="max-w-xs"
            placeholder="Buscar por placa, cliente, código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pendente">{VISTORIA_STATUS_LABEL.pendente}</SelectItem>
              <SelectItem value="em_andamento">{VISTORIA_STATUS_LABEL.em_andamento}</SelectItem>
              <SelectItem value="finalizada">{VISTORIA_STATUS_LABEL.finalizada}</SelectItem>
              <SelectItem value="expirada">Link expirado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Coleta e entrega</SelectItem>
              <SelectItem value="coleta">Coleta</SelectItem>
              <SelectItem value="entrega">Entrega</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">
            {counts.abertas} em aberto · {counts.finalizadas} finalizadas
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma vistoria encontrada. Gere os links de coleta e entrega na página de cada transporte.
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const t = r.transports;
              const expired = isExpired(r);
              return (
                <Card key={r.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold">{t?.vehicle_plate ?? "—"}</span>
                      <span className="text-sm">{[t?.vehicle_brand, t?.vehicle_model].filter(Boolean).join(" ")}</span>
                      <Badge variant="outline">{VISTORIA_KIND_LABEL[r.kind]}</Badge>
                      <Badge variant={r.status === "finalizada" ? "default" : "secondary"}>
                        {expired ? "Link expirado" : VISTORIA_STATUS_LABEL[r.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t?.client_name} · Transporte {t?.code} · Código{" "}
                      <span className="font-mono font-semibold text-foreground">{r.access_code}</span> ·{" "}
                      {r.status === "finalizada" && r.finished_at
                        ? `Finalizada em ${new Date(r.finished_at).toLocaleString("pt-BR")}`
                        : `Válido até ${new Date(r.expires_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.status !== "finalizada" && !expired && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => copy(r)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Link
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => whatsapp(r)}>
                          <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                        </Button>
                      </>
                    )}
                    {r.status !== "pendente" && (
                      <Button size="sm" variant="outline" onClick={() => setViewing(r)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                      </Button>
                    )}
                    {r.status === "finalizada" && (
                      <Button size="sm" variant="outline" onClick={() => pdf(r)}>
                        <Download className="h-3.5 w-3.5 mr-1" /> PDF
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost" aria-label="Abrir transporte">
                      <Link to="/transports/$id" params={{ id: r.transport_id }}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    {can("transports.delete") && (
                      <Button size="sm" variant="ghost" onClick={() => remove(r)} aria-label="Excluir vistoria">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {viewing?.transports && (
        <VistoriaViewDialog
          kind={viewing.kind}
          status={viewing.status}
          data={viewing.data}
          transport={viewing.transports}
          onClose={() => setViewing(null)}
        />
      )}
    </AppLayout>
  );
}
