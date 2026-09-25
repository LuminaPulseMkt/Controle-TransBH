import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "./format";

export type TemplateKey =
  | "wa_budget_created"
  | "wa_budget_accepted"
  | "wa_charge_reminder"
  | "wa_status_aguardando_coleta"
  | "wa_status_coletado_aguardando_embarque"
  | "wa_status_veiculo_patio_aguardando_retirada"
  | "wa_status_finalizado"
  | "email_budget_created"
  | "email_budget_accepted"
  | "email_charge_reminder";

export interface TemplateVars {
  client_name?: string | null;
  title?: string | null;
  amount?: number | string | null;
  due_date?: string | Date | null;
  link?: string | null;
  company_name?: string | null;
  transport_code?: string | null;
  days_overdue?: number | string | null;
  vehicle_plate?: string | null;
  review_link?: string | null;
}

export function renderTemplate(body: string, vars: TemplateVars): string {
  const map: Record<string, string> = {
    client_name: String(vars.client_name ?? ""),
    title: String(vars.title ?? ""),
    amount: typeof vars.amount === "number" ? brl(vars.amount) : String(vars.amount ?? ""),
    due_date: vars.due_date ? dateBR(vars.due_date as any) : "",
    link: String(vars.link ?? ""),
    company_name: String(vars.company_name ?? "TransBH"),
    transport_code: String(vars.transport_code ?? ""),
    days_overdue: String(vars.days_overdue ?? ""),
    vehicle_plate: String(vars.vehicle_plate ?? ""),
    review_link: String(vars.review_link ?? ""),
  };
  return body.replace(/\{(\w+)\}/g, (_, k: string) =>
    Object.prototype.hasOwnProperty.call(map, k) ? map[k] : `{${k}}`,
  );
}

/** Splits an email-style template body into subject and body. Format: "subject\n---\nbody" */
export function splitEmailBody(raw: string): { subject: string; body: string } {
  const idx = raw.indexOf("\n---\n");
  if (idx === -1) return { subject: "", body: raw };
  return { subject: raw.slice(0, idx).trim(), body: raw.slice(idx + 5) };
}

export function joinEmailBody(subject: string, body: string): string {
  return `${subject.trim()}\n---\n${body}`;
}

/** Loads a template body from the DB. Returns null on miss. Client-side use. */
export async function loadTemplate(key: TemplateKey): Promise<string | null> {
  const { data } = await supabase
    .from("message_templates")
    .select("body")
    .eq("key", key)
    .maybeSingle();
  return data?.body ?? null;
}

/** Convenience: load + render with fallback. */
export async function renderFromDb(
  key: TemplateKey,
  vars: TemplateVars,
  fallback: string,
): Promise<string> {
  const body = (await loadTemplate(key)) ?? fallback;
  return renderTemplate(body, vars);
}
