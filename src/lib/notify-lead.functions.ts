import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
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
    // Public client + SECURITY DEFINER RPC that exposes only the company email
    // (no service role key needed).
    const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
    const key =
      process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) {
      console.error("[notifyNewLead] missing SUPABASE_URL/PUBLISHABLE_KEY");
      return { ok: false as const, error: "Servidor sem configuração do banco." };
    }
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: companyEmail, error: rpcError } = await sb.rpc(
      "get_lead_notify_email" as never,
    );
    if (rpcError) console.error("[notifyNewLead] rpc error", rpcError);

    const to = (companyEmail as unknown as string | null) ?? undefined;
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
