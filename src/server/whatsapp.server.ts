/**
 * Evolution API helper — server-only.
 * Sends a WhatsApp text message via a self-hosted Evolution API instance.
 */

function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  // If already starts with country code (55) and is long enough, keep it.
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // Otherwise, prepend Brazil country code.
  return `55${digits}`;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendWhatsAppText(params: { phone: string; text: string }): Promise<SendResult> {
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE_NAME;

  if (!url || !key || !instance) {
    console.error("[whatsapp] missing env: EVOLUTION_API_URL/KEY/INSTANCE_NAME");
    return { ok: false, error: "WhatsApp não configurado no servidor." };
  }

  const phone = normalizePhone(params.phone);
  if (!phone) return { ok: false, error: "Telefone inválido." };

  const text = (params.text || "").slice(0, 4096);
  if (!text.trim()) return { ok: false, error: "Mensagem vazia." };

  const base = url.replace(/\/+$/, "");
  const endpoint = `${base}/message/sendText/${encodeURIComponent(instance)}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
      },
      body: JSON.stringify({
        number: phone,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[whatsapp] send failed", res.status, body.slice(0, 500));
      return { ok: false, error: `Falha ao enviar (HTTP ${res.status}).` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[whatsapp] network error", err);
    return { ok: false, error: "Falha de rede ao enviar WhatsApp." };
  }
}
