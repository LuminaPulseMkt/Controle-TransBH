/** Minúsculas e sem acentos, para a busca não diferenciar "João" de "joao". */
export const normalizeText = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const alnum = (s: string) => s.replace(/[^a-z0-9]/g, "");

/**
 * Todos os termos digitados precisam aparecer em algum dos campos.
 * Ignora acentos, maiúsculas e pontuação (placa "ABC-1234", CPF/telefone com máscara).
 */
export function matchesQuery(query: string, fields: (string | number | null | undefined)[]): boolean {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = normalizeText(fields.filter((f) => f !== null && f !== undefined && f !== "").join(" "));
  const hayAlnum = alnum(hay);
  return tokens.every((t) => {
    if (hay.includes(t)) return true;
    const a = alnum(t);
    return a.length >= 3 && hayAlnum.includes(a);
  });
}
