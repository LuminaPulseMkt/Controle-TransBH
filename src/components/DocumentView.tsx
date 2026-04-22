import { brl, dateBR } from "@/lib/format";
import { FileText } from "lucide-react";

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
}

interface CompanyInfo {
  name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  cnpj?: string | null;
}

interface Props {
  doc: DocumentViewData;
  company?: CompanyInfo | null;
  showFooter?: boolean;
}

export function DocumentView({ doc, company, showFooter = false }: Props) {
  const isContract = doc.doc_type === "contract";
  const body = doc.body ?? {};

  return (
    <div className="bg-background">
      {/* Cabeçalho estilo papel */}
      <div className="bg-[#0d1b2a] text-white px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-primary/20 text-primary flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold tracking-tight text-primary">
              {company?.name || "TransBH"}
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/80">
              Transporte de Veículos
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.18em] text-white/80">
            {isContract ? "Contrato" : "Orçamento"}
          </div>
          <div className="text-base font-medium text-white/95 mt-0.5">{dateBR(doc.created_at)}</div>
        </div>
      </div>

      {/* Corpo */}
      <div className="px-6 py-6 space-y-6">
        <div>
          <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight text-foreground">{doc.title}</h2>
          <div className="text-sm text-foreground/70 mt-1">
            ID: {doc.id.slice(0, 8).toUpperCase()}
          </div>
        </div>

        <Section title="Cliente">
          <Field label="Nome" value={doc.client_name} />
          {doc.client_document && <Field label="CPF/CNPJ" value={doc.client_document} />}
          {doc.client_phone && <Field label="Telefone" value={doc.client_phone} />}
          {doc.client_email && <Field label="E-mail" value={doc.client_email} />}
        </Section>

        {(body.vehicle || body.origin || body.destination) && (
          <Section title="Detalhes do Serviço">
            {body.vehicle && <Field label="Veículo" value={body.vehicle} />}
            {body.origin && <Field label="Origem" value={body.origin} />}
            {body.destination && <Field label="Destino" value={body.destination} />}
          </Section>
        )}

        <Section title="Valores">
          <Field label="Frete" value={brl(body.service_value ?? 0)} />
          {body.insurance ? <Field label="Seguro" value={brl(body.insurance)} /> : null}
          {body.extra ? <Field label="Adicionais" value={brl(body.extra)} /> : null}
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-base font-semibold">Total</span>
            <span className="text-2xl font-bold text-primary">{brl(doc.total_amount ?? 0)}</span>
          </div>
        </Section>

        {body.notes && (
          <Section title={isContract ? "Cláusulas" : "Observações"}>
            <div className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
              {body.notes}
            </div>
          </Section>
        )}

        {isContract && (
          <div className="pt-8 grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-t border-foreground/40 pt-2 text-sm font-medium text-foreground">
                {doc.client_name}
                <div className="text-xs uppercase tracking-wider mt-0.5 text-muted-foreground">Contratante</div>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-foreground/40 pt-2 text-sm font-medium text-foreground">
                {company?.name || "TransBH"}
                <div className="text-xs uppercase tracking-wider mt-0.5 text-muted-foreground">Contratada</div>
              </div>
            </div>
          </div>
        )}

        {showFooter && company && (
          <div className="pt-6 mt-6 border-t border-border text-sm text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground/80">{company.name || "TransBH"}</div>
            {company.cnpj && <div>CNPJ: {company.cnpj}</div>}
            {company.address && <div>{company.address}</div>}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {company.phone && <span>Tel: {company.phone}</span>}
              {company.whatsapp && <span>WhatsApp: {company.whatsapp}</span>}
              {company.email && <span>{company.email}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-sm uppercase tracking-[0.1em] text-primary mb-3 font-bold">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-base">
      <span className="text-foreground/70 min-w-[110px]">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
