// Domínio público estável do site publicado. Usado para gerar links
// compartilhados com clientes (WhatsApp, copiar link, etc.), evitando
// que o `window.location.origin` do preview/sandbox vaze para fora.
export const PUBLIC_SITE_URL = "https://transbh-fleetflow.lovable.app";

export function publicDocUrl(token: string): string {
  return `${PUBLIC_SITE_URL}/d/${token}`;
}
