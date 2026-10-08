import {
  FUEL_STEPS, PART_STATE_LABEL, TIRE_SLOTS, VISTORIA_DOCUMENTS, VISTORIA_PARTS, VISTORIA_PHOTOS,
  type VistoriaData, type VistoriaTransportInfo,
} from "@/lib/vistoria-types";

const yesNo = (v: boolean | null) => (v === null ? "—" : v ? "Sim" : "Não");

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm border-b border-border/60 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="rounded-lg border border-border bg-card px-3 py-1">{children}</div>
    </section>
  );
}

function Thumb({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img src={url} alt={label} loading="lazy" className="aspect-square w-full rounded-md object-cover border border-border" />
      <span className="block text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</span>
    </a>
  );
}

export function VistoriaReport({ data, transport }: { data: VistoriaData; transport: VistoriaTransportInfo }) {
  const g = data.general;
  const vehicle = [transport.vehicle_brand, transport.vehicle_model].filter(Boolean).join(" ");
  return (
    <div className="space-y-4">
      <Section title="Veículo">
        <Row label="Placa" value={transport.vehicle_plate} />
        <Row label="Veículo" value={vehicle} />
        <Row label="Cor" value={transport.vehicle_color ?? ""} />
        <Row label="Cliente" value={transport.client_name} />
      </Section>

      <Section title="Motorista">
        <Row label="Nome" value={data.driver.name} />
        <Row label="CPF" value={data.driver.cpf} />
        <Row label="Placa do guincho" value={data.driver.tow_plate.toUpperCase()} />
      </Section>

      <Section title="Geral">
        <Row label="Acesso ao interior" value={yesNo(g.interior_access)} />
        <Row label="Veículo funcionando" value={yesNo(g.vehicle_working)} />
        <Row label="CRLV apresentado" value={yesNo(g.crlv_present)} />
        <Row label="KM" value={g.km} />
        <Row label="Combustível" value={FUEL_STEPS[g.fuel] ?? "—"} />
        <Row label="Observação inicial" value={g.notes} />
        {TIRE_SLOTS.filter((t) => g.tires[t.key]?.state || g.tires[t.key]?.brand).map((t) => (
          <Row
            key={t.key}
            label={`Pneu ${t.label.toLowerCase()}`}
            value={[g.tires[t.key]?.state, g.tires[t.key]?.brand].filter(Boolean).join(" · ")}
          />
        ))}
      </Section>

      <Section title="Questionário">
        {VISTORIA_PARTS.map((p) => (
          <Row key={p.key} label={p.label} value={data.checks[p.key] ? PART_STATE_LABEL[data.checks[p.key]] : ""} />
        ))}
      </Section>

      <section className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fotos</h3>
        <div className="grid grid-cols-3 gap-2">
          {VISTORIA_PHOTOS.filter((p) => data.photos[p.key]).map((p) => (
            <Thumb key={p.key} url={data.photos[p.key]} label={p.label} />
          ))}
          {data.extra_photos.map((url, i) => (
            <Thumb key={url} url={url} label={`Avaria extra ${i + 1}`} />
          ))}
        </div>
      </section>

      {VISTORIA_DOCUMENTS.some((d) => data.documents[d.key]) && (
        <section className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documentos</h3>
          <div className="grid grid-cols-3 gap-2">
            {VISTORIA_DOCUMENTS.filter((d) => data.documents[d.key]).map((d) => (
              <Thumb key={d.key} url={data.documents[d.key]} label={d.label} />
            ))}
          </div>
        </section>
      )}

      <Section title="Cliente">
        <Row label="Nome" value={data.client.name} />
        <Row label="CPF" value={data.client.cpf} />
        <Row label="E-mail" value={data.client.email} />
        {data.client.signature_url && (
          <div className="py-2">
            <span className="text-sm text-muted-foreground">Assinatura</span>
            <img
              src={data.client.signature_url}
              alt="Assinatura do cliente"
              className="h-20 mt-1 bg-white rounded border border-border object-contain"
            />
          </div>
        )}
      </Section>
    </div>
  );
}
