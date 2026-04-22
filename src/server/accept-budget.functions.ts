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
  // Tenta "Cidade/UF" ou "Cidade - UF" ou "Cidade, UF"
  const m = s.match(/^(.+?)\s*[\/\-,]\s*([A-Za-z]{2})\s*$/);
  if (m) return { city: m[1].trim(), state: m[2].toUpperCase() };
  return { city: s, state: "--" };
}

export const acceptBudget = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestIP({ xForwardedFor: true }) ||
      null;

    // 1. Buscar orçamento por token
    const { data: budget, error: fetchErr } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("public_token", data.token)
      .maybeSingle();

    if (fetchErr) {
      return { ok: false as const, error: "Erro ao buscar documento." };
    }
    if (!budget) {
      return { ok: false as const, error: "Documento não encontrado." };
    }
    if (budget.doc_type !== "budget") {
      return { ok: false as const, error: "Apenas orçamentos podem ser aceitos." };
    }

    // 2. Idempotência: já aceito
    if (budget.accepted_at && budget.accepted_contract_id) {
      const { data: existingContract } = await supabaseAdmin
        .from("documents")
        .select("public_token")
        .eq("id", budget.accepted_contract_id)
        .maybeSingle();
      return {
        ok: true as const,
        already: true,
        contract_token: existingContract?.public_token ?? null,
        accepted_at: budget.accepted_at,
      };
    }

    const body = (budget.body as any) ?? {};

    // 3. Inserir contrato
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
      return { ok: false as const, error: "Falha ao criar contrato." };
    }

    // 4. Inserir transporte
    const origin = parseLocation(body.origin);
    const destination = parseLocation(body.destination);
    const vehiclePlateMatch = (body.vehicle ?? "").match(/[A-Z]{3}[-\s]?\d[A-Z\d]\d{2}/i);
    const plate = vehiclePlateMatch ? vehiclePlateMatch[0].toUpperCase().replace(/\s/g, "") : "A DEFINIR";

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
      return { ok: false as const, error: "Falha ao criar transporte." };
    }

    // 5. Inserir cobrança (vencimento +7 dias)
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const dueStr = due.toISOString().slice(0, 10);

    const { data: receivable, error: recvErr } = await supabaseAdmin
      .from("receivables")
      .insert({
        client_name: budget.client_name,
        client_phone: budget.client_phone,
        client_email: budget.client_email,
        amount: Number(budget.total_amount ?? 0),
        due_date: dueStr,
        status: "pending",
        description: `Aceite do orçamento "${budget.title}"`,
        transport_id: transport.id,
      })
      .select("id")
      .single();

    if (recvErr || !receivable) {
      return { ok: false as const, error: "Falha ao criar cobrança." };
    }

    // 6. Marca orçamento como aceito
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
      return { ok: false as const, error: "Falha ao registrar aceite." };
    }

    return {
      ok: true as const,
      already: false,
      contract_token: contract.public_token,
      accepted_at: new Date().toISOString(),
    };
  });
