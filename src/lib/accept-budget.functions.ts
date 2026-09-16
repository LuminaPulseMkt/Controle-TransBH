import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const InputSchema = z.object({
  token: z.string().min(10).max(64),
  estimated_delivery: z.string().optional(),
  client_signature_url: z.string().url().optional(),
  accepted: z.literal(true),
});

export const acceptBudget = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: result, error } = await (supabase as any).rpc("accept_budget_by_token", {
      _token: data.token,
      _estimated_delivery: data.estimated_delivery || null,
    });

    if (error) {
      console.error("[acceptBudget] rpc error", error);
      return { ok: false as const, error: "Não foi possível processar a solicitação. Tente novamente." };
    }

    return result ?? { ok: false as const, error: "Não foi possível processar a solicitação. Tente novamente." };
  });
