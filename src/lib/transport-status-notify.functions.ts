import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWhatsAppText } from "@/server/whatsapp.server";
import { renderTemplate, type TemplateKey } from "@/lib/message-templates";

const NOTIFIABLE_STATUSES = [
  "aguardando_coleta",
  "coletado_aguardando_embarque",
  "veiculo_patio_aguardando_retirada",
  "finalizado",
] as const;

type NotifiableStatus = (typeof NOTIFIABLE_STATUSES)[number];

const STATUS_TEMPLATE_KEY: Record<NotifiableStatus, TemplateKey> = {
  aguardando_coleta: "wa_status_aguardando_coleta",
  coletado_aguardando_embarque: "wa_status_coletado_aguardando_embarque",
  veiculo_patio_aguardando_retirada: "wa_status_veiculo_patio_aguardando_retirada",
  finalizado: "wa_status_finalizado",
};

// Used only if the admin hasn't configured a template for this status yet.
const FALLBACK_BODY: Record<NotifiableStatus, string> = {
  aguardando_coleta:
    "Olá {client_name}! Seu veículo {vehicle_plate} (transporte {transport_code}) foi cadastrado na {company_name} e está aguardando programação de coleta.",
  coletado_aguardando_embarque:
    "Olá {client_name}! Seu veículo {vehicle_plate} (transporte {transport_code}) já foi coletado e está aguardando embarque para o destino.",
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
  .handler(async ({ data }) => {
    const { data: transport, error } = await supabaseAdmin
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
    const [{ data: tpl }, { data: company }] = await Promise.all([
      supabaseAdmin.from("message_templates").select("body").eq("key", templateKey).maybeSingle(),
      supabaseAdmin.from("company_settings").select("name, google_review_url").maybeSingle(),
    ]);

    const text = renderTemplate(tpl?.body ?? FALLBACK_BODY[data.status], {
      client_name: transport.client_name,
      transport_code: transport.code,
      vehicle_plate: transport.vehicle_plate,
      company_name: company?.name ?? "TransBH",
      review_link: company?.google_review_url ?? "",
    });

    return sendWhatsAppText({ phone: transport.client_phone, text });
  });
