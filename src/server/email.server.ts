/**
 * Resend helper — server-only.
 * Sends a transactional email via the Resend API.
 */

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error("[email] missing env: RESEND_API_KEY/RESEND_FROM_EMAIL");
    return { ok: false, error: "E-mail não configurado no servidor." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] send failed", res.status, body.slice(0, 500));
      return { ok: false, error: `Falha ao enviar e-mail (HTTP ${res.status}).` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] network error", err);
    return { ok: false, error: "Falha de rede ao enviar e-mail." };
  }
}
