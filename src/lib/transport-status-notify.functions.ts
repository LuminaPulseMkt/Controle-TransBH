import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendWhatsAppText } from "@/server/whatsapp.server";
import { renderTemplate, type TemplateKey } from "@/lib/message-templates";

const NOTIFIABLE_STATUSES = [
  "aguardando_coleta",
  "coletado_aguardando_embarque",
  "em_transito",
  "veiculo_patio_aguardando_retirada",
  "finalizado",
] as const;

type NotifiableStatus = (typeof NOTIFIABLE_STATUSES)[number];

const STATUS_TEMPLATE_KEY: Record<NotifiableStatus, TemplateKey> = {
  aguardando_coleta: "wa_status_aguardando_coleta",
  coletado_aguardando_embarque: "wa_status_coletado_aguardando_embarque",
  em_transito: "wa_status_em_transito",
  veiculo_patio_aguardando_retirada: "wa_status_veiculo_patio_aguardando_retirada",
  finalizado: "wa_status_finalizado",
};

// Used only if the admin hasn't configured a template for this status yet.
const FALLBACK_BODY: Record<NotifiableStatus, string> = {
  aguardando_coleta:
    "Olá {client_name}! Seu veículo {vehicle_plate} (transporte {transport_code}) foi cadastrado na {company_name} e está aguardando programação de coleta.",
  coletado_aguardando_embarque:
    "Olá {client_name}! Seu veículo {vehicle_plate} (transporte {transport_code}) já foi coletado e está aguardando embarque para o destino.",
  em_transito:
    "Olá {client_name}! Seu veículo {vehicle_plate} (transporte {transport_code}) está em trânsito para o destino.",
  veiculo_patio_aguardando_retirada:
    "Olá {client_name}! Seu veículo {vehicle_plate} (transporte {transport_code}) chegou e está no pátio aguardando retirada.",
  finalizado:
    "Olá {client_name}! Seu transporte {transport_code} foi finalizado. Agradecemos a confiança na {company_name}! Se puder, deixe sua avaliação: {review_link}",
};

const Schema = z.object({
  transport_id: z.string().uuid(),
  status: z.enum(NOTIFIABLE_STATUSES),
});

export const notifyTransportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: transport, error } = await sb
      .from("transports")
      .select("code, client_name, client_phone, vehicle_plate")
      .eq("id", data.transport_id)
      .maybeSingle();

    if (error || !transport) {
      return { ok: false as const, error: "Transporte não encontrado." };
    }
    if (!transport.client_phone) {
      return { ok: false as const, error: "Cliente sem telefone cadastrado." };
    }

    const templateKey = STATUS_TEMPLATE_KEY[data.status];
    // Public client + SECURITY DEFINER RPCs — message_templates/company_settings
    // are RLS-restricted to settings managers, and this app's server functions
    // don't reliably get SUPABASE_SERVICE_ROLE_KEY in this hosting environment.
    const [{ data: tplBody }, { data: companyRows }] = await Promise.all([
      sb.rpc("get_message_template" as never, { _key: templateKey } as never),
      sb.rpc("get_public_company_info" as never),
    ]);
    const company = Array.isArray(companyRows) ? companyRows[0] : companyRows;

    const text = renderTemplate((tplBody as unknown as string) ?? FALLBACK_BODY[data.status], {
      client_name: transport.client_name,
      transport_code: transport.code,
      vehicle_plate: transport.vehicle_plate,
      company_name: (company as any)?.name ?? "TransBH",
      review_link: (company as any)?.google_review_url ?? "",
    });

    const result = await sendWhatsAppText({ phone: transport.client_phone, text });

    await sb.from("transport_events").insert({
      transport_id: data.transport_id,
      event_type: "whatsapp_sent",
      description: result.ok
        ? `Mensagem de WhatsApp enviada (${data.status})`
        : `Falha ao enviar WhatsApp (${data.status}): ${result.error}`,
      created_by: context.userId ?? null,
    });

    return result;
  });
