import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendWhatsAppText } from "@/server/whatsapp.server";

const Schema = z.object({
  phone: z.string().min(8).max(20),
  text: z.string().min(1).max(4096),
});

export const sendWhatsAppManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data }) => {
    const result = await sendWhatsAppText({ phone: data.phone, text: data.text });
    return result;
  });
