import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/server/email.server";

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  carro: "Carro",
  moto: "Moto",
  utilitario: "Utilitário",
  frota: "Frota",
};

const Schema = z.object({
  name: z.string().min(1).max(200),
  whatsapp: z.string().min(1).max(30),
  email: z.string().email().optional().or(z.literal("")),
  origin: z.string().min(1).max(200),
  destination: z.string().min(1).max(200),
  vehicle_type: z.string().min(1).max(50),
  vehicle_quantity: z.number().int().min(1).max(999),
  message: z.string().max(2000).optional().or(z.literal("")),
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

export const notifyNewLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data }) => {
    const { data: company } = await supabaseAdmin
      .from("company_settings")
      .select("email, name")
      .maybeSingle();

    const to = company?.email;
    if (!to) {
      console.error("[notifyNewLead] no company email configured");
      return { ok: false as const, error: "E-mail da empresa não configurado." };
    }

    const rows = [
      ["Nome", data.name],
      ["WhatsApp", data.whatsapp],
      ["E-mail", data.email || "—"],
      ["Origem", data.origin],
      ["Destino", data.destination],
      ["Tipo de veículo", VEHICLE_TYPE_LABELS[data.vehicle_type] ?? data.vehicle_type],
      ["Quantidade", String(data.vehicle_quantity)],
      ["Mensagem", data.message || "—"],
    ];

    const html = `
      <h2>Nova solicitação de cotação pelo site</h2>
      <table cellpadding="6" style="border-collapse: collapse;">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="font-weight:bold; vertical-align:top;">${escapeHtml(label)}:</td><td>${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`,
          )
          .join("")}
      </table>
    `;

    return sendEmail({
      to,
      subject: `Nova cotação: ${data.name} (${data.origin} → ${data.destination})`,
      html,
      replyTo: data.email || undefined,
    });
  });
