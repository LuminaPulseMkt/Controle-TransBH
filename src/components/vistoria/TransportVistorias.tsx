import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCompanyInfo } from "@/lib/use-company-info";
import { waLink } from "@/lib/format";
import { exportVistoriaPDF } from "@/lib/vistoria-pdf";
import { VistoriaViewDialog } from "@/components/vistoria/VistoriaViewDialog";
import {
  VISTORIA_KIND_LABEL, VISTORIA_STATUS_LABEL, normalizeVistoriaData, vistoriaLink, vistoriaMessage,
  type VistoriaKind, type VistoriaStatus, type VistoriaTransportInfo,
} from "@/lib/vistoria-types";
import { ClipboardList, Copy, Download, Eye, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
}

interface Props {
  transport: {
    id: string;
    code: string;
    client_name: string;
    client_phone: string | null;
    client_email: string | null;
    client_document: string | null;
    vehicle_plate: string;
    vehicle_brand: string | null;
    vehicle_model: string | null;
    vehicle_color: string | null;
    vehicle_year: number | null;
    vehicle_chassis: string | null;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
  };
}

export function TransportVistorias({ transport }: Props) {
  const { can, user } = useAuth();
  const company = useCompanyInfo();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<VistoriaKind | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);

  const info: VistoriaTransportInfo = transport;

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("vistorias")
      .select("id, token, access_code, kind, status, data, expires_at, finished_at, created_at")
      .eq("transport_id", transport.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar vistorias: " + error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [transport.id]);

  useEffect(() => { void load(); }, [load]);

  const isOpen = (r: Row) => r.status !== "finalizada" && new Date(r.expires_at) > new Date();

  const create = async (kind: VistoriaKind) => {
    setCreating(kind);
    const { data, error } = await supabase
      .from("vistorias")
      .insert({ transport_id: transport.id, kind, created_by: user?.id ?? null })
      .select("id")
      .maybeSingle();
    setCreating(null);
    if (error || !data) return toast.error("Não foi possível gerar o link: " + (error?.message ?? "sem permissão"));
    toast.success(`Link de vistoria de ${VISTORIA_KIND_LABEL[kind].toLowerCase()} gerado.`);
    void load();
  };

  const copy = async (r: Row) => {
    try {
      await navigator.clipboard.writeText(vistoriaLink(r.token));
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Link: " + vistoriaLink(r.token));
    }
  };

  const whatsapp = (r: Row) => {
    const text = vistoriaMessage({
      clientName: transport.client_name,
      kind: r.kind,
      plate: transport.vehicle_plate,
      token: r.token,
      accessCode: r.access_code,
    });
    const url = waLink(transport.client_phone, text) ?? `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener");
  };

  const remove = async (r: Row) => {
    if (!window.confirm("Excluir esta vistoria? O link deixará de funcionar.")) return;
    const { data, error } = await supabase.from("vistorias").delete().eq("id", r.id).select("id");
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) return toast.error("Sem permissão para excluir esta vistoria.");
    toast.success("Vistoria excluída.");
    void load();
  };

  const pdf = (r: Row) =>
    exportVistoriaPDF({
      kind: r.kind,
      data: normalizeVistoriaData(r.data),
      transport: info,
      finishedAt: r.finished_at,
      company: company ? { name: company.name, logo_url: company.logo_url } : null,
    });

  const canEdit = can("transports.edit");

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="text-display text-xl">Vistorias</h3>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {(["coleta", "entrega"] as VistoriaKind[]).map((k) => (
              <Button key={k} size="sm" variant="outline" disabled={creating !== null} onClick={() => create(k)}>
                {creating === k ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                {VISTORIA_KIND_LABEL[k]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma vistoria. Gere um link de coleta ou entrega e envie ao motorista/cliente.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const expired = r.status !== "finalizada" && new Date(r.expires_at) <= new Date();
            return (
              <li key={r.id} className="rounded-lg border border-border p-3 flex flex-wrap items-center gap-2 justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Vistoria de {VISTORIA_KIND_LABEL[r.kind].toLowerCase()}</span>
                    <Badge variant={r.status === "finalizada" ? "default" : "secondary"}>
                      {expired ? "Link expirado" : VISTORIA_STATUS_LABEL[r.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Código: <span className="font-mono font-semibold text-foreground">{r.access_code}</span> ·{" "}
                    {r.status === "finalizada" && r.finished_at
                      ? `Finalizada em ${new Date(r.finished_at).toLocaleString("pt-BR")}`
                      : `Válido até ${new Date(r.expires_at).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {isOpen(r) && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => copy(r)}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copiar link
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
                  {can("transports.delete") && (
                    <Button size="sm" variant="ghost" onClick={() => remove(r)} aria-label="Excluir vistoria">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <VistoriaViewDialog
        kind={viewing?.kind ?? null}
        status={viewing?.status ?? null}
        data={viewing?.data}
        transport={info}
        onClose={() => setViewing(null)}
      />
    </Card>
  );
}
