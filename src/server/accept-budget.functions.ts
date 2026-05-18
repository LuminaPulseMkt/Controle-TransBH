import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWhatsAppText } from "./whatsapp.server";

const InputSchema = z.object({
  token: z.string().min(10).max(64),
  estimated_delivery: z.string().optional(),
  accepted: z.literal(true),
});

function parseLocation(raw: string | undefined | null): { city: string; state: string } {
  const s = (raw ?? "").trim();
  if (!s) return { city: "A definir", state: "--" };
  const m = s.match(/^(.+?)\s*[\/\-,]\s*([A-Za-z]{2})\s*$/);
  if (m) return { city: m[1].trim(), state: m[2].toUpperCase() };
  return { city: s, state: "--" };
}

function errMsg(e: unknown): string {
  if (!e) return "erro desconhecido";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export const acceptBudget = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    let stage = "init";
    try {
      // Verifica env vars antes de tocar no proxy
      const hasUrl = process.env.PROJECT_URL || process.env.SUPABASE_URL;
      const hasKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!hasUrl || !hasKey) {
        const missing = [!hasUrl && "PROJECT_URL", !hasKey && "SERVICE_ROLE_KEY"]
          .filter(Boolean)
          .join(", ");
        console.error("[acceptBudget] missing env:", missing);
        return {
          ok: false as const,
          error: `Configuração do servidor incompleta (${missing}). Contate o suporte.`,
        };
      }

      const ip =
        getRequestHeader("cf-connecting-ip") ||
        getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
        getRequestIP({ xForwardedFor: true }) ||
        null;

      stage = "fetch_budget";
      const { data: budget, error: fetchErr } = await supabaseAdmin
        .from("documents")
        .select("*")
        .eq("public_token", data.token)
        .maybeSingle();

      if (fetchErr) {
        console.error("[acceptBudget]", stage, fetchErr);
        return { ok: false as const, error: "Não foi possível processar a solicitação. Tente novamente." };
      }
      if (!budget) {
        return { ok: false as const, error: "Documento não encontrado." };
      }
      if (budget.doc_type !== "budget") {
        return { ok: false as const, error: "Apenas orçamentos podem ser aceitos." };
      }

      // Idempotência
      if (budget.accepted_at && budget.accepted_contract_id) {
        const { data: existingContract } = await supabaseAdmin
          .from("documents")
          .select("public_token")
          .eq("id", budget.accepted_contract_id)
          .maybeSingle();

        let prevReceivable: { amount: number; due_date: string } | null = null;
        let prevVehicle: { plate: string; brand: string | null; model: string | null } | null = null;
        if (budget.accepted_receivable_id) {
          const { data: r } = await supabaseAdmin
            .from("receivables")
            .select("amount, due_date")
            .eq("id", budget.accepted_receivable_id)
            .maybeSingle();
          if (r) prevReceivable = { amount: Number(r.amount), due_date: r.due_date };
        }
        if (budget.accepted_transport_id) {
          const { data: tr } = await supabaseAdmin
            .from("transports")
            .select("vehicle_plate, vehicle_brand, vehicle_model")
            .eq("id", budget.accepted_transport_id)
            .maybeSingle();
          if (tr) prevVehicle = { plate: tr.vehicle_plate, brand: tr.vehicle_brand, model: tr.vehicle_model };
        }

        return {
          ok: true as const,
          already: true,
          contract_token: existingContract?.public_token ?? null,
          accepted_at: budget.accepted_at,
          receivable: prevReceivable,
          vehicle: prevVehicle,
          client_name: budget.client_name,
        };
      }

      const body = (budget.body as any) ?? {};
      const totalAmount = Number(budget.total_amount ?? 0);
      if (!Number.isFinite(totalAmount)) {
        return { ok: false as const, error: "Valor total do orçamento inválido." };
      }

      stage = "create_contract";
      // Busca cláusulas padrão de contrato (editáveis em Configurações)
      const { data: clausesTpl } = await supabaseAdmin
        .from("message_templates")
        .select("body")
        .eq("key", "contract_clauses_default")
        .maybeSingle();
      const { data: companyForContract } = await supabaseAdmin
        .from("company_settings")
        .select("name")
        .maybeSingle();

      const contractDue = new Date();
      contractDue.setDate(contractDue.getDate() + 7);
      const contractDueStr = contractDue.toISOString().slice(0, 10);

      const valorBrl = Number(totalAmount).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      const venc = new Date(contractDueStr + "T00:00:00").toLocaleDateString("pt-BR");
      const clauseVars: Record<string, string> = {
        client_name: budget.client_name ?? "",
        title: budget.title ?? "",
        amount: valorBrl,
        due_date: venc,
        company_name: companyForContract?.name ?? "TransBH",
      };
      const renderedClauses = clausesTpl?.body
        ? clausesTpl.body.replace(/\{(\w+)\}/g, (_: string, k: string) =>
            Object.prototype.hasOwnProperty.call(clauseVars, k) ? clauseVars[k] : `{${k}}`,
          )
        : ((budget.body as any)?.notes ?? "");

      const contractBody = { ...((budget.body as any) ?? {}), notes: renderedClauses };

      const { data: contract, error: contractErr } = await supabaseAdmin
        .from("documents")
        .insert({
          doc_type: "contract",
          template: budget.template ?? "standard",
          title: `Contrato — ${budget.title}`,
          client_name: budget.client_name,
          client_document: budget.client_document,
          client_phone: budget.client_phone,
          client_email: budget.client_email,
          body: contractBody,
          total_amount: budget.total_amount,
          created_by: budget.created_by,
        })
        .select("id, public_token")
        .single();

      if (contractErr || !contract) {
        console.error("[acceptBudget]", stage, contractErr);
        return {
          ok: false as const,
          error: "Não foi possível processar a solicitação. Tente novamente.",
        };
      }

      stage = "create_transport";
      const origin = parseLocation(body.origin);
      const destination = parseLocation(body.destination);

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

      const vehicles: VehicleItem[] = Array.isArray(body.vehicles) && body.vehicles.length > 0
        ? (body.vehicles as VehicleItem[])
        : [{
            description: body.vehicle ?? undefined,
            plate: (() => {
              const m = (body.vehicle ?? "").match(/[A-Z]{3}[-\s]?\d[A-Z\d]\d{2}/i);
              return m ? m[0].toUpperCase().replace(/\s/g, "") : (body.vehicle_plate ?? undefined);
            })(),
            color: body.vehicle_color ?? undefined,
            type: "sedan",
            value: Number(body.service_value ?? totalAmount),
          }];

      const transportIds: string[] = [];
      for (const v of vehicles) {
        const plate = (v.plate || "A DEFINIR").toUpperCase().replace(/\s/g, "");
        const { data: tr, error: trErr } = await supabaseAdmin
          .from("transports")
          .insert({
            client_name: budget.client_name,
            client_document: budget.client_document,
            client_phone: budget.client_phone,
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
            created_by: budget.created_by,
          })
          .select("id")
          .single();

        if (trErr || !tr) {
          console.error("[acceptBudget]", stage, trErr);
          return {
            ok: false as const,
            error: "Não foi possível processar a solicitação. Tente novamente.",
          };
        }
        transportIds.push(tr.id);
      }
      const firstTransportId = transportIds[0]!;
      const firstVehicle = vehicles[0] ?? {};
      const plate = (firstVehicle.plate || "A DEFINIR").toUpperCase().replace(/\s/g, "");

      stage = "create_receivable";
      const due = new Date();
      due.setDate(due.getDate() + 7);
      const dueStr = due.toISOString().slice(0, 10);

      const { data: receivable, error: recvErr } = await supabaseAdmin
        .from("receivables")
        .insert({
          client_name: budget.client_name,
          client_phone: budget.client_phone,
          client_email: budget.client_email,
          amount: totalAmount,
          due_date: dueStr,
          status: "pending",
          description: `Aceite do orçamento "${budget.title}"`,
          transport_id: firstTransportId,
        })
        .select("id, amount, due_date")
        .single();

      if (recvErr || !receivable) {
        console.error("[acceptBudget]", stage, recvErr);
        return {
          ok: false as const,
          error: "Não foi possível processar a solicitação. Tente novamente.",
        };
      }

      stage = "update_budget";
      const { error: updErr } = await supabaseAdmin
        .from("documents")
        .update({
          accepted_at: new Date().toISOString(),
          accepted_ip: ip,
          accepted_contract_id: contract.id,
          accepted_transport_id: firstTransportId,
          accepted_receivable_id: receivable.id,
        })
        .eq("id", budget.id);

      // Marca o contrato gerado também (idempotência futura)
      await supabaseAdmin
        .from("documents")
        .update({
          generated_at: new Date().toISOString(),
          generated_receivable_id: receivable.id,
          generated_transport_ids: transportIds,
        })
        .eq("id", contract.id);

      if (updErr) {
        console.error("[acceptBudget]", stage, updErr);
        return {
          ok: false as const,
          error: "Não foi possível processar a solicitação. Tente novamente.",
        };
      }

      // Notify client via WhatsApp (best-effort, never blocks)
      if (budget.client_phone && contract.public_token) {
        const link = `https://transbh-fleetflow.lovable.app/d/${contract.public_token}`;
        const valor = totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const venc = new Date(receivable.due_date + "T00:00:00").toLocaleDateString("pt-BR");
        const fallback =
          `Olá {client_name}! Recebemos seu aceite do orçamento "{title}".\n` +
          `Contrato: {link}\nValor: {amount} — vencimento {due_date}.\nObrigado por confiar na {company_name}!`;
        const { data: tpl } = await supabaseAdmin
          .from("message_templates")
          .select("body")
          .eq("key", "wa_budget_accepted")
          .maybeSingle();
        const { data: comp } = await supabaseAdmin
          .from("company_settings")
          .select("name")
          .maybeSingle();
        const body = tpl?.body ?? fallback;
        const map: Record<string, string> = {
          client_name: budget.client_name ?? "",
          title: budget.title ?? "",
          link,
          amount: valor,
          due_date: venc,
          company_name: comp?.name ?? "TransBH",
        };
        const text = body.replace(/\{(\w+)\}/g, (_: string, k: string) =>
          Object.prototype.hasOwnProperty.call(map, k) ? map[k] : `{${k}}`,
        );
        sendWhatsAppText({ phone: budget.client_phone, text }).catch((e) =>
          console.error("[acceptBudget] whatsapp send failed", e),
        );
      }

      return {
        ok: true as const,
        already: false,
        contract_token: contract.public_token,
        accepted_at: new Date().toISOString(),
        receivable: { amount: Number(receivable.amount), due_date: receivable.due_date },
        vehicle: { plate: plate, brand: null as string | null, model: body.vehicle ?? null },
        client_name: budget.client_name,
      };
    } catch (err) {
      console.error("[acceptBudget] unhandled at stage:", stage, err);
      return {
        ok: false as const,
        error: "Não foi possível processar a solicitação. Tente novamente.",
      };
    }
  });
