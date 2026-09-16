import { brl, dateBR, vehicleTypeLabel } from "@/lib/format";
import fallbackLogo from "@/assets/logo-transbh.png";

export interface DocumentViewData {
  id: string;
  doc_type: "budget" | "contract";
  title: string;
  client_name: string;
  client_document: string | null;
  client_phone: string | null;
  client_email: string | null;
  total_amount: number | null;
  body: any;
  created_at: string;
  client_signature_url?: string | null;
  signed_at?: string | null;
}

interface CompanyInfo {
  name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  cnpj?: string | null;
  logo_url?: string | null;
  website?: string | null;
}

interface Props {
  doc: DocumentViewData;
  company?: CompanyInfo | null;
  showFooter?: boolean;
}

/** Build the list of line items shown in the description/value table. */
function buildLineItems(doc: DocumentViewData): Array<{ label: string; value: number }> {
  const body = doc.body ?? {};
  const items: Array<{ label: string; value: number }> = [];
  const origin: string | undefined = body.origin;
  const destination: string | undefined = body.destination;
  const freightLabel =
    origin && destination
      ? `Embarque ${origin.toUpperCase()} → ${destination.toUpperCase()}`
      : "Frete";
  const service = Number(body.service_value ?? 0);
  if (service > 0 || (!body.pickup_value && !body.delivery_value && !body.extra)) {
    items.push({ label: freightLabel, value: service });
  }
  if (Number(body.pickup_value) > 0) items.push({ label: "Coleta", value: Number(body.pickup_value) });
  if (Number(body.delivery_value) > 0) items.push({ label: "Entrega", value: Number(body.delivery_value) });
  if (Number(body.extra) > 0) items.push({ label: "Adicionais", value: Number(body.extra) });
  return items;
}

/** Build the "Veículo" line(s) for the header block. */
function buildVehicleLines(doc: DocumentViewData): string[] {
  const body = doc.body ?? {};
  if (Array.isArray(body.vehicles) && body.vehicles.length > 0) {
    return body.vehicles.map((v: any) => {
      const type = v.type ? vehicleTypeLabel[v.type] ?? v.type : "";
      const parts = [v.description || v.model || v.brand, v.plate, v.chassis, type, v.color].filter(Boolean);
      return parts.join(" · ") || "—";
    });
  }
  if (body.vehicle || body.vehicle_plate) {
    const parts = [body.vehicle, body.vehicle_plate, body.vehicle_chassis, body.vehicle_color].filter(Boolean);
    return [parts.join(" · ") || "—"];
  }
  return [];
}

export function DocumentView({ doc, company }: Props) {
  const isContract = doc.doc_type === "contract";
  const body = doc.body ?? {};
  const items = buildLineItems(doc);
  const vehicleLines = buildVehicleLines(doc);
  const total = Number(doc.total_amount ?? 0);

  // Minimum 12 rows in the items table to match the printed model layout.
  const MIN_ROWS = 12;
  const emptyRowCount = Math.max(0, MIN_ROWS - items.length);

  const logoSrc = company?.logo_url || fallbackLogo;
  const validityLabel = isContract ? "Contrato" : "Orçamento válido por 7 dias";
  const titleLabel = isContract ? "CONTRATO" : "ORÇAMENTO";

  return (
    <div className="bg-white text-black">
      {/* Header: solid orange with blue wave on the right and centered logo */}
      <div
        className="relative w-full overflow-hidden"
        style={{ backgroundColor: "var(--brand-orange)", height: "180px" }}
      >
        {/* Decorative waves */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1600 400"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M1600,140 C1350,300 1150,120 950,240 C820,320 720,380 600,400 L1600,400 Z"
            fill="var(--brand-blue)"
          />
          <path
            d="M1600,240 C1400,360 1250,260 1100,340 C980,395 900,400 820,400 L1600,400 Z"
            fill="var(--brand-orange-soft)"
          />
        </svg>
        {/* Logo centered */}
        <div className="relative z-10 flex h-full items-center justify-center">
          <img
            src={logoSrc}
            alt={company?.name || "TransBH"}
            className="h-[130px] w-auto max-w-[70%] object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)]"
          />
        </div>
      </div>

      {/* Body */}
      <div className="px-10 py-8">
        {/* Title + date */}
        <div className="flex items-end justify-between gap-6 mb-8">
          <h1 className="font-display text-5xl font-bold tracking-tight text-black leading-none">
            {titleLabel}
          </h1>
          <div className="flex items-baseline gap-3 pb-1">
            <span className="text-lg font-bold text-black">DATA:</span>
            <span className="text-base text-black min-w-[130px] border-b border-black/60 pb-0.5 text-center">
              {dateBR(doc.created_at)}
            </span>
          </div>
        </div>

        {/* Client fields with underline */}
        <div className="space-y-3 mb-8 text-[15px]">
          <UnderlineField label="Cliente" value={doc.client_name} />
          {vehicleLines.length > 0 && (
            <UnderlineField
              label="Veículo"
              value={vehicleLines[0]}
              extra={vehicleLines.slice(1)}
            />
          )}
          <UnderlineField label="Origem" value={body.origin ?? ""} italic />
          <UnderlineField label="Destino" value={body.destination ?? ""} italic />
          {body.delivery_deadline && (
            <UnderlineField label="Prazo estimado" value={String(body.delivery_deadline)} italic />
          )}

          {doc.client_phone && <UnderlineField label="Telefone" value={doc.client_phone} italic />}
          {doc.client_email && <UnderlineField label="E-mail" value={doc.client_email} italic />}
          {doc.client_document && <UnderlineField label="CPF/CNPJ" value={doc.client_document} />}
        </div>

        {/* Items table */}
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr>
              <th className="border border-black/60 py-2 px-3 text-center font-bold text-black w-[70%]">
                DESCRIÇÃO
              </th>
              <th className="border border-black/60 py-2 px-3 text-center font-bold text-black">
                VALOR
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td
                  className="border border-black/60 py-2 px-3 text-center text-black"
                  dangerouslySetInnerHTML={{ __html: emphasizeItem(it.label) }}
                />
                <td className="border border-black/60 py-2 px-3 text-center text-black">
                  {brl(it.value)}
                </td>
              </tr>
            ))}
            {Array.from({ length: emptyRowCount }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black/60 py-2 px-3">&nbsp;</td>
                <td className="border border-black/60 py-2 px-3">&nbsp;</td>
              </tr>
            ))}
            <tr>
              <td className="border border-black/60 py-2 px-3 text-[12px] font-bold text-black">
                {validityLabel}
              </td>
              <td className="border border-black/60 py-2 px-3 text-black">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="italic font-bold">Total:</span>
                  <span className="font-semibold">{brl(total)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Contract-specific: clauses + signatures */}
        {isContract && body.notes && (
          <div className="mt-8">
            <div className="text-sm uppercase tracking-[0.1em] font-bold text-black mb-3">
              Cláusulas
            </div>
            <div className="text-sm text-black whitespace-pre-line leading-relaxed">
              {body.notes}
            </div>
          </div>
        )}
        {isContract && (
          <div className="mt-12 grid grid-cols-2 gap-10">
            <div className="text-center">
              {doc.client_signature_url && (
                <img
                  src={doc.client_signature_url}
                  alt={`Assinatura de ${doc.client_name}`}
                  className="h-16 mx-auto object-contain"
                />
              )}
              <div className="border-t border-black/60 pt-2 text-sm font-medium text-black">
                {doc.client_name}
                <div className="text-xs uppercase tracking-wider mt-0.5 text-black/60">Contratante</div>
                {doc.signed_at && (
                  <div className="text-[11px] mt-1 text-black/60">
                    Assinado eletronicamente em {dateBR(doc.signed_at)}
                  </div>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black/60 pt-2 text-sm font-medium text-black">
                {company?.name || "TransBH"}
                <div className="text-xs uppercase tracking-wider mt-0.5 text-black/60">Contratada</div>
              </div>
            </div>
          </div>
        )}

        {!isContract && body.notes && (
          <div className="mt-6 text-[13px] text-black/80 whitespace-pre-line leading-relaxed">
            {body.notes}
          </div>
        )}

        {/* Company footer */}
        <div className="mt-10 pt-4 text-center text-[13px] text-black leading-relaxed">
          <div>
            {[company?.phone, company?.email].filter(Boolean).join(" | ") ||
              "(61) 98275-5951 | Transbh2018@hotmail.com"}
          </div>
          {company?.address && <div>{company.address}</div>}
          {company?.cnpj && <div>Cnpj: {company.cnpj}</div>}
        </div>
      </div>
    </div>
  );
}

function UnderlineField({
  label,
  value,
  italic,
  extra,
}: {
  label: string;
  value: string;
  italic?: boolean;
  extra?: string[];
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-bold text-black min-w-[95px]">{label}:</span>
        <span
          className={`flex-1 border-b border-black/70 pb-0.5 text-black ${
            italic ? "italic" : ""
          }`}
        >
          {value || "\u00A0"}
        </span>
      </div>
      {extra?.map((line, i) => (
        <div key={i} className="flex items-baseline gap-3 mt-1">
          <span className="min-w-[95px]" />
          <span className="flex-1 border-b border-black/70 pb-0.5 text-black">{line}</span>
        </div>
      ))}
    </div>
  );
}

/** Bolds the origin/destination city names inside the "Embarque ... → ..." label. */
function emphasizeItem(label: string): string {
  const m = label.match(/^(Embarque )(.+?)( → )(.+)$/);
  if (!m) return escapeHtml(label);
  return `${escapeHtml(m[1])}<b>${escapeHtml(m[2])}</b>${escapeHtml(m[3])}<b>${escapeHtml(m[4])}</b>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}
