import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWhatsAppText } from "./whatsapp.server";

const InputSchema = z.object({
  contract_id: z.string().uuid(),
  estimated_delivery: z.string().optional(),
});

type VehicleType = "motorcycle" | "sedan" | "hatch" | "caminhonete" | "suv";

interface VehicleItem {
  description?: string;
  plate?: string;
  color?: string;
  type?: VehicleType;
  brand?: string;
  model?: string;
  year?: number;
  value?: number;
}

function parseLocation(raw: string | undefined | null): { city: string; state: string } {
  const s = (raw ?? "").trim();
  if (!s) return { city: "A definir", state: "--" };
  const m = s.match(/^(.+?)\s*[\/\-,]\s*([A-Za-z]{2})\s*$/);
  if (m) return { city: m[1].trim(), state: m[2].toUpperCase() };
  return { city: s, state: "--" };
}

function normalizeVehicles(body: any): VehicleItem[] {
  if (Array.isArray(body?.vehicles) && body.vehicles.length > 0) {
    return body.vehicles as VehicleItem[];
  }
  // legacy single vehicle
  if (body?.vehicle || body?.vehicle_plate) {
    return [{
      description: body.vehicle ?? undefined,
      plate: body.vehicle_plate ?? undefined,
      color: body.vehicle_color ?? undefined,
      type: "sedan",
      value: Number(body.service_value ?? 0),
    }];
  }
  return [{ type: "sedan" }];
}

export const generateContractAssets = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const { data: contract, error: fetchErr } = await supabaseAdmin
        .from("documents")
        .select("*")
        .eq("id", data.contract_id)
        .maybeSingle();

      if (fetchErr || !contract) {
        return { ok: false as const, error: "Contrato não encontrado." };
      }
      if (contract.doc_type !== "contract") {
        return { ok: false as const, error: "Apenas contratos podem gerar transporte e cobrança." };
      }

      // Idempotência
      if (contract.generated_at) {
        return {
          ok: true as const,
          already: true,
          transport_ids: contract.generated_transport_ids ?? [],
          receivable_id: contract.generated_receivable_id ?? null,
        };
      }

      const body = (contract.body as any) ?? {};
      const vehicles = normalizeVehicles(body);
      const origin = parseLocation(body.origin);
      const destination = parseLocation(body.destination);

      const totalAmount = Number(contract.total_amount ?? 0);

      const transportIds: string[] = [];
      for (const v of vehicles) {
        const plate = (v.plate || "A DEFINIR").toUpperCase().replace(/\s/g, "");
        const { data: t, error: tErr } = await supabaseAdmin
          .from("transports")
          .insert({
            client_name: contract.client_name,
            client_document: contract.client_document,
            client_phone: contract.client_phone,
            origin_city: origin.city,
            origin_state: origin.state,
            destination_city: destination.city,
            destination_state: destination.state,
            vehicle_plate: plate,
            vehicle_type: (v.type ?? "sedan") as VehicleType,
            vehicle_brand: v.brand ?? null,
            vehicle_model: v.model ?? v.description ?? null,
            vehicle_year: v.year ?? null,
            vehicle_color: v.color ?? null,
            notes: v.description ? `Veículo: ${v.description}` : null,
            estimated_delivery: data.estimated_delivery || null,
            status: "pending",
            created_by: contract.created_by,
          })
          .select("id")
          .single();

        if (tErr || !t) {
          console.error("[generateContractAssets] transport error", tErr);
          return { ok: false as const, error: "Falha ao criar transporte." };
        }
        transportIds.push(t.id);
      }

      // Cobrança única
      const due = new Date();
      due.setDate(due.getDate() + 7);
      const dueStr = due.toISOString().slice(0, 10);

      const { data: receivable, error: rErr } = await supabaseAdmin
        .from("receivables")
        .insert({
          client_name: contract.client_name,
          client_phone: contract.client_phone,
          client_email: contract.client_email,
          amount: totalAmount,
          due_date: dueStr,
          status: "pending",
          description: `Contrato "${contract.title}"`,
          transport_id: transportIds[0] ?? null,
        })
        .select("id, amount, due_date")
        .single();

      if (rErr || !receivable) {
        console.error("[generateContractAssets] receivable error", rErr);
        return { ok: false as const, error: "Falha ao criar cobrança." };
      }

      const { error: updErr } = await supabaseAdmin
        .from("documents")
        .update({
          generated_at: new Date().toISOString(),
          generated_receivable_id: receivable.id,
          generated_transport_ids: transportIds,
        })
        .eq("id", contract.id);

      if (updErr) {
        console.error("[generateContractAssets] update error", updErr);
      }

      // WhatsApp best-effort
      if (contract.client_phone && contract.public_token) {
        const { publicDocUrl } = await import("@/lib/public-url");
        const link = publicDocUrl(contract.public_token);
        const valor = totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const venc = new Date(dueStr + "T00:00:00").toLocaleDateString("pt-BR");
        const fallback =
          `Olá {client_name}! Seu contrato "{title}" foi registrado.\n` +
          `Acesse: {link}\nValor: {amount} — vencimento {due_date}.`;
        const { data: tpl } = await supabaseAdmin
          .from("message_templates")
          .select("body")
          .eq("key", "wa_budget_accepted")
          .maybeSingle();
        const { data: comp } = await supabaseAdmin
          .from("company_settings")
          .select("name")
          .maybeSingle();
        const map: Record<string, string> = {
          client_name: contract.client_name ?? "",
          title: contract.title ?? "",
          link,
          amount: valor,
          due_date: venc,
          company_name: comp?.name ?? "TransBH",
        };
        const text = (tpl?.body ?? fallback).replace(/\{(\w+)\}/g, (_: string, k: string) =>
          Object.prototype.hasOwnProperty.call(map, k) ? map[k] : `{${k}}`,
        );
        sendWhatsAppText({ phone: contract.client_phone, text }).catch((e) =>
          console.error("[generateContractAssets] whatsapp send failed", e),
        );
      }

      return {
        ok: true as const,
        already: false,
        transport_ids: transportIds,
        receivable_id: receivable.id,
      };
    } catch (err) {
      console.error("[generateContractAssets] unhandled", err);
      return { ok: false as const, error: "Falha ao processar. Tente novamente." };
    }
  });
