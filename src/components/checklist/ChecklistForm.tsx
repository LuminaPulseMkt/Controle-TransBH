import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "./SignaturePad";
import fallbackLogo from "@/assets/logo-transbh.png";
import {
  CHECKLIST_ITEMS,
  type ChecklistData,
  type FuelLevel,
  type ItemStatus,
  type PartySection,
  type TireCondition,
} from "@/lib/checklist-types";

const FUEL_LEVELS: FuelLevel[] = ["0", "1/4", "1/2", "3/4", "cheio"];
const TIRE_CONDITIONS: { value: TireCondition; label: string }[] = [
  { value: "bom", label: "Bom" },
  { value: "medio", label: "Médio" },
  { value: "ruim", label: "Ruim" },
  { value: "furado", label: "Furado" },
];

interface Props {
  data: ChecklistData;
  onChange: (d: ChecklistData) => void;
  checklistId: string;
  company?: { name?: string | null; logo_url?: string | null } | null;
}

// Plain inputs — sem bordas arredondadas, para parecer um documento.
const docInput =
  "w-full bg-transparent border-0 border-b border-neutral-400 rounded-none px-1 py-0.5 h-8 text-sm text-black placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:border-black";

export function ChecklistForm({ data, onChange, checklistId, company }: Props) {
  const update = (patch: Partial<ChecklistData>) => onChange({ ...data, ...patch });
  const updateItem = (key: string, status: ItemStatus) =>
    update({ items: { ...data.items, [key]: status } });
  const updateTire = (idx: number, patch: Partial<ChecklistData["tires"][number]>) => {
    const tires = data.tires.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    update({ tires });
  };
  const updateParty = (key: "pickup" | "delivery", patch: Partial<PartySection>) =>
    update({ [key]: { ...data[key], ...patch } } as Partial<ChecklistData>);

  return (
    <div className="bg-white text-black border border-neutral-400 shadow-sm max-w-5xl mx-auto print:shadow-none print:border-0">
      {/* Cabeçalho */}
      <header className="flex items-center gap-4 border-b border-neutral-400 p-4">
        <img
          src={company?.logo_url || fallbackLogo}
          alt="Logo"
          onError={(e) => {
            if (e.currentTarget.src !== fallbackLogo) e.currentTarget.src = fallbackLogo;
          }}
          className="h-14 w-auto object-contain"
        />
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold tracking-wide uppercase">Check List de Veículo</h1>
          {company?.name && <p className="text-xs text-neutral-600">{company.name}</p>}
        </div>
        <div className="w-14" />
      </header>

      {/* Dados do veículo */}
      <section className="border-b border-neutral-400 p-4 space-y-3">
        <Field label="Cliente">
          <Input className={docInput} value={data.client_name} onChange={(e) => update({ client_name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Placa"><Input className={docInput} value={data.plate} onChange={(e) => update({ plate: e.target.value.toUpperCase() })} /></Field>
          <Field label="Modelo"><Input className={docInput} value={data.model} onChange={(e) => update({ model: e.target.value })} /></Field>
          <Field label="DUT"><Input className={docInput} value={data.dut} onChange={(e) => update({ dut: e.target.value })} /></Field>
          <Field label="Chassi"><Input className={docInput} value={data.chassis} onChange={(e) => update({ chassis: e.target.value.toUpperCase() })} /></Field>
          <Field label="Cor"><Input className={docInput} value={data.color} onChange={(e) => update({ color: e.target.value })} /></Field>
          <Field label="KM"><Input className={docInput} value={data.km} onChange={(e) => update({ km: e.target.value })} /></Field>
          <Field label="Local"><Input className={docInput} value={data.location} onChange={(e) => update({ location: e.target.value })} /></Field>
          <Field label="Data"><Input type="date" className={docInput} value={data.checklist_date} onChange={(e) => update({ checklist_date: e.target.value })} /></Field>
          <Field label="Hora"><Input type="time" className={docInput} value={data.checklist_time} onChange={(e) => update({ checklist_time: e.target.value })} /></Field>
        </div>
      </section>

      {/* Interior + Combustível/Pneus */}
      <section className="grid grid-cols-1 md:grid-cols-2 border-b border-neutral-400">
        <div className="p-4 md:border-r border-neutral-400">
          <SectionTitle>Interior do veículo</SectionTitle>
          <ul className="divide-y divide-neutral-300 border border-neutral-300">
            {CHECKLIST_ITEMS.map((item) => (
              <li key={item} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="text-xs uppercase tracking-wide">{item}</span>
                <div className="flex gap-1">
                  <Button
                    type="button" size="sm"
                    className="h-7 px-2 text-xs rounded-none"
                    variant={data.items[item] === "ok" ? "default" : "outline"}
                    onClick={() => updateItem(item, data.items[item] === "ok" ? null : "ok")}
                  >OK</Button>
                  <Button
                    type="button" size="sm"
                    className="h-7 px-2 text-xs rounded-none"
                    variant={data.items[item] === "nok" ? "destructive" : "outline"}
                    onClick={() => updateItem(item, data.items[item] === "nok" ? null : "nok")}
                  >Não OK</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <SectionTitle>Combustível</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {FUEL_LEVELS.map((lvl) => (
                <Button
                  key={lvl} type="button"
                  className="rounded-none h-8"
                  variant={data.fuel_level === lvl ? "default" : "outline"}
                  onClick={() => update({ fuel_level: data.fuel_level === lvl ? null : lvl })}
                >{lvl === "cheio" ? "Cheio" : lvl}</Button>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle>Pneus</SectionTitle>
            <div className="overflow-x-auto border border-neutral-300">
              <table className="w-full text-xs">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="text-left p-2 border-b border-neutral-300">Posição</th>
                    <th className="text-left p-2 border-b border-neutral-300">Medida</th>
                    <th className="text-left p-2 border-b border-neutral-300">Marca</th>
                    <th className="text-left p-2 border-b border-neutral-300">Condição</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tires.map((t, idx) => (
                    <tr key={t.position} className="border-b border-neutral-200 last:border-0">
                      <td className="p-2 font-medium whitespace-nowrap">{t.position}</td>
                      <td className="p-2"><Input className={docInput} value={t.size} placeholder="/ / R" onChange={(e) => updateTire(idx, { size: e.target.value })} /></td>
                      <td className="p-2"><Input className={docInput} value={t.brand} onChange={(e) => updateTire(idx, { brand: e.target.value })} /></td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {TIRE_CONDITIONS.map((c) => (
                            <Button
                              key={c.value} type="button" size="sm"
                              className="h-6 px-2 text-[11px] rounded-none"
                              variant={t.condition === c.value ? "default" : "outline"}
                              onClick={() => updateTire(idx, { condition: t.condition === c.value ? null : c.value })}
                            >{c.label}</Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Observações */}
      <section className="border-b border-neutral-400 p-4">
        <SectionTitle>Observações</SectionTitle>
        <Textarea
          rows={4}
          className="rounded-none border-neutral-300 bg-transparent text-black focus-visible:ring-0"
          value={data.observations}
          onChange={(e) => update({ observations: e.target.value })}
        />
      </section>

      {/* Coleta + Entrega */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-4 md:border-r border-neutral-400">
          <SectionTitle>Coleta</SectionTitle>
          <PartyFields
            section={data.pickup}
            onChange={(patch) => updateParty("pickup", patch)}
            checklistId={checklistId}
            fieldPrefix="pickup"
          />
        </div>
        <div className="p-4 border-t md:border-t-0 border-neutral-400">
          <SectionTitle>Entrega</SectionTitle>
          <PartyFields
            section={data.delivery}
            onChange={(patch) => updateParty("delivery", patch)}
            checklistId={checklistId}
            fieldPrefix="delivery"
          />
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-wider mb-2 border-b border-neutral-400 pb-1">
      {children}
    </h2>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-600">{label}</div>
      {children}
    </div>
  );
}

function PartyFields({
  section, onChange, checklistId, fieldPrefix,
}: {
  section: PartySection;
  onChange: (patch: Partial<PartySection>) => void;
  checklistId: string;
  fieldPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome do motorista"><Input className={docInput} value={section.driver_name} onChange={(e) => onChange({ driver_name: e.target.value })} /></Field>
        <Field label="RG"><Input className={docInput} value={section.driver_rg} onChange={(e) => onChange({ driver_rg: e.target.value })} /></Field>
        <Field label="Cidade"><Input className={docInput} value={section.city} onChange={(e) => onChange({ city: e.target.value })} /></Field>
        <Field label="UF"><Input className={docInput} value={section.state} onChange={(e) => onChange({ state: e.target.value.toUpperCase().slice(0, 2) })} /></Field>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id={`${fieldPrefix}-agree`} checked={section.agreed} onCheckedChange={(v) => onChange({ agreed: !!v })} />
        <label htmlFor={`${fieldPrefix}-agree`} className="text-xs leading-snug">
          Declaro estar de acordo com as informações deste documento.
        </label>
      </div>
      <SignaturePad
        label="Assinatura do motorista"
        value={section.signature_url}
        onChange={(url) => onChange({ signature_url: url })}
        checklistId={checklistId}
        field={`${fieldPrefix}-driver`}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome do responsável"><Input className={docInput} value={section.responsible_name} onChange={(e) => onChange({ responsible_name: e.target.value })} /></Field>
        <Field label="RG"><Input className={docInput} value={section.responsible_rg} onChange={(e) => onChange({ responsible_rg: e.target.value })} /></Field>
      </div>
      <SignaturePad
        label="Assinatura do responsável"
        value={section.responsible_signature_url}
        onChange={(url) => onChange({ responsible_signature_url: url })}
        checklistId={checklistId}
        field={`${fieldPrefix}-responsible`}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data"><Input type="date" className={docInput} value={section.date} onChange={(e) => onChange({ date: e.target.value })} /></Field>
        <Field label="Hora"><Input type="time" className={docInput} value={section.time} onChange={(e) => onChange({ time: e.target.value })} /></Field>
      </div>
    </div>
  );
}
