import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
        return { ok: false as const, error: `Erro ao buscar documento: ${fetchErr.message}` };
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
          body: budget.body,
          total_amount: budget.total_amount,
          created_by: budget.created_by,
        })
        .select("id, public_token")
        .single();

      if (contractErr || !contract) {
        console.error("[acceptBudget]", stage, contractErr);
        return {
          ok: false as const,
          error: `Falha ao criar contrato: ${errMsg(contractErr)}`,
        };
      }

      stage = "create_transport";
      const origin = parseLocation(body.origin);
      const destination = parseLocation(body.destination);
      const vehiclePlateMatch = (body.vehicle ?? "").match(/[A-Z]{3}[-\s]?\d[A-Z\d]\d{2}/i);
      const plate = vehiclePlateMatch
        ? vehiclePlateMatch[0].toUpperCase().replace(/\s/g, "")
        : "A DEFINIR";

      const { data: transport, error: transportErr } = await supabaseAdmin
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
          vehicle_type: "car",
          notes: body.vehicle ? `Veículo informado: ${body.vehicle}` : null,
          estimated_delivery: data.estimated_delivery || null,
          status: "pending",
          created_by: budget.created_by,
        })
        .select("id")
        .single();

      if (transportErr || !transport) {
        console.error("[acceptBudget]", stage, transportErr);
        return {
          ok: false as const,
          error: `Falha ao criar transporte: ${errMsg(transportErr)}`,
        };
      }

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
          transport_id: transport.id,
        })
        .select("id")
        .single();

      if (recvErr || !receivable) {
        console.error("[acceptBudget]", stage, recvErr);
        return {
          ok: false as const,
          error: `Falha ao criar cobrança: ${errMsg(recvErr)}`,
        };
      }

      stage = "update_budget";
      const { error: updErr } = await supabaseAdmin
        .from("documents")
        .update({
          accepted_at: new Date().toISOString(),
          accepted_ip: ip,
          accepted_contract_id: contract.id,
          accepted_transport_id: transport.id,
          accepted_receivable_id: receivable.id,
        })
        .eq("id", budget.id);

      if (updErr) {
        console.error("[acceptBudget]", stage, updErr);
        return {
          ok: false as const,
          error: `Falha ao registrar aceite: ${updErr.message}`,
        };
      }

      return {
        ok: true as const,
        already: false,
        contract_token: contract.public_token,
        accepted_at: new Date().toISOString(),
      };
    } catch (err) {
      console.error("[acceptBudget] unhandled at stage:", stage, err);
      return {
        ok: false as const,
        error: `Erro inesperado (${stage}): ${errMsg(err)}`,
      };
    }
  });
