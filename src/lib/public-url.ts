// Domínio público oficial do site. Usado para links compartilhados com
// clientes (WhatsApp, copiar link, etc.) e para os links dos e-mails de
// autenticação (redefinir senha, confirmar cadastro), evitando que o
// `window.location.origin` de localhost/preview/sandbox vaze para fora.
export const PUBLIC_SITE_URL = "https://transbhtransportes.com.br";

export function publicDocUrl(token: string): string {
  return `${PUBLIC_SITE_URL}/d/${token}`;
}
