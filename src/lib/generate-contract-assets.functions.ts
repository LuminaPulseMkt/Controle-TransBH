import { createServerFn } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface InputData {
  contract_id?: unknown;
  estimated_delivery?: unknown;
}

export const generateContractAssets = createServerFn({ method: "POST" })
  // Keep the auth attacher local as well as global so this critical action
  // always forwards the current browser session before server authorization.
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown): InputData => (input ?? {}) as InputData)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = context.supabase;
    type VehicleType = "motorcycle" | "sedan" | "hatch" | "caminhonete" | "suv";
    interface VehicleItem {
      description?: string;
      plate?: string;
      chassis?: string;
      color?: string;
      type?: VehicleType;
      brand?: string;
      model?: string;
      year?: number;
      value?: number;
    }

    const parseLocation = (raw: string | undefined | null): { city: string; state: string } => {
      const s = (raw ?? "").trim();
      if (!s) return { city: "A definir", state: "--" };
      const m = s.match(/^(.+?)\s*[\/\-,]\s*([A-Za-z]{2})\s*$/);
      if (m) return { city: m[1].trim(), state: m[2].toUpperCase() };
      return { city: s, state: "--" };
    };

    const VALID_TYPES: VehicleType[] = ["motorcycle", "sedan", "hatch", "caminhonete", "suv"];
    const normType = (t: unknown): VehicleType => {
      const s = String(t ?? "").toLowerCase();
      return (VALID_TYPES as string[]).includes(s) ? (s as VehicleType) : "sedan";
    };

    const normalizeVehicles = (body: any): VehicleItem[] => {
      if (Array.isArray(body?.vehicles) && body.vehicles.length > 0) {
        return body.vehicles as VehicleItem[];
      }
      if (body?.vehicle || body?.vehicle_plate) {
        return [{
          description: body.vehicle ?? undefined,
          plate: body.vehicle_plate ?? undefined,
          chassis: body.vehicle_chassis ?? undefined,
          color: body.vehicle_color ?? undefined,
          type: "sedan",
        }];
      }
      return [{ type: "sedan" }];
    };

    try {
      const contractId = typeof data?.contract_id === "string" ? data.contract_id : "";
      if (!contractId) return { ok: false as const, error: "contract_id ausente." };
      const estimatedDelivery = typeof data?.estimated_delivery === "string" ? data.estimated_delivery : "";

      
      const { data: contract, error: fetchErr } = await supabaseAdmin
        .from("documents")
        .select("*")
        .eq("id", contractId)
        .maybeSingle();

      if (fetchErr) {
        console.error("[generateContractAssets] fetch error", fetchErr);
        return { ok: false as const, error: `Falha ao buscar contrato: ${fetchErr.message}` };
      }
      if (!contract) {
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
      const clientAddress: string | null = body.client_address || null;
      const contractNotes: string | null = body.notes || null;

      const totalAmount = Number(contract.total_amount ?? 0);

      const transportIds: string[] = [];
      for (const v of vehicles) {
        const plateRaw = (v.plate ?? "").toString().trim();
        const plate = (plateRaw || "A DEFINIR").toUpperCase().replace(/\s/g, "");
        const { data: t, error: tErr } = await supabaseAdmin
          .from("transports")
          .insert({
            client_name: contract.client_name,
            client_document: contract.client_document,
            client_phone: contract.client_phone,
            client_email: contract.client_email,
            client_address: clientAddress,
            origin_city: origin.city,
            origin_state: origin.state,
            destination_city: destination.city,
            destination_state: destination.state,
            vehicle_plate: plate,
            vehicle_type: normType(v.type),
            vehicle_brand: v.brand ?? null,
            vehicle_model: v.model ?? v.description ?? null,
            vehicle_year: v.year ?? null,
            vehicle_color: v.color ?? null,
            vehicle_chassis: v.chassis ? v.chassis.toString().toUpperCase() : null,
            notes: [v.description ? `Veículo: ${v.description}` : null, contractNotes].filter(Boolean).join("\n\n") || null,
            estimated_delivery: estimatedDelivery || null,
            status: "aguardando_coleta",
            created_by: contract.created_by,
            closed_by: contract.created_by,
          })
          .select("id")
          .single();

        if (tErr || !t) {
          console.error("[generateContractAssets] transport error", tErr);
          return { ok: false as const, error: `Falha ao criar transporte: ${tErr?.message ?? "desconhecido"}` };
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
        return { ok: false as const, error: `Falha ao criar cobrança: ${rErr?.message ?? "desconhecido"}` };
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
        try {
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
          const { sendWhatsAppText } = await import("@/server/whatsapp.server");
          sendWhatsAppText({ phone: contract.client_phone, text }).catch((e) =>
            console.error("[generateContractAssets] whatsapp send failed", e),
          );
        } catch (waErr) {
          console.error("[generateContractAssets] whatsapp block failed", waErr);
        }
      }

      return {
        ok: true as const,
        already: false,
        transport_ids: transportIds,
        receivable_id: receivable.id,
      };
    } catch (err) {
      console.error("[generateContractAssets] unhandled", err);
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false as const, error: `Falha ao processar: ${msg}` };
    }
  });
